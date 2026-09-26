/**
 * Facts about this build, read once at build time for the footer status line (interactions spec
 * §4): the commit it was built from and when. The commit is `GITHUB_SHA` on GitHub Actions, else
 * the checkout's HEAD, else `local` (no git, e.g. a source tarball). Times are UTC.
 */
import { execFileSync } from 'node:child_process';

function commit(): string {
  const fromCi = process.env.GITHUB_SHA?.trim();
  if (fromCi && /^[0-9a-f]{7,40}$/i.test(fromCi)) return fromCi.slice(0, 7).toLowerCase();
  try {
    const head = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^[0-9a-f]{7,40}$/.test(head)) return head.slice(0, 7);
  } catch {
    // Not a git checkout, or git isn't installed.
  }
  return 'local';
}

const builtAt = new Date();

export interface BuildInfo {
  /** Short commit SHA (7 hex characters), or `local`. */
  sha: string;
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  /** `HH:MM:SS` (UTC). */
  time: string;
  /** The date for people and screen readers, e.g. "September 26, 2026". */
  dateLong: string;
}

export const build: BuildInfo = {
  sha: commit(),
  date: builtAt.toISOString().slice(0, 10),
  time: builtAt.toISOString().slice(11, 19),
  dateLong: new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
    builtAt,
  ),
};
