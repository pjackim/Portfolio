/**
 * Media lint for src/content — run in CI. Exits 1 on any violation; warnings never fail.
 *
 *   npm run check:media [-- --skip-refs]
 *
 * Rules (spec-architecture §5):
 *  - file names are kebab-case .md/.webp/.mp4/.webm (videos may add `.poster`); YouTube
 *    posters are `yt-<id>.webp` (ids keep their case)
 *  - no gif/png/jpg/jpeg anywhere in src/content
 *  - every .mp4 has a sibling .webm and .poster.webp
 *  - references (skipped by --skip-refs): every media file is referenced from its folder's
 *    index.md — by file name; .webm/.poster.webp through their .mp4; yt-<id>.webp through
 *    its id — and every yt-<id>.webp matches a youtube media entry
 *  - size caps: no file > 8 MB, project folder ≤ 15 MB, src/content ≤ 60 MB
 *  - no EXIF/XMP/IPTC metadata in any .webp
 *  - warning only: cover narrower than 1200 px
 */
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { BUDGETS, CONTENT_DIR, PROJECTS_DIR, fileSize, formatBytes } from './lib.ts';

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*(\.poster)?\.(md|webp|mp4|webm)$/;
const YT_POSTER = /^yt-([\w-]{11})\.webp$/;
const FORBIDDEN = /\.(gif|png|jpe?g)$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const { values } = parseArgs({ options: { 'skip-refs': { type: 'boolean', default: false } } });
const skipRefs = values['skip-refs'];

const errors: string[] = [];
const warnings: string[] = [];
const rel = (path: string) => relative(CONTENT_DIR, path);

/** True when `token` occurs in `text` as a whole path segment / word. */
function mentions(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w.-])${escaped}($|[^\\w.-])`).test(text);
}

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((d) => d.isFile() && d.name !== '.DS_Store')
    .map((d) => join(d.parentPath, d.name))
    .sort();
}

async function checkWebpMetadata(path: string): Promise<void> {
  const meta = await sharp(path).metadata();
  const found = (['exif', 'xmp', 'iptc'] as const).filter((k) => meta[k] !== undefined);
  if (found.length > 0)
    errors.push(`${rel(path)}: embedded ${found.join('/').toUpperCase()} metadata`);
}

async function checkProject(slug: string): Promise<void> {
  const dir = join(PROJECTS_DIR, slug);
  if (!SLUG.test(slug)) errors.push(`projects/${slug}: folder name is not kebab-case`);
  const files = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isFile() && d.name !== '.DS_Store')
    .map((d) => d.name);
  const has = new Set(files);

  let total = 0;
  for (const name of files) total += await fileSize(join(dir, name));
  if (total > BUDGETS.project) {
    errors.push(`projects/${slug}: ${formatBytes(total)} exceeds ${formatBytes(BUDGETS.project)}`);
  }

  for (const name of files.filter((f) => f.endsWith('.mp4'))) {
    const base = name.slice(0, -'.mp4'.length);
    for (const sibling of [`${base}.webm`, `${base}.poster.webp`]) {
      if (!has.has(sibling)) errors.push(`projects/${slug}/${name}: missing ${sibling}`);
    }
  }

  const indexPath = join(dir, 'index.md');
  const index = has.has('index.md') ? await readFile(indexPath, 'utf8') : undefined;

  // Cover width (warning only): the `cover:` field of index.md, else cover.webp.
  const coverName = index?.match(/^cover:\s*['"]?\.\/([^'"\s#]+)/m)?.[1] ?? 'cover.webp';
  if (has.has(coverName) && coverName.endsWith('.webp')) {
    const { width = 0 } = await sharp(join(dir, coverName)).metadata();
    if (width < BUDGETS.coverMinWidth) {
      warnings.push(
        `projects/${slug}/${coverName}: cover is ${width}px wide (< ${BUDGETS.coverMinWidth})`,
      );
    }
  }

  if (skipRefs) return;
  const media = files.filter((f) => f !== 'index.md');
  if (index === undefined) {
    if (media.length > 0) errors.push(`projects/${slug}: media present but no index.md`);
    return;
  }
  const youtubeIds = new Set(
    [...index.matchAll(/(?:^|[\s{,])id:\s*['"]?([\w-]{11})['"]?(?=\s*(?:[,}#]|$))/gm)].map(
      (m) => m[1],
    ),
  );
  for (const name of media) {
    const yt = YT_POSTER.exec(name)?.[1];
    if (yt !== undefined) {
      if (!youtubeIds.has(yt)) {
        errors.push(`projects/${slug}/${name}: no youtube media entry with id ${yt} in index.md`);
      }
      continue;
    }
    const videoBase = /^(.*?)(\.poster\.webp|\.webm)$/.exec(name)?.[1];
    const token = videoBase !== undefined ? `${videoBase}.mp4` : name;
    if (!mentions(index, token)) {
      errors.push(`projects/${slug}/${name}: not referenced from index.md (looked for ${token})`);
    }
  }
}

async function main(): Promise<void> {
  const files = await walk(CONTENT_DIR);
  let total = 0;
  for (const path of files) {
    const name = path.slice(path.lastIndexOf('/') + 1);
    const bytes = await fileSize(path);
    total += bytes;
    if (FORBIDDEN.test(name)) {
      errors.push(`${rel(path)}: ${name.split('.').pop()} files are not allowed (npm run media)`);
    } else if (!NAME.test(name) && !YT_POSTER.test(name)) {
      errors.push(`${rel(path)}: name must be kebab-case .md/.webp/.mp4/.webm`);
    }
    if (bytes > BUDGETS.file) {
      errors.push(`${rel(path)}: ${formatBytes(bytes)} exceeds ${formatBytes(BUDGETS.file)}`);
    }
    if (name.endsWith('.webp')) await checkWebpMetadata(path);
  }
  if (total > BUDGETS.total) {
    errors.push(`src/content: ${formatBytes(total)} exceeds ${formatBytes(BUDGETS.total)}`);
  }

  const projects = existsSync(PROJECTS_DIR)
    ? (await readdir(PROJECTS_DIR, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
  for (const slug of projects) await checkProject(slug);

  console.log(
    `check:media — ${projects.length} project folders, ${files.length} files, ` +
      `${formatBytes(total)} total${skipRefs ? ' (reference check skipped)' : ''}`,
  );
  if (warnings.length > 0) {
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ${w}`);
  }
  if (errors.length > 0) {
    console.error(`\n✖ ${errors.length} error(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('\n✔ media OK');
}

await main();
