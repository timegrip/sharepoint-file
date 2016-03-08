#!/usr/bin/env node
'use strict';

const
  fs   = require( 'fs'   ),
  url  = require( 'url'  ),
  path = require( 'path' ),

  get_cookie_path = ( opts ) => {
    opts = opts || {};
    let cookie_dir = path.join(
      process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH,
      '.sharepoint-file'
    );
    ! fs.existsSync( cookie_dir ) && fs.mkdirSync( cookie_dir );
    return opts.only_dir ? cookie_dir : path.join( cookie_dir, 'cookies.json' );
  };

let command = process.argv[ 2 ];
command = command ? command.trim().toLowerCase() : '';
if ( command.length && [
  'cleanup', 'login', 'logout', 'fetch'
].indexOf( command ) === -1 ) {
  console.log( 'Command not found.' );
  process.exit( 1 );
}

if ( command === 'cleanup' ) {
  require( 'child_process' ).execSync(
    `${process.platform.startsWith( 'win' ) ? 'rmdir /s/q' : 'rm -rf' } ${get_cookie_path({ only_dir : true })}`
  );
  return;
}

if ( command === 'logout' ) {
  try {
    fs.unlinkSync( get_cookie_path() );
    console.log( 'Logged out.' );
  }
  catch ( e ) {}
  return;
}

const
  parser          = require( 'xml2js'                 ),
  concat          = require( 'concat-stream'          ),
  request         = require( 'request'                ),
  inquirer        = require( 'inquirer'               ),
  Sharepoint      = require( 'sharepoint-auth'        ),
  istextorbinary  = require( 'istextorbinary'         ),
  FileCookieStore = require( 'tough-cookie-filestore' );

function login ( host_url ) {
  return new Promise( ( resolve, reject ) => {
    let jar = get_cookie_jar();
    if ( jar ) {
      resolve( jar );
      return;
    }

    query_credentials().then( credentials => {
      Sharepoint({ auth : credentials, host : host_url }, ( err, result ) => {
        if ( err ) {
          return reject( 'Login failed.' );
        }
        resolve( create_cookie_jar(
          host_url, result.cookies.FedAuth, result.cookies.rtFa
        ));
      });
    });
  });
}

function query_credentials () {
  return new Promise( resolve => {
    console.log( 'Please enter your Sharepoint credentials' );
    inquirer.prompt([
      { message : 'Email address :', name : 'username', type : 'input'    },
      { message : 'Password      :', name : 'password', type : 'password' }
    ], credentials => resolve( credentials ) );
  });
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

let
  parsed      = process.argv[ 3 ] ? url.parse( process.argv[ 3 ] ) : '',
  host_url    = `${parsed.protocol}//${parsed.host}`,
  output_path = process.argv[ 4 ] ? process.argv[ 4 ] : '';

if ( command === 'login' ) {
  login( host_url ).then( () => console.log( 'Logged in.' ) ).catch(
    e => console.log( e )
  );
  return;
}

if ( command === 'fetch' ) {
  login( host_url ).then( jar => {
    console.log( `Fetching...` );
    request({
      url : `${host_url}/_api/web/GetFileByServerRelativeUrl('${parsed.path}')/$value`,
      jar : jar
    }).on( 'error', err => console.log( err ) ).on( 'response', response => {
      if ( response.statusCode !== 200 ) {
        parse_request_error( response ).then( msg => console.log( msg ) );
        return;
      }
      if ( output_path.length ) {
        response.pipe(
          fs.createWriteStream( output_path )
        );
        response.on( 'end', () => console.log( `Saved to ${output_path}` ) );
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
  }).catch( e => console.log( e ) );

  return;
}
