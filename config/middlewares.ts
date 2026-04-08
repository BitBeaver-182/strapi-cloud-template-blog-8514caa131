import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'global::errors-parser',
  'strapi::errors',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:', 'https://cdnjs.cloudflare.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:', 'https://cdnjs.cloudflare.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
];

export default config;
