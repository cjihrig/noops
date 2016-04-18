'use strict';

const Boom = require('boom');


module.exports = {
  id: 'getItem',
  handler: function (request, reply) {
    if (request.params.itemId === 'nothing') {
      return reply(Boom.notFound());
    }

    reply(null, { id: `item ${request.params.itemId}` });
  }
};
