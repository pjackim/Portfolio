/**
 * Snapshot codebase-memory-mcp's `get_architecture` output for this checkout, one JSON file per
 * aspect, into docs/codebase/<aspect>.json. The `update-adr` workflow reads these files.
 *
 *   npm run graph:snapshot               # snapshot (indexes the repo first if it isn't yet)
 *   npm run graph:snapshot -- --reindex  # re-index before snapshotting
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ARCHITECTURE_ASPECTS, ROOT, cbm, ensureProject } from './cbm.ts';

const OUT_DIR = join(ROOT, 'docs', 'codebase');

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== '--reindex');

try {
  if (unknown.length > 0) throw new Error(`unexpected arguments: ${unknown.join(' ')}`);
  const project = ensureProject(args.includes('--reindex'));
  mkdirSync(OUT_DIR, { recursive: true });

  for (const aspect of ARCHITECTURE_ASPECTS) {
    const raw = cbm(
      'cli',
      '--quiet',
      'get_architecture',
      '--project',
      project,
      '--aspects',
      aspect,
      '--format',
      'json',
    );
    JSON.parse(raw); // refuse to write a non-JSON error message as a snapshot
    const file = join(OUT_DIR, `${aspect}.json`);
    writeFileSync(file, raw);
    console.log(`✓ ${relative(ROOT, file)} (${(raw.length / 1024).toFixed(1)} KB)`);
  }
} catch (error) {
  console.error(`✖ ${(error as Error).message}\nusage: npm run graph:snapshot [-- --reindex]`);
  process.exit(1);
}
