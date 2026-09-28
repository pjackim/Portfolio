/**
 * Thin wrapper around `codebase-memory-mcp cli` that fills in the defaults every call on this
 * checkout needs — `--quiet` and `--project <this repo's indexed name>` (or `--repo-path` for
 * `index_repository`) — plus short aliases and positional shortcuts for the tools used most.
 * Cross-platform: it's plain Node, so it runs the same under PowerShell on Windows and bash on
 * Linux/macOS.
 *
 *   bun run cbm <tool> [positional] [--flag value ...] [--json]
 *   npm run cbm -- <tool> [positional] [--flag value ...] [--json]
 *   bun run cbm help                    this help
 *   bun run cbm help <tool>             that tool's flag help
 *   bun run cbm <tool> --help           same, direct
 *
 * Run `bun run cbm help` (or with no args) for the full usage, alias, and example list.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ARCHITECTURE_ASPECTS, BIN, ROOT, findProject } from './cbm.ts';

const TOOLS = [
  'index_repository',
  'search_graph',
  'query_graph',
  'trace_path',
  'get_code_snippet',
  'get_file_outline',
  'get_graph_schema',
  'compare_graphs',
  'get_architecture',
  'search_code',
  'list_projects',
  'delete_project',
  'index_status',
  'check_index_coverage',
  'detect_changes',
  'manage_adr',
  'ingest_traces',
] as const;
type Tool = (typeof TOOLS)[number];

const ALIASES: Record<string, Tool> = {
  list: 'list_projects',
  search: 'search_graph',
  query: 'query_graph',
};

/** Tools that take no scope flag at all — everything else gets `--project`. */
const NO_SCOPE_TOOLS = new Set<Tool>(['list_projects', 'compare_graphs']);
/** Tools scoped by `--repo-path` instead of `--project`. */
const REPO_PATH_TOOLS = new Set<Tool>(['index_repository']);
/** Destructive tools: `--project` is never injected, so they can't hit the live index by accident. */
const EXPLICIT_PROJECT_TOOLS = new Set<Tool>(['delete_project']);

const ADR_MODES = ['outline', 'get', 'update', 'set_sections', 'sections'] as const;
const INDEX_MODES = ['full', 'moderate', 'fast', 'cross-repo-intelligence'] as const;

/** Validator factory: dies unless `value` is one of `allowed`. */
function oneOf(tool: string, flag: string, allowed: readonly string[]) {
  return (value: string): void => {
    if (!allowed.includes(value))
      die(`${tool}: ${flag} must be one of ${allowed.join(', ')} (got ${JSON.stringify(value)})`);
  };
}

function assertAspect(value: string): void {
  const allowed = ['all', ...ARCHITECTURE_ASPECTS];
  if (!allowed.includes(value))
    die(`get_architecture: unknown aspect ${JSON.stringify(value)} — valid: ${allowed.join(', ')}`);
}

type PositionalRule = { flag: string; repeatable?: boolean; validate?: (value: string) => void };

/** Leading non-flag args right after the tool map onto its primary flag — one line per tool. */
const POSITIONALS: Partial<Record<Tool, PositionalRule>> = {
  get_architecture: { flag: '--aspects', repeatable: true, validate: assertAspect },
  manage_adr: { flag: '--mode', validate: oneOf('manage_adr', '--mode', ADR_MODES) },
  index_repository: { flag: '--mode', validate: oneOf('index_repository', '--mode', INDEX_MODES) },
  trace_path: { flag: '--function-name' },
  query_graph: { flag: '--query' },
  search_code: { flag: '--pattern' },
  get_code_snippet: { flag: '--qualified-name' },
  get_file_outline: { flag: '--file-path' },
};

function die(message: string): never {
  console.error(`✖ ${message}\nrun \`bun run cbm help\` for usage.`);
  process.exit(1);
}

/** The CLI accepts both `--flag value` and `--flag=value`. */
function hasFlag(rest: string[], flag: string): boolean {
  return rest.some((token) => token === flag || token.startsWith(`${flag}=`));
}

