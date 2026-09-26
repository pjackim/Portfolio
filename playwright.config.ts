import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end gates (spec-architecture §7). Locally and in CI the suite runs against
 * `astro preview` of the built `dist/` (run `npm run build:only` first). Setting `BASE_URL`
 * (e.g. the deployed Pages URL) skips the local server; combine with `--grep @prod` for the
 * post-deploy subset. Specs navigate with relative paths (`page.goto('work/')`, no leading
 * slash) so they resolve under `/Portfolio/`. Browsers: `npx playwright install chromium webkit`.
 *
 * `--ignore-lock`: Astro 7's `astro preview` refuses to start while another preview server
 * holds `.astro/preview.json`, and auto-backgrounds itself when run by an AI agent. Either
 * would leave the test server missing or detached; with the flag it always runs in the
 * foreground and Playwright owns its lifetime.
 */
const envBase = process.env.BASE_URL;
const LOCAL_URL = 'http://localhost:4321/Portfolio/';
const baseURL = envBase ? envBase.replace(/\/?$/, '/') : LOCAL_URL;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['iPhone 15'] } },
  ],
  ...(envBase
    ? {}
    : {
        webServer: {
          command: 'npm run preview -- --port 4321 --ignore-lock',
          url: LOCAL_URL,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
