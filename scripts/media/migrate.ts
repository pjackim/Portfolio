/**
 * One-shot, idempotent migration of the legacy site's media (frozen at commit d8782d1)
 * into src/content/projects/<slug>/ as WebP / MP4 / WebM.
 *
 *   npm run media:migrate [-- --only <slug>] [-- --force]
 *
 * 1. `git archive d8782d1 Images | tar -x -C .cache/legacy` (skipped once extracted)
 * 2. encode every entry of legacy-manifest.json into .cache/out/<slug>/ (skipped when the
 *    cached output was produced from the identical manifest entry, unless --force)
 * 3. copy the outputs into src/content/projects/<slug>/
 * 4. write .cache/media-yaml/<slug>.yml — a frontmatter fragment (cover + media) for index.md
 * 5. print a size table and enforce the per-file / per-project / total caps
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BUDGETS,
  BudgetError,
  CACHE_DIR,
  CONTENT_DIR,
  PROJECTS_DIR,
  ROOT,
  PROJECT_FIT_LADDER,
  type Codec,
  type Crop,
  type EncodeImageResult,
  type EncodeVideoResult,
  type MediaItem,
  type VideoMode,
  describeStep,
  encodeImage,
  encodeVideo,
  encodeVideoStep,
  extractPoster,
  fetchYouTubePoster,
  fileSize,
  formatBytes,
  mediaYaml,
  nextStep,
} from './lib.ts';

const LEGACY_COMMIT = 'd8782d1';
const LEGACY_DIR = join(CACHE_DIR, 'legacy');
const OUT_DIR = join(CACHE_DIR, 'out');
const YAML_DIR = join(CACHE_DIR, 'media-yaml');
const MANIFEST = join(import.meta.dirname, 'legacy-manifest.json');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* ─────────────────────────── manifest ─────────────────────────── */

interface ImageEntry {
  kind: 'image';
  src: string;
  project: string;
  name: string;
  lossless?: boolean;
  cover?: true;
  crop?: Crop;
}
interface VideoEntry {
  kind: 'video';
  src: string;
  project: string;
  name: string;
  mode: VideoMode;
  speed?: number;
}
interface YouTubeEntry {
  kind: 'youtube';
  youtube: string;
  project: string;
  cover?: true;
}
type Entry = ImageEntry | VideoEntry | YouTubeEntry;

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function parseManifest(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) fail('legacy-manifest.json must be an array');
  const entries = raw.map((value: unknown, i): Entry => {
    const e = value as Record<string, unknown>;
    const where = `manifest[${i}]`;
    if (typeof e.project !== 'string' || !KEBAB.test(e.project)) fail(`${where}: bad project`);
    if (typeof e.youtube === 'string') {
      if (!/^[\w-]{11}$/.test(e.youtube)) fail(`${where}: bad youtube id`);
      return { kind: 'youtube', youtube: e.youtube, project: e.project, ...coverFlag(e) };
    }
    if (typeof e.src !== 'string' || !e.src.startsWith('Images/')) fail(`${where}: bad src`);
    if (typeof e.name !== 'string' || !KEBAB.test(e.name)) fail(`${where}: bad name`);
    if (e.kind === 'image') {
      const entry: ImageEntry = { kind: 'image', src: e.src, project: e.project, name: e.name };
      if (e.lossless === true) entry.lossless = true;
      if (e.cover === true) entry.cover = true;
      if (e.crop !== undefined) entry.crop = parseCrop(e.crop, where);
      if (entry.cover && entry.name !== 'cover') {
        fail(`${where}: cover images must be named "cover"`);
      }
      return entry;
    }
    if (e.kind === 'video') {
      const mode = e.mode ?? 'loop';
      if (mode !== 'loop' && mode !== 'click') fail(`${where}: mode must be loop|click`);
      const entry: VideoEntry = {
        kind: 'video',
        src: e.src,
        project: e.project,
        name: e.name,
        mode,
      };
      if (typeof e.speed === 'number') entry.speed = e.speed;
      return entry;
    }
    return fail(`${where}: kind must be image|video (or a youtube entry)`);
  });

  const covers = new Map<string, number>();
  const outputs = new Set<string>();
  for (const e of entries) {
    if (e.kind !== 'video' && e.cover) covers.set(e.project, (covers.get(e.project) ?? 0) + 1);
    for (const file of outputFiles(e)) {
      const key = `${e.project}/${file}`;
      if (outputs.has(key)) fail(`duplicate output ${key}`);
      outputs.add(key);
    }
  }
  for (const project of new Set(entries.map((e) => e.project))) {
    if (covers.get(project) !== 1) fail(`${project}: needs exactly one cover entry`);
  }
  return entries;
}

