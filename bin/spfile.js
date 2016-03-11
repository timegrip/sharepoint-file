#!/usr/bin/env node --harmony

'use strict';

const
  os   = require( 'os'   ),
  fs   = require( 'fs'   ),
  url  = require( 'url'  ),
  path = require( 'path' );

if (
  process.argv.slice( 2 ).map( arg => arg.toLowerCase() ).indexOf( 'logout' ) !== -1
    && process.argv.slice( 2 ).map( arg => arg.toLowerCase() ).indexOf( '--help' ) === -1
) {
  require( 'child_process' ).execSync(
    `${process.platform.startsWith( 'win' ) ? 'rmdir /s/q' : 'rm -rf' } ${get_cookie_path({ dir : true })}`
  );
  console.log( 'Logged out.' );
  return;
}

const
  read            = require( 'read'                   ),
  colors          = require( 'colors'                 ),
  parser          = require( 'xml2js'                 ),
  concat          = require( 'concat-stream'          ),
  parseArgs       = require( 'minimist'               ),
  request         = require( 'request'                ),
  Sharepoint      = require( 'sharepoint-auth'        ),
  istextorbinary  = require( 'istextorbinary'         ),
  FileCookieStore = require( 'tough-cookie-filestore' );

const cmd = parse( process.argv.slice( 2 ) );
if ( ! cmd ) {
  return;
}

if ( cmd.name === 'login' ) {
  login( extract( cmd.args, 'host_url' ) )
    .then( result =>
      ! cmd.silent && console.log( result.existing ? 'Already logged in.' : 'Logged in.' )
    ).catch( e => console.error( e ) );
  return;
}

if ( cmd.name === 'fetch' ) {
  login( extract( cmd.args, 'host_url' ) ).then( result => {
    cmd.args[ 1 ] && ! cmd.silent && console.log( `Fetching file...` );
    request({
      url : `${extract( cmd.args, 'host_url' )}/_api/web/GetFileByServerRelativeUrl('${extract( cmd.args, 'relative_url' )}')/$value`,
      jar : result.jar
    })
    .on( 'error', err => console.error( `${err.host} ${err.code}`.red.bold ) )
    .on( 'response', response => {
      if ( response.statusCode !== 200 ) {
        parse_request_error( response ).then( msg => {
          console.error( msg.red.bold );
          process.exit( 1 );
        });
        return;
      }
      if ( cmd.args[ 1 ] ) {
        response.pipe(
          fs.createWriteStream( cmd.args[ 1 ] ).on( 'finish', () =>
            ! cmd.silent && console.log(
              `Saved to ${cmd.args[ 1 ]} (${fs.statSync( cmd.args[ 1 ] ).size} B).`
            )
          )
        );
        return;
      }
      response.pipe( concat( buffer => {
        istextorbinary.isText( undefined, buffer, ( err, is_text ) =>
          console.log( err || is_text
            ? buffer.toString()
            : 'Not going to show a binary file. Run the command to save it as a file.'
          )
        );
      }));
    });
  }).catch( e => console.error( e ) );

  return;
}

function login ( host_url ) {
  return new Promise( ( resolve, reject ) => {
    let jar = get_cookie_jar();
    if ( jar ) {
      return resolve({ jar : jar, existing : true });
    }

    query_credentials().then( credentials => {
      Sharepoint({ auth : credentials, host : host_url }, ( err, result ) => {
        if ( err ) {
          return reject(
            `Login failed.${os.EOL}Check your host URL and login credentials, then try again.`
          );
        }
        resolve({
          jar : create_cookie_jar(
            host_url, result.cookies.FedAuth, result.cookies.rtFa
          )
        });
      });
    });
  });
}

function query_credentials () {
  console.log( 'Please enter your Sharepoint credentials'.gray );
  let query = ( read_opts ) =>
    new Promise( ( resolve, reject ) =>
      read( read_opts, ( err, result ) => err ? reject() : resolve( result ) )
    );
  return query({
    prompt  : 'Email address :'.cyan.bold
  })
  .then( username => query({
    prompt  : 'Password      :'.cyan.bold,
    silent  : true,
    replace : '*'
  })
  .then( password => ({ username : username, password : password })))
  .catch( () => process.exit( 1 ) );
}

function get_cookie_jar ( opts ) {
  opts = opts || {};
  opts.new && fs.openSync( get_cookie_path(), 'w' );
  try {
    return request.jar( new FileCookieStore( get_cookie_path() ) );
  }
  catch ( e ) {
    return undefined;
  }
}

function create_cookie_jar ( url, fed_auth, rt_fa ) {
  let jar = get_cookie_jar({new : true});
  jar.setCookie( request.cookie( `FedAuth=${fed_auth}` ), url );
  jar.setCookie( request.cookie( `rtFa=${rt_fa}`       ), url );
  return jar;
}

function parse_request_error ( response ) {
  let default_msg = 'Could not download file.';
  return new Promise( resolve => {
    if ( ! response.headers[ 'content-type' ].includes( 'application/xml' ) ) {
      return resolve( default_msg );
    }
    response.pipe( concat( buffer => {
      parser.parseString(
        buffer.toString(), { explicitArray : false }, ( err, result ) =>
          resolve( err ? default_msg : result[ 'm:error' ][ 'm:message' ]._ )
      );
    }));
  });
}

