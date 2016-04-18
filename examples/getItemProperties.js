'use strict';

module.exports = {
  id: 'getItemProperties',
  handler: function (request, reply) {
    reply(null, {
      summary: `props for item ${request.params.itemId}`,
      query: request.query
    });
  }
};
