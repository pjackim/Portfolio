/**
 * Facts about this build for the footer status line (interactions spec §4): the commit it was
 * built from and when that commit was made. The commit is `GITHUB_SHA` on GitHub Actions, else
 * the checkout's HEAD, else `local` (no git, e.g. a source tarball).
 *
 * The instant is the commit's, not the wall clock's, so building the same commit twice gives
 * byte-identical pages (as bc96acf made the page styles): `SOURCE_DATE_EPOCH` when it is set
 * (the reproducible-builds convention), else the committer date of HEAD, and the current time
 * only when there is no git to ask. Read once per build; everything is shown in UTC.
 */
import { execFileSync } from 'node:child_process';

function git(...args: string[]): string | undefined {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Not a git checkout, or git isn't installed.
    return undefined;
  }
}

function commit(): string {
  const fromCi = process.env.GITHUB_SHA?.trim();
  if (fromCi && /^[0-9a-f]{7,40}$/i.test(fromCi)) return fromCi.slice(0, 7).toLowerCase();
  const head = git('rev-parse', '--short=7', 'HEAD');
  return head && /^[0-9a-f]{7,40}$/.test(head) ? head.slice(0, 7) : 'local';
}

function instant(): Date {
  const epoch = process.env.SOURCE_DATE_EPOCH?.trim();
  if (epoch && /^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000);
  const committed = new Date(git('show', '-s', '--format=%cI', 'HEAD') ?? Number.NaN);
  return Number.isNaN(committed.getTime()) ? new Date() : committed;
}

const at = instant();

export interface BuildInfo {
  /** Short commit SHA (7 hex characters), or `local`. */
  sha: string;
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  /** `HH:MM:SS` (UTC). */
  time: string;
  /** The date for people and screen readers, e.g. "September 26, 2026". */
  dateLong: string;
  /** Four-digit year (UTC), for the copyright line. */
  year: number;
}

export const build: BuildInfo = {
  sha: commit(),
  date: at.toISOString().slice(0, 10),
  time: at.toISOString().slice(11, 19),
  dateLong: new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(at),
  year: at.getUTCFullYear(),
};
