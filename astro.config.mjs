// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Enable SSR mode
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false,
    wasmModuleImports: false,
  }),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@notionhq/client'],
    },
  }
});