function flagValue(rest: string[], flag: string): string | undefined {
  const index = rest.indexOf(flag);
  if (index !== -1) return rest[index + 1];
  return rest.find((token) => token.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

function resolveTool(input: string): Tool {
  const resolved = ALIASES[input] ?? input;
  if ((TOOLS as readonly string[]).includes(resolved)) return resolved as Tool;
  die(`unknown tool: ${input}`);
}

/** Maps leading positional tokens (before the first `--flag`) onto the tool's mapped flag. */
function mapPositionals(tool: Tool, rest: string[]): string[] {
  const boundary = rest.findIndex((token) => token.startsWith('-'));
  const positionals = boundary === -1 ? rest : rest.slice(0, boundary);
  const flags = boundary === -1 ? [] : rest.slice(boundary);
  if (positionals.length === 0) return rest;

  const rule = POSITIONALS[tool];
  if (!rule)
    die(
      `${tool} takes no positional arguments — use --flag value (see \`bun run cbm help ${tool}\`)`,
    );
  if (hasFlag(flags, rule.flag)) die(`${tool}: ${rule.flag} given twice (positional and flag)`);
  if (!rule.repeatable && positionals.length > 1)
    die(`${tool} takes a single positional value for ${rule.flag}, got: ${positionals.join(' ')}`);

  const mapped: string[] = [];
  if (rule.repeatable) {
    for (const token of positionals)
      for (const value of token.split(',').filter(Boolean)) {
        rule.validate?.(value);
        mapped.push(rule.flag, value);
      }
  } else {
    const value = positionals[0]!;
    rule.validate?.(value);
    mapped.push(rule.flag, value);
  }
  return [...mapped, ...flags];
}

/** `--project`/`--repo-path`, skipped when the caller already passed it. */
function computeScope(tool: Tool, rest: string[]): string[] {
  if (NO_SCOPE_TOOLS.has(tool)) return [];
  if (REPO_PATH_TOOLS.has(tool)) return hasFlag(rest, '--repo-path') ? [] : ['--repo-path', ROOT];
  if (hasFlag(rest, '--project')) return [];
  if (EXPLICIT_PROJECT_TOOLS.has(tool))
    die(`${tool} needs an explicit --project <name> (never injected, to protect the live index)`);
  const project = findProject();
  if (!project)
    die(
      'repo not indexed yet — run `bun run cbm index_repository` ' +
        '(worktrees are separate projects and need their own index)',
    );
  return ['--project', project];
}

/** Rejects an accidental empty/incomplete ADR write; resolves `--content-file` into `--content`. */
function guardManageAdr(rest: string[]): string[] {
  const mode = flagValue(rest, '--mode') ?? 'outline';

  const fileIndex = rest.findIndex(
    (token) => token === '--content-file' || token.startsWith('--content-file='),
  );
  let out = rest;
  if (fileIndex !== -1) {
    const path = flagValue(rest, '--content-file');
    if (!path) die('--content-file requires a path');
    if (hasFlag(rest, '--content')) die('manage_adr: pass --content or --content-file, not both');
    let content: string;
    try {
      content = readFileSync(path, 'utf8');
    } catch (error) {
      die(`--content-file: cannot read ${path} (${(error as NodeJS.ErrnoException).code})`);
    }
    const consumed = rest[fileIndex] === '--content-file' ? 2 : 1;
    out = [...rest.slice(0, fileIndex), '--content', content, ...rest.slice(fileIndex + consumed)];
  }

  if (mode === 'update' && !hasFlag(out, '--content'))
    die("manage_adr --mode update requires --content '<string>' or --content-file <path>");
  if (mode === 'set_sections' && !hasFlag(out, '--section-updates'))
    die("manage_adr --mode set_sections requires --section-updates '<object>'");
  return out;
}

/** `bin + args`, quoted for a human to read/re-run (POSIX-ish; good enough for --dry-run). */
function quoteForDisplay(value: string): string {
  return /^[\w./:=@,-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

function run(cmd: string[]): never {
  const result = spawnSync(BIN, cmd, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.error) {
    die(
      (result.error as NodeJS.ErrnoException).code === 'ENOENT'
        ? `${BIN} not found on PATH (set CBM_BIN to its full path)`
        : result.error.message,
    );
  }
  process.exit(result.status ?? 1);
}

function wrapperHelp(): string {
  const aliases = Object.entries(ALIASES)
    .map(([alias, tool]) => `${alias}->${tool}`)
    .join(', ');
  const positionals = TOOLS.filter((tool) => POSITIONALS[tool])
    .map(
      (tool) => `${tool} <${POSITIONALS[tool]!.flag}${POSITIONALS[tool]!.repeatable ? '...' : ''}>`,
    )
    .join(', ');
  return `Run codebase-memory-mcp CLI tools against this checkout's indexed project.

Usage:
  bun run cbm <tool> [positional] [--flag value ...] [--json]
  npm run cbm -- <tool> [positional] [--flag value ...] [--json]
  bun run cbm help [<tool>]        that tool's flag help (or this text, with none)
  bun run cbm <tool> --help        same, direct — works even if the repo isn't indexed

Tools: ${TOOLS.join(', ')}
Aliases: ${aliases}
Positional shortcuts (leading args before the first --flag): ${positionals}

Scope is injected automatically and skipped if you pass it yourself:
  most tools                     -> --project <this checkout's indexed name>
  index_repository               -> --repo-path <this checkout's root>
  list_projects, compare_graphs  -> nothing
  delete_project                 -> nothing; pass --project <name> yourself

--dry-run   print the resolved command instead of running it
CBM_BIN     override the codebase-memory-mcp binary (default: whatever's on PATH)

get_architecture aspects: all, ${ARCHITECTURE_ASPECTS.join(', ')}
manage_adr modes: ${ADR_MODES.join(', ')}
  (update needs --content <str> or --content-file <path>; set_sections needs --section-updates)
index_repository modes: ${INDEX_MODES.join(', ')}

Examples:
  bun run cbm search_graph --label Function --limit 5
  bun run cbm search --name-pattern '.*Handler.*'
  bun run cbm trace_path withBase
  bun run cbm query 'MATCH (f:Function) RETURN f.name LIMIT 5'
  bun run cbm get_architecture overview,routes
  bun run cbm manage_adr update --content-file notes.md
  bun run cbm index_repository fast --dry-run
  bun run cbm search_graph --help`;
}

const argv = process.argv.slice(2);

if (argv.length === 0) {
  console.error(wrapperHelp());
  process.exit(1);
}

const [first, ...afterFirst] = argv as [string, ...string[]];

if (first === '--help' || first === '-h') {
  console.log(wrapperHelp());
  process.exit(0);
}

if (first === 'help') {
  if (afterFirst.length === 0) {
    console.log(wrapperHelp());
    process.exit(0);
  }
  run(['cli', resolveTool(afterFirst[0]!), '--help']);
}

const tool = resolveTool(first);
const dryRun = afterFirst.includes('--dry-run');
let rest = afterFirst.filter((a) => a !== '--dry-run');

// `<tool> --help`/`-h` bypass mapping/scope/guard entirely so it works on an unindexed repo too.
if (rest.includes('--help') || rest.includes('-h')) run(['cli', tool, ...rest]);

rest = mapPositionals(tool, rest);
if (tool === 'manage_adr') rest = guardManageAdr(rest);

const scope = computeScope(tool, rest);
const args = [
  'cli',
  ...(hasFlag(rest, '--verbose') || hasFlag(rest, '--progress') ? [] : ['--quiet']),
];
const cmd = [...args, tool, ...scope, ...rest];

if (dryRun) {
  console.log([BIN, ...cmd].map(quoteForDisplay).join(' '));
  process.exit(0);
}
run(cmd);
