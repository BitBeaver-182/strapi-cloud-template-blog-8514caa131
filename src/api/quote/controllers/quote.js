'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::quote.quote');
