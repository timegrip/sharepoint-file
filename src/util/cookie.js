'use strict';

const
  fs            = require( 'fs'            ),
  path          = require( 'path'          ),
  child_process = require( 'child_process' ),

  cookie_path = path.join(
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH,
    '.sharepoint-file'
  ),
  cookie_file_path = path.join( cookie_path, 'cookies.json' );

let request, FileCookieStore;
try {
  request         = require( 'request'                );
  FileCookieStore = require( 'tough-cookie-filestore' );
}
catch ( err ) {}

module.exports = class Cookie {
  static get path () {
    return cookie_path;
  }

  static read () {
    return read();
  }

  static create () {
    return create();
  }

  static clear () {
    return clear();
  }
}

function read () {
  try {
    return request.jar( new FileCookieStore( cookie_file_path ) );
  }
  catch ( e ) {}
}

function create ( url, fed_auth, rt_fa ) {
  ! fs.existsSync( cookie_path ) && fs.mkdirSync( cookie_path );
  fs.openSync( cookie_file_path, 'w' );
  let jar = read();
  jar.setCookie( request.cookie( `FedAuth=${fed_auth}` ), url );
  jar.setCookie( request.cookie( `rtFa=${rt_fa}`       ), url );
  return jar;
}

function clear () {
  return new Promise( ( resolve, reject ) =>
    fs.stat( cookie_path, error => {
      if ( error ) {
        return resolve();
      }

      let rm = process.platform.startsWith( 'win' ) ? 'rmdir /s/q' : 'rm -rf';
      child_process.exec( `${rm} ${cookie_path}`, error => {
        if ( error ) {
          console.error( 'Cookie.clear error', error );
          return reject( error );
        }
        resolve( true );
      });
    })
  );
}
