/**
 * Per-finding evidence shots for /audit-portfolio reports: one cropped, committed WebP per
 * finding, showing the offending element in the right viewport, scheme, and state.
 *
 *   node .claude/skills/audit-portfolio/scripts/evidence.ts \
 *     --base http://localhost:4400/Portfolio/ --spec shots.json --out docs/audits/2026-09-27-cards
 *
 * shots.json is an array of:
 *   { "id": "F1", "path": "", "selector": "#work .card:nth-child(2)", "width": 1280,
 *     "scheme": "dark", "state": "hover" | "focus" | "none", "motion": "reduce" | "on",
 *     "pad": 24, "suffix": "after" }
 * `selector` is optional (omit it for the viewport at the top of the page); `state` hovers or
 * focuses the selector (focus targets its first focusable descendant); `pad` adds page context
 * around the element in CSS px; `suffix` names a second shot of the same finding
 * (F1-after.webp). Writes <out>/<id>[-suffix].webp and prints each file with its byte size.
 * Runs on Node's native type-stripping: erasable syntax only.
 */
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

interface Shot {
  id: string;
  path: string;
  selector?: string;
  width?: number;
  scheme?: 'light' | 'dark';
  state?: 'hover' | 'focus' | 'none';
  motion?: 'reduce' | 'on';
  pad?: number;
  suffix?: string;
}

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:4321/Portfolio/' },
    spec: { type: 'string' },
    out: { type: 'string' },
  },
});
if (!values.spec || !values.out) {
  console.error('usage: evidence.ts --spec shots.json --out <dir> [--base <url>]');
  process.exit(1);
}

const base = values.base.replace(/\/?$/, '/');
const shots = JSON.parse(readFileSync(values.spec, 'utf8')) as Shot[];
mkdirSync(values.out, { recursive: true });

const browser = await chromium.launch();
let failed = 0;

for (const shot of shots) {
  const width = shot.width ?? 1280;
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: 1,
    colorScheme: shot.scheme ?? 'dark',
    reducedMotion: shot.motion === 'on' ? 'no-preference' : 'reduce',
    hasTouch: width < 600,
  });
  const page = await context.newPage();
  const file = join(values.out, `${shot.id}${shot.suffix ? `-${shot.suffix}` : ''}.webp`);
  try {
    await page.goto(base + shot.path, { waitUntil: 'networkidle' });
    let clip: { x: number; y: number; width: number; height: number } | undefined;
    if (shot.selector) {
      const el = page.locator(shot.selector).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(shot.motion === 'on' ? 1200 : 300);
      if (shot.state === 'hover') await el.hover();
      if (shot.state === 'focus') {
        // Keyboard-style focus so :focus-visible styles apply.
        await page.keyboard.press('Tab');
        await el.evaluate((node) => {
          const target = node.matches('a,button,input,select,textarea,[tabindex]')
            ? (node as HTMLElement)
            : node.querySelector<HTMLElement>('a,button,input,select,textarea,[tabindex]');
          target?.focus({ focusVisible: true } as FocusOptions);
        });
      }
      if (shot.state && shot.state !== 'none')
        await page.waitForTimeout(shot.motion === 'on' ? 900 : 150);
      // Page coordinates (not viewport), so elements taller than the viewport still fit.
      const box = await el.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return r.width && r.height
          ? { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }
          : null;
      });
      if (!box) throw new Error(`selector not visible: ${shot.selector}`);
      const pad = shot.pad ?? 24;
      clip = {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(width - Math.max(0, box.x - pad), box.width + pad * 2),
        height: box.height + pad * 2,
      };
    }
    const png = await page.screenshot({ clip, fullPage: Boolean(clip) });
    await sharp(png).webp({ quality: 80 }).toFile(file);
    console.log(`${file}  ${Math.round(statSync(file).size / 1024)} KB`);
  } catch (error) {
    failed++;
    console.error(`! ${shot.id}: ${String(error)}`);
  }
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