function parseCrop(value: unknown, where: string): Crop {
  const c = value as Partial<Record<keyof Crop, unknown>>;
  const ok = (n: unknown, min: number) => Number.isInteger(n) && (n as number) >= min;
  if (!ok(c.left, 0) || !ok(c.top, 0) || !ok(c.width, 1) || !ok(c.height, 1)) {
    fail(`${where}: crop needs integer left, top, width, height`);
  }
  return { left: c.left, top: c.top, width: c.width, height: c.height } as Crop;
}

function coverFlag(e: Record<string, unknown>): { cover?: true } {
  return e.cover === true ? { cover: true } : {};
}

function outputFiles(e: Entry): string[] {
  switch (e.kind) {
    case 'image':
      return [`${e.name}.webp`];
    case 'video':
      return [`${e.name}.mp4`, `${e.name}.webm`, `${e.name}.poster.webp`];
    case 'youtube':
      return [`yt-${e.youtube}.webp`, ...(e.cover ? ['cover.webp'] : [])];
  }
}

function describe(e: Entry): string {
  return e.kind === 'youtube' ? `YouTube ${e.youtube}` : e.src;
}

/* ─────────────────────────── legacy extraction ─────────────────────────── */

async function extractLegacy(): Promise<void> {
  const marker = join(LEGACY_DIR, `.extracted-${LEGACY_COMMIT}`);
  if (existsSync(marker)) {
    console.log(`• legacy Images already extracted (.cache/legacy, ${LEGACY_COMMIT})`);
    return;
  }
  console.log(`• git archive ${LEGACY_COMMIT} Images | tar -x -C .cache/legacy`);
  await mkdir(LEGACY_DIR, { recursive: true });
  await new Promise<void>((resolveDone, reject) => {
    const git = spawn('git', ['archive', LEGACY_COMMIT, 'Images'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const tar = spawn('tar', ['-x', '-C', LEGACY_DIR], { stdio: ['pipe', 'inherit', 'inherit'] });
    git.stdout.pipe(tar.stdin);
    let pending = 2;
    const onClose = (name: string) => (code: number | null) => {
      if (code !== 0) reject(new Error(`${name} exited with code ${code}`));
      else if (--pending === 0) resolveDone();
    };
    git.on('error', reject);
    tar.on('error', reject);
    git.on('close', onClose('git archive'));
    tar.on('close', onClose('tar'));
  });
  await writeFile(marker, `${new Date().toISOString()}\n`);
}

/* ─────────────────────────── encoding ─────────────────────────── */

type Outcome =
  | { kind: 'image'; result: EncodeImageResult }
  | {
      kind: 'video';
      result: EncodeVideoResult;
      /** The loop missed its budget after full escalation and was re-encoded click-to-play. */
      switchedFromLoop: boolean;
      /** Squeezed past its own budget ladder so the project folder fits BUDGETS.project. */
      projectFit: boolean;
    }
  | { kind: 'youtube'; result: { bytes: number; width: number; height: number; source: string } };

interface EntryRecord {
  entry: Entry;
  outcome: Outcome;
}

async function encodeEntry(e: Entry, outDir: string): Promise<Outcome> {
  switch (e.kind) {
    case 'image': {
      const result = await encodeImage(join(LEGACY_DIR, e.src), join(outDir, `${e.name}.webp`), {
        lossless: e.lossless ?? false,
        crop: e.crop,
      });
      return { kind: 'image', result };
    }
    case 'youtube': {
      const poster = join(outDir, `yt-${e.youtube}.webp`);
      const result = await fetchYouTubePoster(e.youtube, poster);
      if (e.cover) await copyFile(poster, join(outDir, 'cover.webp'));
      return { kind: 'youtube', result };
    }
    case 'video': {
      const input = join(LEGACY_DIR, e.src);
      const outBase = join(outDir, e.name);
      const log = (m: string) => console.log(m);
      try {
        const result = await encodeVideo(input, outBase, { mode: e.mode, speed: e.speed, log });
        return { kind: 'video', result, switchedFromLoop: false, projectFit: false };
      } catch (error) {
        if (!(error instanceof BudgetError) || e.mode !== 'loop') throw error;
        console.log(`    ⚠ ${error.message} — switching ${e.name} to click-to-play`);
        const result = await encodeVideo(input, outBase, { mode: 'click', speed: e.speed, log });
        return { kind: 'video', result, switchedFromLoop: true, projectFit: false };
      }
    }
  }
}

function sidecarPath(e: Entry): string {
  return join(OUT_DIR, e.project, `.${e.kind === 'youtube' ? `yt-${e.youtube}` : e.name}.json`);
}

async function saveRecord(record: EntryRecord): Promise<void> {
  await writeFile(sidecarPath(record.entry), `${JSON.stringify(record, null, 2)}\n`);
}

async function processEntry(e: Entry, force: boolean): Promise<EntryRecord> {
  const outDir = join(OUT_DIR, e.project);
  const sidecar = sidecarPath(e);
  const files = outputFiles(e);

  if (!force && existsSync(sidecar) && files.every((f) => existsSync(join(outDir, f)))) {
    const cached = JSON.parse(await readFile(sidecar, 'utf8')) as EntryRecord;
    if (JSON.stringify(cached.entry) === JSON.stringify(e)) {
      console.log(`  = ${e.project}/${files[0]} (cached)`);
      return cached;
    }
  }
  console.log(`  → ${e.project}/${files[0]}  ←  ${describe(e)}`);
  await mkdir(outDir, { recursive: true });
  const record: EntryRecord = { entry: e, outcome: await encodeEntry(e, outDir) };
  await saveRecord(record);
  return record;
}

async function outputBytes(records: readonly EntryRecord[]): Promise<number> {
  let total = 0;
  for (const { entry } of records) {
    for (const file of outputFiles(entry)) {
      total += await fileSize(join(OUT_DIR, entry.project, file));
    }
  }
  return total;
}

/**
 * Enforce BUDGETS.project for one project: while the folder is too big, take the largest
 * click-to-play .mp4/.webm and re-encode it one step further along PROJECT_FIT_LADDER
 * (the spec ladder plus a final MAXW 720 step). Loops are never touched — they already sit
 * inside their tighter budgets and play automatically, so their quality matters most.
 */
async function fitProject(project: string, records: readonly EntryRecord[]): Promise<void> {
  let total = await outputBytes(records);
  if (total <= BUDGETS.project) return;
  console.log(
    `  ⚠ ${project}: ${formatBytes(total)} > ${formatBytes(BUDGETS.project)} — ` +
      'squeezing click-to-play videos to fit the project budget',
  );
  while (total > BUDGETS.project) {
    let pick: { record: EntryRecord; codec: Codec; step: number; bytes: number } | undefined;
    for (const record of records) {
      const { outcome } = record;
      if (outcome.kind !== 'video' || outcome.result.mode !== 'click') continue;
      for (const codec of ['mp4', 'webm'] as const) {
        const c = outcome.result[codec];
        const step = nextStep(PROJECT_FIT_LADDER, codec, c.step, c, outcome.result.sourceWidth);
        if (step !== undefined && (!pick || c.bytes > pick.bytes)) {
          pick = { record, codec, step, bytes: c.bytes };
        }
      }
    }
    if (!pick) {
      console.log(`  ✖ ${project}: every click-to-play video is fully squeezed`);
      return;
    }
    const { record, codec, step } = pick;
    const { entry, outcome } = record;
    if (entry.kind !== 'video' || outcome.kind !== 'video') return;
    const input = join(LEGACY_DIR, entry.src);
    const outBase = join(OUT_DIR, project, entry.name);
    const video = outcome.result;
    const previous = video[codec];
    const next = await encodeVideoStep(
      input,
      `${outBase}.${codec}`,
      codec,
      PROJECT_FIT_LADDER,
      step,
      video,
      previous.budget,
    );
    console.log(`${describeStep(codec, next)}  [${entry.name}, project fit]`);
    video[codec] = next;
    if (codec === 'mp4' && next.width !== previous.width) {
      video.poster = await extractPoster(input, `${outBase}.poster.webp`, video, next.maxWidth);
    }
    outcome.projectFit = true;
    await saveRecord(record);
    total = await outputBytes(records);
  }
  console.log(`  ✔ ${project}: ${formatBytes(total)} after squeezing`);
}

/* ─────────────────────────── outputs ─────────────────────────── */

async function publish(records: readonly EntryRecord[]): Promise<void> {
  for (const { entry } of records) {
    const dest = join(PROJECTS_DIR, entry.project);
    await mkdir(dest, { recursive: true });
    for (const file of outputFiles(entry)) {
      await copyFile(join(OUT_DIR, entry.project, file), join(dest, file));
    }
  }
}

async function writeYaml(project: string, records: readonly EntryRecord[]): Promise<string> {
  const cover = records.find(({ entry }) => entry.kind !== 'video' && entry.cover);
  if (!cover) throw new Error(`${project}: no cover`);
  const coverNote =
    cover.entry.kind === 'youtube'
      ? `YouTube poster ${cover.entry.youtube}`
      : describe(cover.entry);

  const items: MediaItem[] = [];
  for (const { entry, outcome } of records) {
    if (entry.kind === 'image') {
      if (!entry.cover) items.push({ kind: 'image', file: `${entry.name}.webp`, note: entry.src });
    } else if (entry.kind === 'youtube') {
      items.push({ kind: 'youtube', id: entry.youtube });
    } else if (outcome.kind === 'video') {
      const click = outcome.result.mode === 'click';
      const extras = [
        click ? 'click-to-play' : 'loop',
        entry.speed ? `${entry.speed}× speed` : '',
        outcome.switchedFromLoop ? 'switched from loop: over budget' : '',
        outcome.projectFit ? 'squeezed to fit the project budget' : '',
      ].filter(Boolean);
      items.push({
        kind: 'video',
        file: `${entry.name}.mp4`,
        autoplay: !click,
        note: `${entry.src} (${extras.join(', ')})`,
      });
    }
  }

  const yaml = [
    `# ${project} — generated by scripts/media/migrate.ts from scripts/media/legacy-manifest.json.`,
    `# Paste into src/content/projects/${project}/index.md frontmatter; replace every TODO.`,
    `cover: ./cover.webp # ${coverNote}`,
    'coverAlt: "TODO"',
    mediaYaml(items),
  ].join('\n');
  await mkdir(YAML_DIR, { recursive: true });
  const path = join(YAML_DIR, `${project}.yml`);
  await writeFile(path, yaml);
  return path;
}

function detail(project: string, file: string, records: readonly EntryRecord[]): string {
  for (const { entry, outcome } of records) {
    if (entry.project !== project || !outputFiles(entry).includes(file)) continue;
    if (outcome.kind === 'image') {
      const r = outcome.result;
      return `${r.width}×${r.height} ${r.encoding}${entry.kind === 'image' && entry.crop ? ' (cropped)' : ''}`;
    }
    if (outcome.kind === 'youtube') {
      const r = outcome.result;
      return `${r.width}×${r.height} q90 (${r.source}${file === 'cover.webp' ? ', cover copy' : ''})`;
    }
    const r = outcome.result;
    if (file.endsWith('.poster.webp')) return `${r.poster.width}×${r.poster.height} q90 poster`;
    const c = file.endsWith('.mp4') ? r.mp4 : r.webm;
    const notes = [
      outcome.switchedFromLoop ? 'switched from loop' : '',
      outcome.projectFit ? 'project fit' : '',
    ].filter(Boolean);
    return (
      `${c.width}×${c.height} ${r.fps}fps ${r.duration.toFixed(1)}s` +
      `${r.speed !== 1 ? ` (${r.speed}×)` : ''} ${r.mode} crf ${c.crf}` +
      ` (budget ${formatBytes(c.budget)})${notes.length ? ` ← ${notes.join(', ')}` : ''}`
    );
  }
  return '';
}

async function dirFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name));
}

