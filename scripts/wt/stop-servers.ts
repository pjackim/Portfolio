/**
 * Stop the Node processes (astro dev/preview, Playwright's web server, esbuild) running out of
 * this checkout, so Windows releases their file handles before `wt remove`/`wt merge` deletes
 * the worktree ("unable to unlink … Invalid argument" otherwise).
 *
 *   node scripts/wt/stop-servers.ts             # also the `pre-remove` hook and `wt stop` alias
 *   node scripts/wt/stop-servers.ts --dry-run   # list what would be stopped
 *
 * Only node/astro/esbuild processes whose command line points inside this checkout are
 * stopped; editors, browsers, and other worktrees' servers are left alone. Never fails: a
 * cleanup miss must not block a removal.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const DRY = process.argv.includes('--dry-run');
const NAMES = /^(node|astro|esbuild)(\.exe)?$/i;

interface Proc {
  pid: number;
  name: string;
  cmd: string;
}

function list(): Proc[] {
  if (process.platform === 'win32') {
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const rows = JSON.parse(out) as {
      ProcessId: number;
      Name: string;
      CommandLine: string | null;
    }[];
    return rows.map((r) => ({ pid: r.ProcessId, name: r.Name, cmd: r.CommandLine ?? '' }));
  }
  const out = execFileSync('ps', ['-eo', 'pid=,comm=,args='], { encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ pid: Number(m[1]), name: m[2]!.split('/').pop()!, cmd: m[3]! }));
}

// Match the checkout path followed by a separator, quote, space, or the end (so
// `.claude/worktrees/foo` never matches `.claude/worktrees/foo-2`), but not a nested worktree
// (so running it in the main checkout leaves every worktree's servers alone).
const norm = (s: string) => s.replace(/\\/g, '/').toLowerCase();
const root = norm(ROOT).replace(/\/$/, '');
const inside = new RegExp(
  `${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!/\\.claude/worktrees/)(?=[/"'\\s]|$)`,
);

try {
  const targets = list().filter(
    (p) => p.pid !== process.pid && NAMES.test(p.name) && inside.test(norm(p.cmd)),
  );
  for (const p of targets) {
    if (DRY) {
      console.log(`would stop ${p.name} ${p.pid}: ${p.cmd.slice(0, 120)}`);
      continue;
    }
    try {
      process.kill(p.pid);
      console.log(`✓ stopped ${p.name} ${p.pid}`);
    } catch {
      // already gone
    }
  }
  if (targets.length === 0) console.log('✓ no servers running from this checkout');
} catch (error) {
  console.warn(`⚠ could not list processes: ${(error as Error).message}`);
}
