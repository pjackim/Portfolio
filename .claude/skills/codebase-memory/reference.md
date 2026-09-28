# codebase-memory-mcp reference (v0.11)

Verified against `codebase-memory-mcp cli <tool> --help`. Re-run that to check flags after an upgrade.

## Tools and key parameters

`project` is required by every tool except `index_repository` and `list_projects`.
Most read tools accept `format="tree"|"json"` and `max_output_tokens` (sizing hint, ~4 bytes/token).

| Tool | Key parameters (defaults) |
|---|---|
| `list_projects` | `detail="identity"\|"stats"`, `limit=50`, `offset` |
| `index_repository` | `repo_path` (absolute, required), `mode="full"\|"moderate"\|"fast"\|"cross-repo-intelligence"`, `name`, `target_projects` (cross-repo), `persistence=false` (writes `.codebase-memory/graph.db.zst`) |
| `index_status` | `verbose`, `diagnostics="none"\|"summary"\|"full"` |
| `check_index_coverage` | `paths=[repo-relative…]`, `scopes=[dirs…]`, `path_limit/scope_limit=20`, `diagnostics` |
| `search_graph` | `name_pattern`, `qn_pattern`, `file_pattern`, `label`, `query` (BM25), `semantic_query=[…]` (not with `query`), `relationship`, `min_degree`, `max_degree`, `exclude_entry_points`, `include_connected`, `limit=50`, `offset`, `semantic_limit=50`, `semantic_offset`, `fields`, `detail="ids"\|"default"` |
| `trace_path` (alias `trace_call_path`) | `function_name`, `direction="both"`, `depth=3` (1-5), `mode="calls"\|"data_flow"\|"cross_service"`, `parameter_name`, `edge_types=[…]`, `risk_labels`, `include_tests=false`, `include_evidence`, `limit=100`, `cursor` |
| `get_code_snippet` | `qualified_name` (qn or unique short name), `source_mode="auto"\|"full"\|"outline"` (auto outlines 200+ line containers), `include_neighbors`, `start_line`, `max_lines`, `member_limit/offset` |
| `get_file_outline` | `file_path` (exact, repo-relative), `labels=[…]`, `limit=100`, `offset` |
| `get_architecture` | `aspects=[…]` of `all, overview, structure, dependencies, routes, languages, packages, entry_points, hotspots, boundaries, layers, file_tree, clusters, cycles` (omitted = languages/packages/entry_points; `cycles` opt-in), `path` (dir prefix) |
| `get_graph_schema` | `diagnostics`, `limit`, `offset` — labels, edge types, properties |
| `query_graph` | `query` (Cypher), `graph="code"\|"missed"` (missed = coverage-gap file tree), `max_rows=200` (≤99998), `cursor`, `offset` |
| `search_code` | `pattern`, `regex=false`, `file_pattern`, `path_filter`, `mode="compact"\|"full"\|"files"`, `context`, `result_limit=10`/`result_offset`, `raw_limit=5`/`raw_offset`, `match_limit=8` — indexed files only |
| `detect_changes` | `scope="impact"\|"files"`, `direction="inbound"`, `depth=2`, `base_branch="main"`, `since`, `changed_cursor`/`impact_cursor`/`module_cursor` |
| `compare_graphs` | `base_project`, `target_project`, `limit=200` — node/edge additions and removals |
| `manage_adr` | `mode="outline"\|"get"\|"update"\|"set_sections"`, `content` (update = whole doc), `section_updates={name: body}` (surgical, idempotent) |
| `ingest_traces` | `traces=[…]` — runtime traces to confirm `HTTP_CALLS` |
| `delete_project` | destructive — only when the user asks |

Paging: follow `has_more` with `next_offset` / `next_cursor`. Cursors are snapshot-bound; keep other args
unchanged (budget/`max_rows` may change).

## Graph model

Labels (varies by language; confirm with `get_graph_schema`): `Project, Package, Folder, File, Module,
Class, Function, Method, Interface, Enum, Type, Variable, Route, Resource, Section, EnvVar`.

Edges: `CALLS, CALL_REFERENCE, USAGE, IMPORTS, DEFINES, DEFINES_METHOD, IMPLEMENTS, INHERITS, OVERRIDE,
HANDLES, HTTP_CALLS, ASYNC_CALLS, EMITS, LISTENS_ON, DATA_FLOWS, USES_TYPE, TESTS, WRITES, CONFIGURES,
REFERENCES_FILE, MEMBER_OF, SIMILAR_TO, SEMANTICALLY_RELATED, FILE_CHANGES_WITH, CONTAINS_FILE,
CONTAINS_FOLDER, CONTAINS_PACKAGE`, plus `CROSS_*` between repos indexed with cross-repo-intelligence.

