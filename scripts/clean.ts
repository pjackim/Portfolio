/**
 * Delete generated build/test output so the next run starts cold.
 *
 *   npm run clean            # build, cache, and test/report output
 *   npm run clean -- --all   # the above plus node_modules (reinstall with `npm ci`)
 *
 * Every path is gitignored; nothing tracked is touched.
 */
import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const ARTIFACTS = [
  'dist',
  '.astro',
  '.cache',
  'node_modules/.astro',
  'test-results',
  'playwright-report',
  'blob-report',
  '.lighthouseci',
];

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== '--all');
if (unknown.length > 0) {
  console.error(`✖ unexpected arguments: ${unknown.join(' ')}\nusage: npm run clean [-- --all]`);
  process.exit(1);
}

const targets = args.includes('--all') ? [...ARTIFACTS, 'node_modules'] : ARTIFACTS;

for (const target of targets) {
  const path = join(ROOT, target);
  if (!existsSync(path)) continue;
  await rm(path, { recursive: true, force: true, maxRetries: 3 });
  console.log(`✓ removed ${target}`);
}
