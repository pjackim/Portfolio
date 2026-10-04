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
 *
 * `E2E_PORT` moves the preview server off 4321 so parallel worktrees (`.config/wt.toml`)
 * don't reuse each other's server via `reuseExistingServer`.
 *
 * Every context starts with `localStorage.net = 'fast'` (src/lib/net-bootstrap.ts), so the
 * adaptive image loader never switches to its light-first mode because of the machine's network
 * or a slow CI runner, and no spec depends on either. Specs for the slow and Save-Data paths set
 * their own mode (tests/helpers/net.ts).
 *
 * WebKit runs at a device scale factor of 1. Linux WebKit has no GPU on CI and paints in
 * software, so the iPhone 15's 3× multiplies every frame's paint and composite by 9, and many
 * specs override its viewport to desktop widths (a 3840×2400 surface at 1280×800). With the
 * hero and About canvases animating, it then paints the home page at 3–8 fps, and every
 * real-time assertion (reveal windows, the 5 s typing budget, rAF sampling) misses. At 1× the
 * same pages hold 60 fps. The specs check behaviour, not pixels, so nothing else is lost.
 */
const envBase = process.env.BASE_URL;
const PORT = process.env.E2E_PORT ?? '4321';
const LOCAL_URL = `http://localhost:${PORT}/Portfolio/`;
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
    storageState: {
      cookies: [],
      origins: [
        { origin: new URL(baseURL).origin, localStorage: [{ name: 'net', value: 'fast' }] },
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['iPhone 15'], deviceScaleFactor: 1 } },
  ],
  ...(envBase
    ? {}
    : {
        webServer: {
          command: `npm run preview -- --port ${PORT} --ignore-lock`,
          url: LOCAL_URL,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
