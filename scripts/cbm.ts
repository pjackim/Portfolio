/** Shared helpers for driving the `codebase-memory-mcp` CLI on this checkout. */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export const BIN = 'codebase-memory-mcp';
export const ROOT = resolve(import.meta.dirname, '..');

/** Run the CLI and return stdout; throws an Error with a readable message on failure. */
export function cbm(...args: string[]): string {
  try {
    return execFileSync(BIN, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    throw new Error(missing ? `${BIN} is not on PATH` : `${BIN} ${args.join(' ')} failed`);
  }
}

const samePath = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase();

/** Indexed project name for ROOT, from `list_projects` rows: `<name> <root_path> <branch>`. */
export function findProject(): string | undefined {
  for (const line of cbm('cli', '--quiet', 'list_projects').split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 3) continue;
    if (samePath(cols.slice(1, -1).join(' '), ROOT)) return cols[0];
  }
  return undefined;
}

/** Index ROOT (always when `reindex`, otherwise only if it isn't indexed yet) and return its project name. */
export function ensureProject(reindex = false): string {
  const existing = reindex ? undefined : findProject();
  if (existing) return existing;
  console.log(`… indexing ${ROOT}`);
  cbm('cli', '--quiet', 'index_repository', '--repo-path', ROOT);
  const project = findProject();
  if (!project) throw new Error(`indexing finished but no project matches ${ROOT}`);
  return project;
}
