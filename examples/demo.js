'use strict';

const Path = require('path');


module.exports = {
  name: 'test-api',
  config: {
    accessKeyId: 'YOUR_ACCESS_KEY_ID',                            // access key
    secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',                    // secret key
    region: 'YOUR_REGION',                                        // region
    role: 'arn:aws:iam::YOUR_ACCOUNT:role/lambda_basic_execution' // IAM role
  },
  routes: [
    {
      method: 'GET',
      path: '/item/{itemId}',
      handler: Path.join(__dirname, 'getItem.js')
    },
    {
      method: 'GET',
      path: '/item/{itemId}/props',
      handler: Path.join(__dirname, 'getItemProperties.js')
    }
  ]
};
