import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** Self-hosted variable woff2, Latin subset only, straight from the Fontsource packages. */
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,' +
  'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export default defineConfig({
  site: 'https://pjackim.github.io/Portfolio',
  base: '/Portfolio', // exact case
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  image: { layout: 'constrained', responsiveStyles: true },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // Shiki colours code blocks with inline style attributes, which the CSP below forbids; code
  // stays plain, styled by prose.css.
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ filter: (p) => !p.includes('/html/Work/') })],
  // Fonts API: local provider → `<Font cssVariable=… />` emits the @font-face rules, the
  // `--font-sans` / `--font-mono` variables and metric-matched fallbacks (Arial / Courier New).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-sans',
      fallbacks: ['sans-serif'],
      display: 'swap',
      options: {
        variants: [
          {
            src: ['@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
            unicodeRange: [LATIN],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      fallbacks: ['monospace'],
      display: 'swap',
      options: {
        variants: [
          {
            src: ['@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
            unicodeRange: [LATIN],
          },
        ],
      },
    },
  ],
  // Content-Security-Policy as a <meta> on every page (spec-architecture §6). Astro adds
  // `script-src` / `style-src` with 'self' plus the hash of every script and style it bundles
  // or inlines; BaseLayout adds the hashes of the elements it inlines by hand. No
  // 'unsafe-inline' or 'unsafe-eval' anywhere: per-element values go through
  // src/lib/page-style.ts instead of style attributes.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        'frame-src https://www.youtube-nocookie.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
    },
  },
});
