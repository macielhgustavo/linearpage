import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://linearintelligence.com.br',
  output: 'static',
  build: { inlineStylesheets: 'never' },
});
