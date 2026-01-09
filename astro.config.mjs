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
    runtime: {
      mode: 'local',
      type: 'pages',
      // D1 database bindings will be loaded from wrangler.toml
      bindings: {
        DB: {
          type: 'd1',
        }
      }
    },
  }),
  integrations: [react()],

  // Security configuration
  security: {
    checkOrigin: false, // Disable strict origin checking for Cloudflare deployments
  },

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@notionhq/client'],
    },
  }
});