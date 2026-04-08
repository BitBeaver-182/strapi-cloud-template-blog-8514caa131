import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const outputPath = process.env.OPENAPI_OUTPUT ?? './public/docs/api-spec.json';

mkdirSync(dirname(outputPath), { recursive: true });

// Generate the spec via Strapi CLI (experimental in Strapi 5).
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['strapi', 'openapi', 'generate', '--output', outputPath], {
  stdio: 'inherit',
});

// The generated spec paths are prefix-less (e.g. "/suppliers"), while Strapi's Content API is mounted under "/api".
// Add an OpenAPI servers entry so Swagger UI calls the right URLs.
const raw = readFileSync(outputPath, 'utf8');
const spec = JSON.parse(raw);

if (!Array.isArray(spec.servers) || spec.servers.length === 0) {
  spec.servers = [{ url: '/api' }];
} else {
  const hasApi = spec.servers.some((s) => s && typeof s.url === 'string' && s.url.replace(/\/+$/, '') === '/api');
  if (!hasApi) spec.servers.unshift({ url: '/api' });
}

writeFileSync(outputPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');