async function sizeTable(
  projects: readonly string[],
  records: readonly EntryRecord[],
): Promise<number> {
  let errors = 0;
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`\n${pad('file', 52)}${'size'.padStart(10)}  detail`);
  console.log('─'.repeat(120));
  for (const project of projects) {
    const dir = join(PROJECTS_DIR, project);
    const files = (await readdir(dir)).sort();
    let subtotal = 0;
    for (const file of files) {
      const bytes = await fileSize(join(dir, file));
      subtotal += bytes;
      const over = bytes > BUDGETS.file ? '  ✖ > 8 MB' : '';
      if (over) errors++;
      const rel = `${project}/${file}`;
      console.log(
        `${pad(rel, 52)}${formatBytes(bytes).padStart(10)}  ${detail(project, file, records)}${over}`,
      );
    }
    const overProject = subtotal > BUDGETS.project;
    if (overProject) errors++;
    console.log(
      `${pad(`  ${project} total (${files.length} files)`, 52)}${formatBytes(subtotal).padStart(10)}` +
        `  ${overProject ? `✖ over ${formatBytes(BUDGETS.project)}` : `≤ ${formatBytes(BUDGETS.project)}`}`,
    );
    console.log('─'.repeat(120));
  }
  let total = 0;
  const all = await dirFiles(CONTENT_DIR);
  for (const f of all) total += await fileSize(f);
  const overTotal = total > BUDGETS.total;
  if (overTotal) errors++;
  console.log(
    `${pad(`src/content total (${all.length} files)`, 52)}${formatBytes(total).padStart(10)}` +
      `  ${overTotal ? `✖ over ${formatBytes(BUDGETS.total)}` : `≤ ${formatBytes(BUDGETS.total)}`}`,
  );
  return errors;
}

