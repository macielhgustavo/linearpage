import { readFileSync, writeFileSync } from 'node:fs';

const required = [
  'CLOUDFLARE_D1_DATABASE_ID',
  'ACCESS_TEAM_DOMAIN',
  'ACCESS_AUD',
];

const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error('Missing required production configuration:', missing.join(', '));
  process.exit(1);
}

const inputPath = 'wrangler.jsonc';
const outputPath = 'wrangler.generated.jsonc';
const config = JSON.parse(readFileSync(inputPath, 'utf8'));

config.d1_databases[0].database_id = process.env.CLOUDFLARE_D1_DATABASE_ID.trim();
config.vars.ACCESS_TEAM_DOMAIN = process.env.ACCESS_TEAM_DOMAIN.trim();
config.vars.ACCESS_AUD = process.env.ACCESS_AUD.trim();

writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n');
console.log('Generated', outputPath, 'for production deploy.');
