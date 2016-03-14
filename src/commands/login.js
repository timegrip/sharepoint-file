'use strict';

const
  os = require( 'os' ),

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
    return login( this );
  }
}

function login ( context ) {
  return new Promise( ( resolve, reject ) => {
    let jar = Cookie.read();
    if ( jar ) {
      ! context.silent && console.log( 'Already logged in.' );
      return resolve( jar );
    }

    let url = Parser.getUrl( context.args );
    query_credentials().then( credentials =>
      Sharepoint({ auth : credentials, host : url }, ( err, result ) => {
        if ( err ) {
          console.error(
            `Login failed.${os.EOL}Check your host URL and login credentials, then try again.`
          );
        }
        else {
          ! context.silent && console.log( 'Logged in.' );
        }
        resolve( err
          ? undefined
          : Cookie.create( url, result.cookies.FedAuth, result.cookies.rtFa )
        );
      })
    ).catch( () => reject() );
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
  .then( password => ({ username : username, password : password })));
}