function get_cookie_path ( opts ) {
  opts = opts || {};
  let cookie_dir = path.join(
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH,
    '.sharepoint-file'
  );
  ! fs.existsSync( cookie_dir ) && fs.mkdirSync( cookie_dir );
  return opts.dir ? cookie_dir : path.join( cookie_dir, 'cookies.json' );
}

function parse ( args ) {
  let
    opts = {
      'string'  : [ 'fetch', 'login', 'logout' ],
      'boolean' : [ 'silent', 'help', 'version' ],
      'default' : {
        'silent'  : false,
        'help'    : false,
        'version' : false
      }
    },
    parsed = parseArgs( args, opts );
  return validate({
    name    : parsed._[ 0 ],
    args    : parsed._.slice( 1 ),
    silent  : parsed.silent,
    help    : parsed.help,
    version : parsed.version
  });

  function validate ( cmd ) {
    if ( ! cmd.name ) {
      if ( cmd.help    ) return show_info( cmd.silent );
      if ( cmd.version ) return show_info( cmd.silent, { version : true } );
      return show_info( cmd.silent, { minimal : true } );
    }

    if ( opts[ 'string' ].indexOf( cmd.name ) === -1 ) {
      return show_info( cmd.silent, { invalid : true, minimal : true } );
    }

    if ( cmd.help ) {
      return show_info( cmd.silent, { cmd : cmd.name } );
    }

    if ( cmd.name === 'login' ) {
      if ( ! cmd.args.length ) {
        return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
      }
      if ( ! extract( cmd.args, 'host_url' ) ) {
        return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
      }
    }

    if ( cmd.name === 'fetch' ) {
      if ( ! cmd.args.length ) {
        return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
      }
      if ( ! extract( cmd.args, 'host_url' ) ) {
        return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
      }
    }

    return cmd;
  }
}

function extract ( args, name ) {
  if ( name === 'host_url' ) {
    let parsed = url.parse( args[ 0 ] );
    if ( ! parsed.host && ( ! parsed.path || parsed.path === '/' ) ) {
      return;
    }
    return [
      `${ parsed.protocol ? parsed.protocol : 'https:' }`,
      `//`,
      `${ parsed.host ? parsed.host : parsed.path.split( '/' )[ 0 ] }`
    ].join( '' );
  }

  if ( name === 'relative_url' ) {
    let parsed = url.parse( args[ 0 ] );
    return parsed.path.substr( parsed.path.indexOf( '/' ) );
  }
}

function show_info ( silent, opts ) {
  opts = opts || {};
  const
    lines = ( lines ) => lines.map( line => line + os.EOL ).join( '' ),
    version = `${require( '../package.json' ).name } ver. ${require( '../package.json' ).version.bold }`,
    header = [
      `A command-line utility for Sharepoint file operations`,
      ``,
      `Usage: spfile task args`,
      ``,
      `=======================`,
      ``,
      `${'Available tasks:'.bold} (use --help for more info)`
    ],
    info = {
      fetch : {
        minimal : show_args =>
          `   ${'fetch '.green.bold + (show_args ? '<FILEURL> [FILEPATH] '.green.bold + '...' : ' ....')}`
            + ` Fetches a file and shows its content or saves it`.bold,
        full : [
          `                                  <FILEURL>  The full Sharpoint URL to the file`,
          `                                  [FILEPATH] File name or file path to save to`,
          ``,
          `                                  If you haven't already authenticated or your session has expired,`,
          `                                  you'll be asked to log in`,
          ``,
          `                                  Example: spfile fetch https://your.sharepoint.com/path/foo.json`,
          `                                  Example: spfile fetch https://your.sharepoint.com/path/bar.pdf bar.pdf`
        ]
      },
      login : {
        minimal : show_args =>
          `   ${'login '.green.bold + (show_args ? '<HOSTURL> '.green.bold + '..............' : ' ....')}`
            + ` Authenticates with Sharepoint explicitly`.bold,
        full : [
          `                                  <HOSTURL> The Sharpoint host URL`,
          ``,
          `                                  Example: spfile login https://your.sharepoint.com`
        ]
      },
      logout : {
        minimal : show_args =>
          `   ${'logout '.green.bold + (show_args ? '.......................' : ' ...')}`
            + ` Invalidates your Sharepoint session explicitly`.bold,
        full : [
        ]
      }
    };

  if ( silent ) return;
  if ( opts.version ) {
    console.log( version );
    return;
  }
  if ( opts.invalid ) {
    console.log( `${'Invalid command or parameters'.red.bold}${os.EOL}` );
  }
  if ( opts.cmd ) {
    console.log(
      lines( [ info[ opts.cmd ].minimal(true) ].concat( info[ opts.cmd ].full ) )
    );
    return;
  }

  console.log( lines( [ version ].concat( header ) ) );
  Object.keys( info ).map( c => {
    if ( opts.minimal ) {
      console.log( lines([ info[ c ].minimal() ]) )
    }
    else {
      console.log( lines([ info[ c ].minimal(true) ].concat( info[ c ].full ) ) )
    }
  });
}
