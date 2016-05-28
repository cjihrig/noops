'use strict';

const Joi = require('joi');


module.exports = {
  id: 'getItemProperties',
  validate: {
    params: {
      itemId: Joi.string().required().description('The item ID to retrieve')
    },
    query: Joi.object().keys({
      bar: Joi.string(),
      baz: Joi.string()
    }).xor('bar', 'baz')
  },
  handler: function (request, reply) {
    reply(null, {
      summary: `props for item ${request.params.itemId}`,
      query: request.query
    });
  }
};
