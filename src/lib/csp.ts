/**
 * Content-Security-Policy helpers (spec-architecture §6). Astro's `security.csp` hashes the
 * scripts and styles it bundles or inlines itself; anything we inline by hand (the theme
 * bootstrap, JSON-LD, the page style block) is hashed here and added to the page's policy with
 * `Astro.csp.insertScriptHash()` / `insertStyleHash()`. SHA-256 matches Astro's default
 * `security.csp.algorithm`.
 */
import { createHash } from 'node:crypto';

/** CSP hash source (without quotes) for an inline element whose text content is `content`. */
export function cspHash(content: string): `sha256-${string}` {
  return `sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}`;
}
