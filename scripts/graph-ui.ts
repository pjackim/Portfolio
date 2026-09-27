/**
 * Open the codebase-memory-mcp graph UI on this checkout's project.
 *
 *   npm run graph               # open the graph (indexes the repo first if it isn't yet)
 *   npm run graph -- --reindex  # re-index before opening
 *
 * Needs `codebase-memory-mcp` on PATH (https://github.com/DeusData/codebase-memory-mcp) with the
 * UI enabled (`codebase-memory-mcp config set ui_enabled true`). The UI is served by a running
 * MCP server; if none is listening, this starts one and keeps it alive until Ctrl+C.
 */
import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

const BIN = 'codebase-memory-mcp';
const ROOT = resolve(import.meta.dirname, '..');

function die(message: string): never {
  console.error(`✖ ${message}\nusage: npm run graph [-- --reindex]`);
  process.exit(1);
}

function cbm(...args: string[]): string {
  try {
    return execFileSync(BIN, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    die(missing ? `${BIN} is not on PATH` : `${BIN} ${args.join(' ')} failed`);
  }
}

const samePath = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase();

/** Indexed project name for ROOT, from `list_projects` rows: `<name> <root_path> <branch>`. */
function findProject(): string | undefined {
  for (const line of cbm('cli', '--quiet', 'list_projects').split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 3) continue;
    if (samePath(cols.slice(1, -1).join(' '), ROOT)) return cols[0];
  }
  return undefined;
}

async function isServing(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    return false;
  }
}

function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== '--reindex');
if (unknown.length > 0) die(`unexpected arguments: ${unknown.join(' ')}`);

if (cbm('config', 'get', 'ui_enabled').trim() !== 'true') {
  die(`the UI is disabled — run: ${BIN} config set ui_enabled true`);
}
const port = cbm('config', 'get', 'ui_port').trim() || '9749';
const base = `http://localhost:${port}/`;

let project = findProject();
if (!project || args.includes('--reindex')) {
  console.log(`… indexing ${ROOT}`);
  cbm('cli', '--quiet', 'index_repository', '--repo-path', ROOT);
  project = findProject() ?? die(`indexing finished but no project matches ${ROOT}`);
}

/** Start an MCP server for its UI; it speaks stdio, so an open stdin pipe keeps it alive. */
async function startServer() {
  const child = spawn(BIN, [], { stdio: ['pipe', 'ignore', 'ignore'] });
  child.on('error', (error) => die(`could not start ${BIN}: ${error.message}`));
  const deadline = Date.now() + 15_000;
  while (!(await isServing(base))) {
    if (Date.now() > deadline) die(`UI did not come up on ${base}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  return child;
}

const server = (await isServing(base)) ? undefined : await startServer();

const url = `${base}?${new URLSearchParams({ tab: 'graph', project })}`;
openBrowser(url);
console.log(`✓ ${url}`);

if (server) {
  console.log('  serving the UI — Ctrl+C to stop');
  process.on('SIGINT', () => {
    server.kill();
    process.exit(0);
  });
}
