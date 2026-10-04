/**
 * Size gate for the built site — run after `astro build`.
 *
 *   npm run check:dist
 *
 * GitHub Pages refuses a published site over 1 GB. Media is encoded for quality, not weight,
 * so this is the tripwire: a warning from 700 MB, an error from 900 MB.
 */
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const MB = 1_000_000;
const WARN = 700 * MB;
const FAIL = 900 * MB;
const DIST = resolve(import.meta.dirname, '../dist');

if (!existsSync(DIST)) {
  console.error('✖ dist/ not found: run `npm run build:only` first');
  process.exit(1);
}

let total = 0;
const groups = new Map<string, number>();
for (const entry of await readdir(DIST, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile()) continue;
  const { size } = await stat(join(entry.parentPath, entry.name));
  total += size;
  const ext = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();
  groups.set(ext, (groups.get(ext) ?? 0) + size);
}

const mb = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;
const top = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`check:dist — ${mb(total)} (${top.map(([ext, n]) => `${ext} ${mb(n)}`).join(', ')})`);

if (total > FAIL) {
  console.error(`✖ dist/ is over ${mb(FAIL)}; GitHub Pages refuses sites over 1 GB`);
  process.exit(1);
}
if (total > WARN) console.log(`⚠ dist/ is over ${mb(WARN)}`);
else console.log('✔ dist size OK');