Common node properties: `name`, `qualified_name`, `file_path`, `label`.
Qualified name: `<project>.<path parts without extension>.<name>`,
e.g. `C-Users-m0rt-projects-Portfolio.src.scripts.theme.toggle`.

## Cypher cookbook (`query_graph`, read-only openCypher subset)

Supported: `MATCH`, `OPTIONAL MATCH`, `WHERE`, `WITH`, `RETURN`, `ORDER BY`, `SKIP`, `LIMIT`, `DISTINCT`,
`UNWIND`, `UNION`, `CASE`, `(n:A|B)`, `[*1..3]`, `=~`, `CONTAINS`, `STARTS WITH`, `IN`, `EXISTS { … }`,
`count/sum/avg/min/max/collect`, string/type functions. Unsupported (errors, never silent): writes,
`MERGE`, `CALL`, parameters, list/map literals, comprehensions, path functions.

```cypher
// Unreferenced functions (then rule out entry points / dynamic dispatch by text search)
MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:CALLS]-() } AND NOT EXISTS { (f)<-[:CALL_REFERENCE]-() }
  AND NOT EXISTS { (f)<-[:USAGE]-() } RETURN f.qualified_name, f.file_path LIMIT 50

// Reference count for every function in one file (0 = candidate unused) — one call instead of N traces
MATCH (f:Function) WHERE f.file_path ENDS WITH 'scripts/theme.ts'
OPTIONAL MATCH (c)-[r:CALLS|CALL_REFERENCE|USAGE]->(f) RETURN f.name, count(c) AS refs ORDER BY refs

// Fan-in hotspots (most-called)
MATCH (c)-[:CALLS]->(f:Function) RETURN f.name, f.file_path, count(c) AS callers ORDER BY callers DESC LIMIT 20

// Fan-out hotspots (calls the most)
MATCH (f:Function)-[:CALLS]->(g) RETURN f.name, f.file_path, count(g) AS callees ORDER BY callees DESC LIMIT 20

// Cross-service HTTP edges
MATCH (a)-[r:HTTP_CALLS]->(b) RETURN a.name, b.name, r.url_path, r.confidence LIMIT 50

// Route → handler
MATCH (h)-[:HANDLES]->(r:Route) RETURN r.name, h.qualified_name

// Near-duplicate code (refactor candidates)
MATCH (a)-[s:SIMILAR_TO]->(b) RETURN a.qualified_name, b.qualified_name, s.score ORDER BY s.score DESC LIMIT 20

// Files that usually change together (hidden coupling)
MATCH (a:File)-[r:FILE_CHANGES_WITH]->(b:File) RETURN a.file_path, b.file_path LIMIT 30

// In-repo modules a file imports (File -[:IMPORTS]-> Module)
MATCH (f:File)-[:IMPORTS]->(m:Module) WHERE f.file_path ENDS WITH 'build.ts' RETURN f.file_path, m.name
```

## Configuration (user-wide, rarely needed)

- `codebase-memory-mcp config list|get|set|reset <key>`: `auto_index` (false), `auto_index_limit` (50000),
  `auto_watch` (true), `watcher_enabled` (true; needs `daemon stop` to apply), `index_max_files`,
  `index_max_source_mb` (off). Exceeding an index limit fails the whole index and keeps the old one.
- Ignore files: `.gitignore` hierarchy + `.cbmignore` (gitignore syntax) in the repo.
- Extra extensions: `.codebase-memory.json` in the repo root → `{"extra_extensions": {".mjs": "javascript"}}`.
- Refused as index roots: drive roots, home dir itself, `C:\Users`, `C:\Windows`, credential dirs.
- Graph UI: `http://127.0.0.1:9749` (served by the shared daemon when enabled).

## Troubleshooting the shared server

Setup on this machine: one `codebase-memory-mcp` stdio process wrapped by `mcp-proxy` (uv tool) and
supervised by `~/.claude/scripts/cbm-http-server.ps1`; every client points at
`http://127.0.0.1:9750/mcp` (Claude user scope in `~/.claude.json`, Codex, Cursor, VS Code). Hooks run the
binary directly: `C:/Users/m0rt/.local/bin/codebase-memory-mcp.exe hook-augment`.

| Symptom | Check / fix |
|---|---|
| `/mcp` shows failed / tools missing | `claude mcp get codebase-memory-mcp`; is port 9750 listening? Start: `powershell -File ~/.claude/scripts/cbm-http-server.ps1` |
| Server up but calls error | `%LOCALAPPDATA%\codebase-memory-mcp-http\supervisor.log`, `proxy.err.log`; daemon log `~/.cache/codebase-memory-mcp/logs/cbm-daemon.log` |
| Need results while the server is down | CLI works standalone: `codebase-memory-mcp cli search_graph --project P --name-pattern '.*X.*'` |
| Conflict / "exact build" errors after an upgrade | All CBM processes must be the same build: restart the supervisor and agent sessions |
