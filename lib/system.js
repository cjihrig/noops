'use strict';

const Aws = require('aws-sdk');
const Insync = require('insync');
const Merge = require('lodash.merge');
const Api = require('./api');


function System (options) {
  Aws.config.update(options.config);
  this._role = options.config.role;
  this._accountId = this._role.split('::')[1].split(':')[0];
  this._apis = [];
}

module.exports = System;


// eslint-disable-next-line no-extend-native
System.prototype.createApi = function createApi (options, callback) {
  const settings = Merge({ role: this._role, accountId: this._accountId },
                         options);
  const api = new Api(settings);

  api.create({}, (err, restApi) => {
    if (err) {
      return callback(err);
    }

    callback(null, api);
  });
};


// eslint-disable-next-line no-extend-native
System.prototype.getApis = function getApis (options, callback) {
  const gateway = new Aws.APIGateway();

  gateway.getRestApis({ limit: 500 }, (err, results) => {
    if (err) {
      return callback(err);
    }

    const apis = results.items.map((restApi) => {
      return new Api({
        api: restApi,
        role: this._role,
        accountId: this._accountId
      });
    });

    callback(null, apis);
  });
};


// eslint-disable-next-line no-extend-native
System.prototype.getApi = function getApis (options, callback) {
  Insync.waterfall([
    (next) => { this.getApis({}, next); },
    (apis, next) => {
      if (options.id) {
        return next(null, apis.find((api) => {
          return api._id === options.id;
        }));
      }

      if (options.name) {
        return next(null, apis.find((api) => {
          return api._name === options.name;
        }));
      }

      next();
    },
    (api, next) => {
      if (!api) {
        return next();
      }

      api.getRoutes({}, (err, routes) => {
        api.routes = routes;
        next(err, api);
      });
    }
  ], callback);
};


// eslint-disable-next-line no-extend-native
System.prototype.removeApi = function getApis (options, callback) {
  Insync.waterfall([
    (next) => { this.getApi(options, next); },
    (api, next) => {
      if (!api) {
        return next();
      }

      api.remove({}, next);
    }
  ], callback);
};
