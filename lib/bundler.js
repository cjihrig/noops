'use strict';

const Browserify = require('browserify');
const Fse = require('fs-extra');
const Zip = require('node-zip');


module.exports.bundle = function bundle (options, callback) {
  const handler = options.handler;
  const tmpFile = `${handler}.tmp`;

  const browserify = Browserify({
    entries: [handler],
    standalone: 'lambda',
    browserField: false,
    builtins: false,
    commondir: false,
    ignoreMissing: true,
    detectGlobals: true,
    insertGlobalVars: {
      process: function () {}
    }
  });

  // TODO: Quick hack using files. Should probably be in a browserify transform.
  Fse.copySync(handler, tmpFile);
  Fse.appendFileSync(handler,
                     `\n; module.exports.__main = ${__main.toString()}`);
  browserify.bundle((err, buffer) => {
    Fse.copySync(tmpFile, handler);
    Fse.removeSync(tmpFile);

    if (err) {
      return callback(err);
    }

    // TODO: Minify the bundle

    const zip = new Zip();
    zip.file('index.js', buffer.toString());
    const zipData = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      platform: process.platform
    });
    callback(null, zipData);
  });
};


function __main (event, context, callback) {
  const Boom = require('boom');
  const request = {
    event,
    context,
    app: {},
    headers: event.params.header,
    method: event.context['http-method'],
    params: event.params.path,
    path: event.context['resource-path'],
    payload: JSON.parse(event['body-json']),
    query: event.params.querystring
  };
  // TODO: Implement reply interface

  module.exports.handler(request, (err, response) => {
    if (err) {
      const e = JSON.stringify(Boom.wrap(err, 500, err.message));
      return callback(e);
    }

    callback(null, response);
  });
}
