'use strict';

const
  fs = require( 'fs' ),

  xml2js          = require( 'xml2js'         ),
  concat          = require( 'concat-stream'  ),
  request         = require( 'request'        ),
  istextorbinary  = require( 'istextorbinary' ),

  Command = require( './command' ),
  Login   = require( `./login`   ),
  Parser  = require( './parser'  );

module.exports = class Fetch extends Command {
  run () {
    return new Login( this ).run({
      silent : true
    }).then( jar => fetch( this, jar ) );
  }
}

function fetch ( context, jar ) {
  return new Promise( ( resolve, reject ) => {
    if ( ! jar ) {
      return resolve();
    }

    let
      url          = Parser.getUrl( context.args ),
      relative_url = Parser.getUrl( context.args, { relative : true } ),
      filepath     = context.args[ 1 ];

    filepath && ! context.silent && console.log( `Fetching file...` );
    request({
      url : `${url}/_api/web/GetFileByServerRelativeUrl('${relative_url}')/$value`,
      jar : jar
    }).on( 'error', error => {
      console.error( `${err.host} ${err.code}`.red.bold );
      reject( error );
    })
    .on( 'response', response => {
      if ( response.statusCode !== 200 ) {
        parse_request_error( response ).then( msg => {
          console.error( msg.red.bold );
          reject( msg );
        });
        return;
      }
      if ( filepath ) {
        response.pipe(
          fs.createWriteStream( filepath ).on( 'finish', () => {
            ! context.silent && console.log(
              `Saved to ${filepath} (${fs.statSync( filepath ).size} B).`
            )
            resolve();
          })
        );
        return;
      }
      response.pipe( concat( buffer =>
        istextorbinary.isText( undefined, buffer, ( err, is_text ) => {
          console.log( err || is_text
            ? buffer.toString()
            : 'Not going to show a binary file. Run the command to save it as a file.'
          );
          resolve();
        })
      ));
    });
  });
}

function parse_request_error ( response ) {
  let default_msg = 'Could not download file.';
  return new Promise( resolve => {
    if ( ! response.headers[ 'content-type' ].includes( 'application/xml' ) ) {
      return resolve( default_msg );
    }
    response.pipe( concat( buffer => {
      xml2js.parseString(
        buffer.toString(), { explicitArray : false }, ( err, result ) =>
          resolve( err ? default_msg : result[ 'm:error' ][ 'm:message' ]._ )
      );
    }));
  });
}
