# noops

[![Current Version](https://img.shields.io/npm/v/noops.svg)](https://www.npmjs.org/package/noops)
[![Build Status via Travis CI](https://travis-ci.org/continuationlabs/noops.svg?branch=master)](https://travis-ci.org/continuationlabs/noops)
![Dependencies](http://img.shields.io/david/continuationlabs/noops.svg)
[![belly-button-style](https://img.shields.io/badge/eslint-bellybutton-4B32C3.svg)](https://github.com/continuationlabs/belly-button)


**This is still a very early work in progress**

`noops` is a utility for creating APIs whose routes are deployed as individual AWS lambda functions. `noops` lets you define your API using a [`hapi`](https://github.com/hapijs/hapi)-like configuration. An AWS API Gateway and Lambda functions are automatically setup for you. Unlike an out of the box lambda, your application code has access to familiar HTTP constructs like the request body, query string parameters, and headers. `noops` also gives you HTTP error response codes out of the box by utilizing [`boom`](https://github.com/hapijs/boom) (non-boom errors default to a `500` status code).

More documentation will follow, as the project matures. For now, take the example API for a test run. Pull down this repo and run `npm install`. Then, in `examples/demo.js`, add your access key, secret key, region, and an IAM role that is able to execute lambda functions. Finally, run:

```
node ./bin/noops.js deploy examples/demo.js
```

This may take some time to complete (it takes time to make all of the API calls to configure the HTTP status code handling in AWS). Once execution completes, you should have two lambda functions that are connected to an API gateway. You can access these resources via your AWS account.

## Command Line Interface

This section describes the commands supported by `noops`. The examples in this section assume that the `noops` binary is in your `PATH`.

### `deploy`

Deploys a system configuration to AWS. API endpoints are mapped to an AWS API Gateway. The handler for each endpoint is mapped to an AWS Lambda function.

Example command:

```
$ noops deploy system.js
```

### `remove`

Removes the resources associated with a system from AWS.

Example command:

```
$ noops remove system.js
```

## Testing

`noops` systems can be tested offline by generating a hapi mock server.

Example code:

```javascript
const NoOps = require('noops');
const system = new NoOps.System(require('./system'));

system.mock({
  connection: { port: 6000 }
}, (err, server) => {
  // For the sake of testing, it is recommended that
  // you use server.inject() instead of starting the server.
  server.start((err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(`Server started at ${server.info.uri}`);
  });
});
```
