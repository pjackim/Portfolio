/**
 * Thin wrapper around `codebase-memory-mcp cli` that fills in the defaults every call on this
 * checkout needs — `--quiet` and `--project <this repo's indexed name>` — so agents/humans can
 * call tools without first looking either up. Cross-platform: it's plain Node, so it runs the
 * same under PowerShell on Windows and bash on Linux/macOS.
 *
 *   node scripts/cbm-cli.ts <tool_name> [--flag value ...] [--json]
 *   npm run cbm -- <tool_name> [--flag value ...] [--json]
 *
 * Examples:
 *   node scripts/cbm-cli.ts search_graph --label Function --name-pattern '.*Handler.*'
 *   node scripts/cbm-cli.ts trace_path --function-name apply --direction both --json
 *   node scripts/cbm-cli.ts list_projects --json | jq '.projects[].name'
 *
 * See docs/codebase/codebase-cli.md for per-tool flags and output examples. If this exits with
 * "no indexed project found", index the checkout first: `npm run graph` (or `-- --reindex`).
 */
import { spawnSync } from 'node:child_process';
import { BIN, findProject } from './cbm.ts';

/** Tools with no `--project` flag, per `codebase-memory-mcp cli <tool> --help`. */
const NO_PROJECT_TOOLS = new Set(['list_projects', 'index_repository', 'compare_graphs']);

function die(message: string): never {
  console.error(
    `✖ ${message}\nusage: node scripts/cbm-cli.ts <tool_name> [--flag value ...] [--json]`,
  );
  process.exit(1);
}

const [tool, ...rest] = process.argv.slice(2);
if (!tool) die('missing <tool_name>');

const needsProject = !NO_PROJECT_TOOLS.has(tool) && !rest.includes('--project');
const project = needsProject ? findProject() : undefined;
if (needsProject && !project)
  die(`no indexed project found for this checkout — run \`npm run graph\` first`);

const args = ['cli'];
if (!rest.includes('--verbose') && !rest.includes('--progress')) args.push('--quiet');
args.push(tool);
if (project) args.push('--project', project);
args.push(...rest);

const result = spawnSync(BIN, args, { stdio: 'inherit' });
if (result.error) {
  die(
    (result.error as NodeJS.ErrnoException).code === 'ENOENT'
      ? `${BIN} is not on PATH`
      : result.error.message,
  );
}
process.exit(result.status ?? 1);
