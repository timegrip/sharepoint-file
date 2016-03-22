'use strict';

const
  os  = require( 'os'  ),
  url = require( 'url' ),

  pkg = require( '../../package.json' ),

  _argv = Symbol( 'argv' );

let colors, parseArgs;
try {
  colors    = require( 'colors'   );
  parseArgs = require( 'minimist' );
}
catch ( err ) {}

module.exports = class Parser {
  constructor ( argv ) {
    this[ _argv ] = argv.slice( 2 );
  }

  parse () {
    return parse( this[ _argv ] );
  }

  static getUrl ( args, opts ) {
    return getUrl( args, opts );
  }
}

function parse ( argv ) {
  let
    opts = {
      'string'  : [ 'fetch', 'login', 'logout', 'u' ],
      'boolean' : [ 'silent', 'help', 'version' ],
      'default' : {
        'silent'  : false,
        'help'    : false,
        'version' : false
      }
    },
    parsed = parseLogout( argv );

  if ( parsed ) {
    return parsed;
  }

  parsed = parseArgs( argv, opts );
  return validate({
    name     : parsed._[ 0 ],
    args     : parsed._.slice( 1 ),
    username : parseCredentials( parsed.u, 'username' ),
    password : parseCredentials( parsed.u, 'password' ),
    silent   : parsed.silent,
    help     : parsed.help,
    version  : parsed.version,
  }, opts[ 'string' ] );
}

function parseCredentials ( u, type ) {
  if ( ! u ) return undefined;
  let fragments = u.split( ':' );
  if ( type === 'username' ) {
    return fragments[ 0 ] && fragments[ 0 ].length ? fragments[ 0 ] : undefined;
  }
  if ( type === 'password' ) {
    let password = fragments.slice( 1 ).join( ':' );
    return password && password.length ? password : undefined;
  }
}

function validate ( cmd, strings ) {
  if ( ! cmd.name ) {
    if ( cmd.help    ) return show_info( cmd.silent );
    if ( cmd.version ) return show_info( cmd.silent, { version : true } );
    return show_info( cmd.silent, { minimal : true } );
  }

  if ( strings.indexOf( cmd.name ) === -1 ) {
    return show_info( cmd.silent, { invalid : true, minimal : true } );
  }

  if ( cmd.help ) {
    return show_info( cmd.silent, { cmd : cmd.name } );
  }

  if ( cmd.name === 'login' && ! getUrl( cmd.args ) ) {
    return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
  }

  if ( cmd.name === 'fetch' && ! getUrl( cmd.args ) ) {
    return show_info( cmd.silent, { invalid : true, cmd : cmd.name } );
  }

  return cmd;
}

function getUrl ( args, opts ) {
  opts = opts || {};
  if ( ! args.length ) {
    return;
  }
  let parsed = url.parse( args[ 0 ] );

  if ( opts.relative ) {
    return parsed.path.substr( parsed.path.indexOf( '/' ) );
  }

  if ( ! parsed.host && ( ! parsed.path || parsed.path === '/' ) ) {
    return;
  }
  return [
    `${ parsed.protocol ? parsed.protocol : 'https:' }`,
    `//`,
    `${ parsed.host ? parsed.host : parsed.path.split( '/' )[ 0 ] }`
  ].join( '' );
}

function parseLogout ( argv ) {
  argv = argv.map( arg => arg.toLowerCase() );
  if ( argv.indexOf( 'logout' ) === -1 || argv.indexOf( '--help' ) !== -1 ) {
    return;
  }
  let cmd = { name : 'logout' };
  return ( argv.indexOf( '--silent' ) === -1
    ? cmd
    : Object.assign( { silent : true }, cmd )
  );
}

function show_info ( silent, opts ) {
  opts = opts || {};
  const
    lines = ( lines ) => lines.map( line => line + os.EOL ).join( '' ),
    version = `${pkg.name } ver. ${pkg.version.bold }`,
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
          `   ${'fetch '.green.bold + (show_args ? '[options] <FILEURL> [filepath] '.green.bold + '...' : ' ....')}`
            + ` Fetches a file and shows its content or saves it`.bold,
        full : [
          `                                            <FILEURL>  The full Sharepoint URL to the file`,
          `                                            [filepath] File name or file path to save to`,
          `         ${'[-u]'.yellow.bold} ............................. User credentials as emailaddress:password`,
          ``,
          `                                            Example: spfile fetch https://your.sharepoint.com/path/foo.json`,
          `                                            Example: spfile fetch https://your.sharepoint.com/path/bar.pdf bar.pdf`
        ]
      },
      login : {
        minimal : show_args =>
          `   ${'login '.green.bold + (show_args ? '[options] <HOSTURL> '.green.bold + '..............' : ' ....')}`
            + ` Authenticates with Sharepoint explicitly`.bold,
        full : [
          `                                            <HOSTURL> The Sharepoint host URL`,
          `         ${'[-u]'.yellow.bold} ............................. User credentials as emailaddress:password`,
          ``,
          `                                            Example: spfile login https://your.sharepoint.com`
        ]
      },
      logout : {
        minimal : show_args =>
          `   ${'logout '.green.bold + (show_args ? '.................................' : ' ...')}`
            + ` Invalidates your Sharepoint session explicitly`.bold,
        full : [
        ]
      }
    },
    footer = [
      `${'Options:'.bold}`,
      ``,
      `   ${'--silent'.yellow.bold} ............................... Suppresses most console output`
    ];

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
      console.log( lines([ info[ c ].minimal() ]) );
    }
    else {
      console.log( lines([ info[ c ].minimal(true) ].concat( info[ c ].full ) ) );
    }
  });
  ! opts.minimal && console.log( lines( footer ) );
}
