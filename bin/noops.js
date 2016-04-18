#!/usr/bin/env node

'use strict';

const Path = require('path');
const Insync = require('insync');
const System = require('../lib/system');
const configPath = Path.resolve(process.cwd(), process.argv[2]);
const config = require(configPath);


Insync.waterfall([
  (next) => { next(null, new System(config)); },
  (system, next) => {
    system.createApi({ name: config.name }, (err, api) => {
      next(err, system, api);
    });
  },
  (system, api, next) => {
    Insync.eachSeries(config.routes, (route, cb) => {
      api.createRoute(route, cb);
    }, (err) => {
      next(err, system, api);
    });
  },
  (system, api, next) => { api.deploy({}, next); }
], (err) => {
  if (err) {
    console.error(err);
  }
});
