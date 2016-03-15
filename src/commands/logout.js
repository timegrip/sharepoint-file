'use strict';

const
  Command = require( './command'      ),
  Cookie  = require( '../util/cookie' );

module.exports = class Logout extends Command {
  run () {
    return logout( this );
  }
}

function logout ( context ) {
  return Cookie.clear().then( cleared => {
    ! context.silent && console.log(
      cleared ? 'Logged out.' : 'Already logged out.'
    );
  });
}
