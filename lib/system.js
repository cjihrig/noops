'use strict';

const Aws = require('aws-sdk');
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
