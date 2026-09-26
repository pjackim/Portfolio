import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pjackim.github.io',
  base: '/Portfolio', // exact case
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  image: { layout: 'constrained', responsiveStyles: true },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [sitemap({ filter: (p) => !p.includes('/html/Work/') })],
  // fonts: local Fontsource woff2 via the Fonts API — added in the fonts task
  // security.csp added in the SEO/CSP task
});
