'use strict';

const Path = require('path');
const Insync = require('insync');
const System = require('./system');


const commands = { deploy, remove, help };


module.exports.run = function run (argv) {
  const command = commands[argv.shift()] || help;

  command(argv);
};


function help () {
  // TODO: implement help command
  console.log('print useful information');
}


function deploy (argv) {
  const configPath = Path.resolve(process.cwd(), argv[0]);
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
}


function remove (argv) {
  const configPath = Path.resolve(process.cwd(), argv[0]);
  const system = new System(require(configPath));

  system.removeApi({ name: system._settings.name }, (err, api) => {
    if (err) {
      console.log(err);
    }
  });
}
