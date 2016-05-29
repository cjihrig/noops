#!/usr/bin/env node

'use strict';
process.title = 'noops';
require('../lib/cli').run(process.argv.slice(2));
