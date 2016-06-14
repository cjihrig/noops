'use strict';

const Aws = require('aws-sdk');
const Bundler = require('./bundler');


function Handler (options) {
  this._lambda = new Aws.Lambda();
  this._role = options.role;
  this._accountId = options.accountId;

  if (options.file) {
    this._file = options.file;
    this._handler = require(options.file);
    this._name = this._handler.id;
    this._id = 'arn:aws:lambda:' +
               `${Aws.config.region}:` +
               `${options.accountId}:function:` +
               `${this._handler.id}`;
  } else if (options.id) {
    this._file = null;
    this._handler = null;
    this._name = (options.id.match(/:function:(.+)\/invocations/) || [])[1];
    this._id = options.id;
  }

  this._fn = null;
}

module.exports = Handler;


Handler.prototype.create = function create (options, callback) {
  // TODO: this._file may not be set
  Bundler.bundle({
    entry: this._file,
    export: '__main', // This will be set inside bundle()
    // minify: true,  // TODO: Currently not working. Browserify plugin not found.
    deploy: {
      name: this._name,
      role: this._role
    }
  }, (err, buffer, artifacts) => {
    if (err) {
      return callback(err);
    }

    this._fn = artifacts.lambda;
    callback(null, this._fn);
  });
};


Handler.prototype.remove = function remove (options, callback) {
  this._lambda.deleteFunction({ FunctionName: this._id }, callback);
};
