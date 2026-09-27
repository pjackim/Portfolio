/**
 * PostToolUse hook (Edit|Write) for the media agents (media-manager, media-finder): after an
 * edit under `src/content/projects/`, runs `npm run check:media` in the checkout that owns the
 * edited file — the agent's own worktree, not the main checkout — and exits 2 with the report
 * when it fails, so the agent sees the error on the very next turn.
 *
 *   node .claude/hooks/check-media-on-edit.ts   (stdin: the hook's JSON payload)
 *
 * Runs on Node's native type-stripping: erasable syntax only.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const payload = JSON.parse(readFileSync(0, 'utf8')) as { tool_input?: { file_path?: string } };
const file = payload.tool_input?.file_path ?? '';
if (!/src[\\/]content[\\/]projects[\\/]/.test(file)) process.exit(0);

let root = dirname(file);
while (!existsSync(join(root, 'package.json'))) {
  const parent = dirname(root);
  if (parent === root) process.exit(0);
  root = parent;
}

const result = spawnSync('npm run -s check:media', { cwd: root, shell: true, encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(
    `check:media failed after editing ${file} — fix before finishing:\n` +
      `${result.stdout ?? ''}${result.stderr ?? ''}`,
  );
  process.exit(2);
}
