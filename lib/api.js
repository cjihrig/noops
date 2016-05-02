'use strict';

const Http = require('http');
const Aws = require('aws-sdk');
const Insync = require('insync');
const Merge = require('lodash.merge');
const Uuid = require('node-uuid');
const Handler = require('./handler');
const Passthrough = require('./passthrough_template');

const STATUS_CODES = Object.keys(Http.STATUS_CODES).filter((code) => {
  const c = parseInt(code, 10);

  // These are the values supported by API Gateway
  return c >= 200 && c < 600;
});


function Api (options) {
  this._gateway = new Aws.APIGateway(options);

  if (options.api) {
    this._name = options.api.name;
    this._id = options.api.id;
    this._api = options.api;
  } else {
    this._name = options.name;
    this._id = '';
    this._api = null;
  }

  this._role = options.role;
  this._accountId = options.accountId;
}

module.exports = Api;


Api.prototype.create = function create (options, callback) {
  const settings = Merge({}, options, { name: this._name });

  this._gateway.createRestApi(settings, (err, restApi) => {
    if (err) {
      return callback(err);
    }

    this._api = restApi;
    this._id = restApi.id;
    callback(null, restApi);
  });
};


Api.prototype.remove = function remove (options, callback) {
  Insync.waterfall([
    (next) => { this.getRoutes({}, next); },
    (routes, next) => {
      Insync.each(routes, (route, cb) => {
        if (!route.handler) {
          return cb();
        }

        route.handler.remove({}, cb);
      }, next);
    },
    (next) => { this._gateway.deleteRestApi({ restApiId: this._id }, next); }
  ], callback);
};


Api.prototype.getResources = function getResources (options, callback) {
  const settings = Merge({}, options, { restApiId: this._id });

  // this._gateway.getResources(settings, callback);
  // See: https://www.bountysource.com/issues/27722685-embed-option-for-getresources-on-api-gateway
  const req = this._gateway.getResources(settings);

  req.on('build', (req) => {
    req.httpRequest.path += '/?embed=methods';
  });

  req.send(callback);
};


Api.prototype.deploy = function deploy (options, callback) {
  const settings = Merge({ stageName: 'prod' },
                         options,
                         { restApiId: this._id });

  this._gateway.createDeployment(settings, callback);
};


Api.prototype.createRoute = function createRoute (options, callback) {
  const settings = Merge({}, options, { restApiId: this._id });
  const method = settings.method;
  const pathParts = settings.path.split('/').filter((part) => {
    return part !== '';
  });

  Insync.waterfall([
    (next) => { this.getResources({}, next); },
    (resources, next) => {
      // Assuming the / resource is always at index 0
      let previous = resources.items[0];
      let path = '';

      Insync.eachSeries(pathParts, (part, cb) => {
        path += `/${part}`;
        const existing = resources.items.filter((resource) => {
          return resource.path === path;
        }).pop();

        if (existing) {
          previous = existing;
          return cb();
        }

        this._gateway.createResource({
          parentId: previous.id,
          pathPart: part,
          restApiId: this._id
        }, (err, resource) => {
          previous = resource;
          cb(err);
        });
      }, (err) => {
        next(err, previous);
      });
    },
    (resource, next) => {
      this._gateway.putMethod({
        authorizationType: 'NONE',
        httpMethod: method,
        resourceId: resource.id,
        restApiId: this._id
      }, (err, method) => {
        next(err, resource);
      });
    },
    (resource, next) => {
      const handler = new Handler({
        role: this._role,
        accountId: this._accountId,
        file: settings.handler
      });

      handler.create({}, (err, fn) => {
        next(err, resource, handler);
      });
    },
    (resource, handler, next) => {
      const uri = 'arn:aws:apigateway:' +
                  `${Aws.config.region}:lambda:path/2015-03-31/functions/` +
                  `${handler._id}/invocations`;

      this._gateway.putIntegration({
        httpMethod: method,
        resourceId: resource.id,
        restApiId: this._id,
        type: 'AWS',
        integrationHttpMethod: 'POST',
        requestTemplates: { 'application/json': Passthrough.template },
        uri
      }, (err, integration) => {
        next(err, resource, handler);
      });
    },
    (resource, handler, next) => {
      Insync.eachSeries(STATUS_CODES, (code, cb) => {
        // TODO: Look into supporting multiple HTTP status codes better
        // TODO: Optionally let users specify the codes they actually use
        this._gateway.putMethodResponse({
          httpMethod: method,
          resourceId: resource.id,
          restApiId: this._id,
          statusCode: code,
          responseModels: { 'application/json': 'Empty' }
        }, cb);
      }, (err) => {
        next(err, resource, handler);
      });
    },
    (resource, handler, next) => {
      Insync.eachSeries(STATUS_CODES, (code, cb) => {
        const c = parseInt(code, 10);

        if (c < 400 && c !== 200) {
          return cb();
        }

        const options = {
          httpMethod: method,
          resourceId: resource.id,
          restApiId: this._id,
          statusCode: code,
          responseTemplates: { 'application/json': '' }
        };

        if (c >= 400) {
          // TODO: Map the stringified error back to an object
          // See https://aws.amazon.com/blogs/compute/amazon-api-gateway-mapping-improvements/
          options.selectionPattern = `.*"statusCode\\":${c}.*`;
        }

        this._gateway.putIntegrationResponse(options, cb);
      }, (err) => {
        next(err, resource, handler);
      });
    },
    (resource, handler, next) => {
      handler._lambda.addPermission({
        Action: 'lambda:InvokeFunction',
        FunctionName: handler._name,
        Principal: 'apigateway.amazonaws.com',
        StatementId: `${handler._name}-${Uuid.v4()}`,
        SourceArn: 'arn:aws:execute-api:' +
                   `${Aws.config.region}:` +
                   `${this._accountId}:` +
                   `${this._id}/` +
                   'prod/' +
                   `${method}` +
                   `${settings.path}`
      }, (err, permission) => {
        next(err);
      });
    }
  ], (err) => {
    callback(err);
  });
};


Api.prototype.getRoutes = function getRoutes (options, callback) {
  this.getResources({}, (err, resources) => {
    if (err) {
      return callback(err);
    }

    const routes = [];

    for (let i = 0; i < resources.items.length; ++i) {
      const resource = resources.items[i];
      const resourceMethods = resource.resourceMethods;

      if (resourceMethods === undefined) {
        continue;
      }

      const keys = Object.keys(resourceMethods);

      for (let j = 0; j < keys.length; ++j) {
        const resourceMethod = resourceMethods[keys[j]];
        const integration = resourceMethod.methodIntegration;
        let handler = null;

        if (integration.type === 'AWS') {
          handler = new Handler({
            role: this._role,
            accountId: this._accountId,
            id: (integration.uri.match(/\/functions\/(.+)\//) || [])[1]
          });
        }

        routes.push({
          method: resourceMethod.httpMethod,
          path: resource.path,
          handler
        });
      }
    }

    callback(null, routes);
  });
};
