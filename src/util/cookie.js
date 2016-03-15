'use strict';

const
  fs            = require( 'fs'            ),
  path          = require( 'path'          ),
  child_process = require( 'child_process' ),

  cookie_path = path.join(
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH,
    '.sharepoint-file'
  ),
  cookie_file_path = path.join( cookie_path, 'cookie_data.json' );

let request;
try {
  request = require( 'request' );
}
catch ( err ) {}

module.exports = class Cookie {
  static restore () {
    return restore();
  }

  static save ( url, fed_auth, rt_fa ) {
    return save( url, fed_auth, rt_fa );
  }

  static clear () {
    return clear();
  }
}

function restore () {
  return new Promise( resolve =>
    fs.readFile( cookie_file_path, 'utf8', ( err, data ) =>
      resolve( err ? undefined : toJar( JSON.parse( data ) ) )
    )
  );
}

function save ( url, fed_auth, rt_fa ) {
  let data = { url : url, fed_auth : fed_auth, rt_fa : rt_fa };
  return new Promise( resolve =>
    fs.mkdir( cookie_path, () =>
      fs.writeFile( cookie_file_path, JSON.stringify( data ), err =>
        resolve( err ? undefined : toJar( data ) )
      )
    )
  );
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

function toJar ( data ) {
  let jar = request.jar();
  jar.setCookie( request.cookie( `FedAuth=${data.fed_auth}` ), data.url );
  jar.setCookie( request.cookie( `rtFa=${data.rt_fa}`       ), data.url );
  return jar;
}
