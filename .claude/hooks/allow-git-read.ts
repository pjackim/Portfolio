/**
 * PreToolUse hook (Bash) for the read-only agents (fact-checker, convention-guard): allows a
 * command only when every segment of it is a read — `git show/log/diff/…`, the usual text
 * filters, and unpacking a legacy tree into `.cache/`. Anything else exits 2, which blocks the
 * call and hands the reason back to the agent.
 *
 *   node .claude/hooks/allow-git-read.ts   (stdin: the hook's JSON payload)
 *
 * Runs on Node's native type-stripping: erasable syntax only.
 */
import { readFileSync } from 'node:fs';

const GIT_READ =
  /^git\s+(?:(?:-C\s+\S+|--no-pager)\s+)*(?:show|log|diff|archive|ls-tree|ls-files|cat-file|grep|blame|rev-parse|status)\b/;
const FILTERS = /^(?:cat|head|tail|grep|rg|wc|ls|sort|uniq|cut|tr|nl|file|jq)\b/;
const SED_PRINT = /^sed\s+-n\b(?!.*\s-i)/;
const CACHE_ONLY = /^(?:tar\s+-?x\S*\s+(?:\S+\s+)*-C\s+\.cache\/|mkdir\s+-p\s+\.cache\/)/;

/** `2>/dev/null` and `2>&1` are the only redirections a read needs. */
const SAFE_REDIRECT = /\s2>(?:\/dev\/null|&1)/g;

function block(reason: string): never {
  process.stderr.write(`Blocked by allow-git-read: ${reason}\n`);
  process.exit(2);
}

const payload = JSON.parse(readFileSync(0, 'utf8')) as { tool_input?: { command?: string } };
const command = payload.tool_input?.command?.trim() ?? '';
if (!command) process.exit(0);

const bare = command.replace(SAFE_REDIRECT, '');
if (/[`]|\$\(|>|<\(/.test(bare)) {
  block('command substitution and output redirection are not allowed; this agent is read-only.');
}

for (const segment of bare.split(/&&|\|\||;|\|/).map((part) => part.trim())) {
  if (!segment) continue;
  const allowed = [GIT_READ, FILTERS, SED_PRINT, CACHE_ONLY].some((rule) => rule.test(segment));
  if (!allowed) {
    block(
      `"${segment}" is not a read. Allowed: git show/log/diff/archive/ls-tree/ls-files/cat-file/` +
        'grep/blame/status, text filters (cat, head, tail, grep, rg, sed -n, wc, …), and ' +
        'unpacking into .cache/. Use the Read/Grep/Glob tools for everything else.',
    );
  }
}