/* ─────────────────────────── main ─────────────────────────── */

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { only: { type: 'string' }, force: { type: 'boolean', default: false } },
    allowPositionals: false,
  });
  const entries = parseManifest(JSON.parse(await readFile(MANIFEST, 'utf8')));
  const allProjects = [...new Set(entries.map((e) => e.project))];
  if (values.only && !allProjects.includes(values.only)) {
    fail(`--only ${values.only}: not in manifest (${allProjects.join(', ')})`);
  }
  const projects = values.only ? [values.only] : allProjects;

  await extractLegacy();

  const records: EntryRecord[] = [];
  for (const project of projects) {
    console.log(`\n■ ${project}`);
    const own: EntryRecord[] = [];
    for (const e of entries.filter((x) => x.project === project)) {
      own.push(await processEntry(e, values.force));
    }
    await fitProject(project, own);
    records.push(...own);
  }

  await publish(records);
  console.log('');
  for (const project of projects) {
    const path = await writeYaml(
      project,
      records.filter((r) => r.entry.project === project),
    );
    console.log(`• wrote ${path.slice(ROOT.length + 1)}`);
  }

  for (const { entry, outcome } of records) {
    if (outcome.kind !== 'video') continue;
    if (outcome.switchedFromLoop) console.log(`⚠ loop → click: ${describe(entry)}`);
    if (outcome.projectFit) console.log(`⚠ squeezed for the project budget: ${describe(entry)}`);
  }

  const errors = await sizeTable(projects, records);
  if (errors > 0) fail(`${errors} size cap violation(s)`);
  console.log('\n✔ migration complete');
}

await main();
