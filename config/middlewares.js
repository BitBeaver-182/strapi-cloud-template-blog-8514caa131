module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // 'strapi::security',
  {
    name: "strapi::security",
    config: {
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
        "connect-src": ["'self'", "https:"],
        "script-src": ["https://cdnjs.cloudflare.com"],
        "media-src": ["https://cdnjs.cloudflare.com"],
        "img-src": ["https://cdnjs.cloudflare.com"],
          },
      },
    },
  },
];
