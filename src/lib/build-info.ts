/**
 * The build's year, for the footer's copyright line. It is the year of the commit being built,
 * not of the wall clock, so building the same commit twice gives byte-identical pages (as
 * bc96acf made the page styles): `SOURCE_DATE_EPOCH` when it is set (the reproducible-builds
 * convention), else the committer date of HEAD, and the current time only when there is no git
 * to ask (e.g. a source tarball). Read once per build, in UTC.
 */
import { execFileSync } from 'node:child_process';

function committed(): Date | undefined {
  try {
    const date = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const at = new Date(date);
    return Number.isNaN(at.getTime()) ? undefined : at;
  } catch {
    // Not a git checkout, or git isn't installed.
    return undefined;
  }
}

function instant(): Date {
  const epoch = process.env.SOURCE_DATE_EPOCH?.trim();
  if (epoch && /^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000);
  return committed() ?? new Date();
}

/** Four-digit year (UTC) of the commit being built. */
export const buildYear: number = instant().getUTCFullYear();
