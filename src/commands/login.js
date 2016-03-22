'use strict';

const
  Sharepoint = require( 'sharepoint-auth' ),
  read       = require( 'read'            ),

  Command = require( './command'      ),
  Parser  = require( './parser'       ),
  Cookie  = require( '../util/cookie' );

module.exports = class Login extends Command {
  run ( opts ) {
    opts = opts || {};
    if ( opts.silent !== undefined ) {
      this.silent = opts.silent;
    }
    if ( opts.credentials !== undefined ) {
      this.credentials = opts.credentials;
    }
    return login( this );
  }
}

function login ( context ) {
  return Cookie.restore().then( jar => {
    if ( jar ) {
      ! context.silent && console.log( 'Already logged in.' );
      return jar;
    }

    return query_credentials( context.credentials ).then( credentials =>
      auth( Parser.getUrl( context.args ), credentials ).then( result => {
        if ( result.jar ) {
          ! context.silent && console.log( 'Logged in.' );
          return result.jar;
        }
        console.error( result );
      })
    );
  });
}

function auth ( host, credentials ) {
  if ( ! credentials.username.length || ! credentials.password.length ) {
    return Promise.resolve( 'Missing username or password.' );
  }
  return new Promise( resolve =>
    Sharepoint( { host : host, auth : credentials }, ( err, result ) =>
      resolve( err
        ? 'Login failed. Check your host URL and login credentials, then try again.'
        : {
          jar : Cookie.save( host, result.cookies.FedAuth, result.cookies.rtFa )
        }
      )
    )
  );
}

function query_credentials ( credentials ) {
  ( ! credentials.username || ! credentials.password )
    && console.log( 'Please enter your Sharepoint credentials'.gray );
  let query = ( read_opts ) =>
    new Promise( ( resolve, reject ) =>
      read( read_opts, ( err, result ) => err ? reject() : resolve( result ) )
    );
  return Promise.resolve( credentials.username ? credentials.username : query({
    prompt : 'Email address :'.cyan.bold
  })).then( username =>
    Promise.resolve( credentials.password ? credentials.password : query({
      prompt  : `Password ${credentials.username?'':'     '}:`.cyan.bold,
      silent  : true,
      replace : '*'
  }))
  .then( password => ({ username : username, password : password })));
}
