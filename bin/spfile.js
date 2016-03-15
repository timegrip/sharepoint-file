#!/usr/bin/env node --harmony

'use strict';

const
  Parser = require( '../src/commands/parser' ),
  cmd = new Parser( process.argv ).parse();

if ( ! cmd ) return;

let Command = require( `../src/commands/${cmd.name}` );
new Command( cmd ).run().then( () => process.exit( 0 ) ).catch(
  () => process.exit( 1 )
);
