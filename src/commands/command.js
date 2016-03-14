'use strict';

const
  _args   = Symbol( 'args'   ),
  _silent = Symbol( 'silent' );

module.exports = class Command {
  constructor ( cmd ) {
    this[ _args   ] = cmd.args;
    this[ _silent ] = cmd.silent;
  }

  get args   () { return this[ _args   ]; }
  get silent () { return this[ _silent ]; }
}
