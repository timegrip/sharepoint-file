#!/usr/bin/env node
'use strict';

const
  fs              = require( 'fs'                     ),
  url             = require( 'url'                    ),
  path            = require( 'path'                   ),
  request         = require( 'request'                ),
  inquirer        = require( 'inquirer'               ),
  Sharepoint      = require( 'sharepoint-auth'        ),
  FileCookieStore = require( 'tough-cookie-filestore' ),

  cookie_store = path.normalize( `${__dirname}/.sharepoint-cookies.json` );

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
          return reject( err );
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
  opts.new && fs.openSync( cookie_store, 'w' );
  try {
    return request.jar( new FileCookieStore( cookie_store ) );
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

let command = process.argv[ 2 ];
command = command ? command.trim().toLowerCase() : '';
if ( command.length && [ 'login', 'logout', 'fetch' ].indexOf( command ) === -1 ) {
  console.log( 'Command not found.' );
  process.exit( 1 );
}

let
  parsed = process.argv[ 3 ] ? url.parse( process.argv[ 3 ] ) : '',
  host_url = `${parsed.protocol}//${parsed.host}`,
  file_path = parsed.path,
  file_name = file_path ? file_path.split( '/' ).slice( -1 ).toString() : '';

if ( command === 'login' ) {
  login( host_url ).then( () => console.log( 'ok' ) ).catch(
    e => console.log( e )
  );
  return;
}

if ( command === 'logout' ) {
  fs.unlink( cookie_store );
  return;
}

if ( command === 'fetch' ) {
  login( host_url ).then( jar => {
    request({
      url : `${host_url}/_api/web/GetFileByServerRelativeUrl('${file_path}')/$value`,
      jar : jar
    }).on( 'error', err => console.log( err ) ).pipe(
      fs.createWriteStream( path.resolve( process.cwd(), file_name ) )
    );
  }).catch( e => console.log( e ) );

  return;
}
