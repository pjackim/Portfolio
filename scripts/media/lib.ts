/**
 * Shared helpers for the media pipeline (build.ts, migrate.ts, check.ts).
 *
 * Runs on Node's native TypeScript support (type stripping), so only erasable
 * syntax is allowed here: no enums, namespaces or constructor parameter properties.
 * External tools are always invoked through execFile/spawn with argument arrays —
 * never through a shell — because source paths can contain spaces.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp, { type Sharp } from 'sharp';

const execFile = promisify(execFileCallback);

/** Repository root (scripts/media/ → ../../). */
export const ROOT = resolve(import.meta.dirname, '../..');
/** Scratch space for intermediate files; gitignored. */
export const CACHE_DIR = join(ROOT, '.cache');
/** Where every project folder (index.md + media) lives. */
export const CONTENT_DIR = join(ROOT, 'src/content');
export const PROJECTS_DIR = join(CONTENT_DIR, 'projects');

/** Decimal units, so every budget below is the stricter reading of "MB". */
export const KB = 1000;
export const MB = 1000 * KB;

export const BUDGETS = {
  /** Autoplaying, muted loops. */
  loop: { mp4: 2.5 * MB, webm: 1.5 * MB, maxDuration: 45 },
  /** Click-to-play videos (controls, preload none). */
  click: { mp4: 8 * MB, webm: 5 * MB },
  /** No single file in src/content may exceed this. */
  file: 8 * MB,
  /** Sum of one src/content/projects/<slug>/ folder. */
  project: 15 * MB,
  /** Sum of everything in src/content. */
  total: 60 * MB,
  /** Covers narrower than this only produce a warning. */
  coverMinWidth: 1200,
  /** WebP masters are capped at this long edge. */
  imageMaxEdge: 2400,
  /** Lossless falls back to near-lossless when > this factor × the q90 size… */
  losslessFactor: 2,
  /** …and also larger than this. */
  losslessFloor: 400 * KB,
} as const;

export interface LadderStep {
  /** libx264 CRF for the .mp4 */
  mp4: number;
  /** libvpx-vp9 CRF for the .webm (moves in lock-step with the x264 CRF) */
  webm: number;
  /** MAXW in `scale='trunc(min(MAXW,iw)/2)*2':-2` */
  maxWidth: number;
}

/**
 * Budget escalation (spec-architecture §5): base CRF, then CRF +2 per step up to 32
 * (VP9 36 → 42 alongside), then MAXW 960.
 */
export const LADDER: readonly LadderStep[] = [
  { mp4: 26, webm: 36, maxWidth: 1280 },
  { mp4: 28, webm: 38, maxWidth: 1280 },
  { mp4: 30, webm: 40, maxWidth: 1280 },
  { mp4: 32, webm: 42, maxWidth: 1280 },
  { mp4: 32, webm: 42, maxWidth: 960 },
];

/**
 * One extra step past the spec ladder, used only to squeeze click-to-play videos when a
 * project folder would otherwise exceed BUDGETS.project (see migrate.ts `fitProject`).
 */
export const PROJECT_FIT_LADDER: readonly LadderStep[] = [
  ...LADDER,
  { mp4: 32, webm: 42, maxWidth: 720 },
];

export type VideoMode = 'loop' | 'click';

export interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Lowercase kebab-case: "exileLogo" → "exile-logo", "Hero_Trivia 1" → "hero-trivia-1". */
export function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function fileSize(path: string): Promise<number> {
  return (await stat(path)).size;
}

async function run(cmd: string, args: readonly string[]): Promise<string> {
  try {
    const { stdout } = await execFile(cmd, [...args], { maxBuffer: 16 * MB });
    return stdout;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(`${cmd} failed${stderr ? `: ${stderr}` : ''}`, { cause: error });
  }
}

/* ─────────────────────────── probing ─────────────────────────── */

export interface VideoProbe {
  width: number;
  height: number;
  /** avg_frame_rate as a number (e.g. 100/3 → 33.33). */
  fps: number;
  /** Seconds. */
  duration: number;
}

function parseRate(rate: string | undefined): number {
  if (!rate) return 0;
  const [num, den] = rate.split('/').map(Number);
  if (num === undefined || !Number.isFinite(num)) return 0;
  if (den === undefined) return num;
  return den > 0 ? num / den : 0;
}

export async function probeVideo(path: string): Promise<VideoProbe> {
  const out = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,avg_frame_rate:format=duration',
    '-of',
    'json',
    path,
  ]);
  const json = JSON.parse(out) as {
    streams?: { width?: number; height?: number; avg_frame_rate?: string }[];
    format?: { duration?: string };
  };
  const stream = json.streams?.[0];
  if (!stream?.width || !stream.height) throw new Error(`ffprobe: no video stream in ${path}`);
  return {
    width: stream.width,
    height: stream.height,
    fps: parseRate(stream.avg_frame_rate),
    duration: Number(json.format?.duration ?? 0),
  };
}

/* ─────────────────────────── images ─────────────────────────── */

export interface EncodeImageOptions {
  /** Lossless WebP (UI/code screenshots, logos, alpha). Default: lossy q90. */
  lossless?: boolean;
  /** Region of the (auto-rotated) source to keep, applied before resizing. */
  crop?: Crop | undefined;
}

export interface EncodeImageResult {
  bytes: number;
  width: number;
  height: number;
  /** What was actually written. */
  encoding: 'lossless' | 'near-lossless' | 'q90';
}

function imagePipeline(input: string | Buffer, crop: Crop | undefined): Sharp {
  let img = sharp(input).rotate();
  if (crop) img = img.extract(crop);
  return img.resize({
    width: BUDGETS.imageMaxEdge,
    height: BUDGETS.imageMaxEdge,
    fit: 'inside',
    withoutEnlargement: true,
  });
}

/**
 * Encode any still image to a WebP master (≤2400px long edge, metadata stripped — sharp's
 * default). Lossless output that is > 2× the q90 size and > 400 KB falls back to
 * near-lossless q90.
 */
export async function encodeImage(
  input: string | Buffer,
  output: string,
  { lossless = false, crop }: EncodeImageOptions = {},
): Promise<EncodeImageResult> {
  await mkdir(dirname(output), { recursive: true });
  const lossy = () =>
    imagePipeline(input, crop).webp({ quality: 90, effort: 6, smartSubsample: true });

  let encoding: EncodeImageResult['encoding'] = 'q90';
  let result = await lossy().toBuffer({ resolveWithObject: true });

  if (lossless) {
    const exact = await imagePipeline(input, crop)
      .webp({ lossless: true, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    const bloated =
      exact.info.size > BUDGETS.losslessFactor * result.info.size &&
      exact.info.size > BUDGETS.losslessFloor;
    if (bloated) {
      encoding = 'near-lossless';
      result = await imagePipeline(input, crop)
        .webp({ nearLossless: true, quality: 90, effort: 6 })
        .toBuffer({ resolveWithObject: true });
    } else {
      encoding = 'lossless';
      result = exact;
    }
  }

  await writeFile(output, result.data);
  return {
    bytes: await fileSize(output),
    width: result.info.width,
    height: result.info.height,
    encoding,
  };
}

/* ─────────────────────────── videos ─────────────────────────── */

export interface EncodeVideoOptions {
  mode: VideoMode;
  /** Playback speed-up (setpts=PTS/speed), e.g. 2 for long screen recordings. */
  speed?: number | undefined;
  /** Keep the smallest over-budget result instead of throwing. */
  allowOver?: boolean | undefined;
  log?: ((message: string) => void) | undefined;
}

export type Codec = 'mp4' | 'webm';

export interface CodecResult {
  bytes: number;
  /** Index into the ladder that produced this file. */
  step: number;
  crf: number;
  maxWidth: number;
  width: number;
  height: number;
  budget: number;
  overBudget: boolean;
}

export interface VideoTiming {
  fps: number;
  /** Speed-up factor applied (1 = none). */
  speed: number;
  /** Output duration in seconds (after speed-up). */
  duration: number;
  /** Source frame width, used to skip ladder steps that would change nothing. */
  sourceWidth: number;
}

export interface EncodeVideoResult extends VideoTiming {
  mode: VideoMode;
  mp4: CodecResult;
  webm: CodecResult;
  poster: PosterResult;
}

export interface PosterResult {
  bytes: number;
  width: number;
  height: number;
}

export class BudgetError extends Error {
  readonly result: EncodeVideoResult | undefined;
  constructor(message: string, result?: EncodeVideoResult) {
    super(message);
    this.name = 'BudgetError';
    this.result = result;
  }
}

function videoFilter(fps: number, maxWidth: number, speed: number): string {
  const chain = [
    `fps=${fps}`,
    `scale='trunc(min(${maxWidth},iw)/2)*2':-2:flags=lanczos`,
    'format=yuv420p',
  ];
  if (speed !== 1) chain.unshift(`setpts=PTS/${speed}`);
  return chain.join(',');
}

function codecArgs(codec: Codec, input: string, vf: string, crf: number, fps: number, out: string) {
  // prettier-ignore
  return codec === 'mp4'
    ? [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vf', vf,
        '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
        '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p',
        '-g', String(fps * 5), '-movflags', '+faststart', out,
      ]
    : [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vf', vf,
        '-an', '-map_metadata', '-1',
        '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0',
        '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-tile-columns', '2',
        '-g', String(fps * 5), '-pix_fmt', 'yuv420p', out,
      ];
}

/** Output frame rate and speed factor for a source: FPS = min(30, round(avg fps)). */
export async function videoTiming(input: string, speed: number | undefined): Promise<VideoTiming> {
  const probe = await probeVideo(input);
  const factor = speed && speed > 0 ? speed : 1;
  return {
    fps: Math.max(1, Math.min(30, Math.round(probe.fps || 30))),
    speed: factor,
    duration: probe.duration / factor,
    sourceWidth: probe.width,
  };
}

/**
 * Next ladder index after `step` whose settings differ from `current` — e.g. MAXW 960 is
 * skipped for a 906px-wide source because it would re-encode the identical file.
 */
export function nextStep(
  ladder: readonly LadderStep[],
  codec: Codec,
  step: number,
  current: { crf: number; width: number } | undefined,
  sourceWidth: number,
): number | undefined {
  for (let i = step + 1; i < ladder.length; i++) {
    const s = ladder[i];
    if (!s) break;
    const width = Math.trunc(Math.min(s.maxWidth, sourceWidth) / 2) * 2;
    if (!current || s[codec] !== current.crf || width !== current.width) return i;
  }
  return undefined;
}

/** Encode one codec at one ladder step. */
export async function encodeVideoStep(
  input: string,
  out: string,
  codec: Codec,
  ladder: readonly LadderStep[],
  step: number,
  timing: { fps: number; speed: number },
  budget: number,
): Promise<CodecResult> {
  const s = ladder[step];
  if (!s) throw new Error(`no ladder step ${step}`);
  const vf = videoFilter(timing.fps, s.maxWidth, timing.speed);
  await run('ffmpeg', codecArgs(codec, input, vf, s[codec], timing.fps, out));
  const bytes = await fileSize(out);
  const { width, height } = await probeVideo(out);
  return {
    bytes,
    step,
    crf: s[codec],
    maxWidth: s.maxWidth,
    width,
    height,
    budget,
    overBudget: bytes > budget,
  };
}

/** Walk LADDER until the file fits its budget; returns the first fitting (or the last) step. */
async function encodeWithinBudget(
  codec: Codec,
  input: string,
  out: string,
  timing: VideoTiming,
  budget: number,
  log: (message: string) => void,
): Promise<CodecResult> {
  let last: CodecResult | undefined;
  let step = nextStep(LADDER, codec, -1, undefined, timing.sourceWidth);
  while (step !== undefined) {
    last = await encodeVideoStep(input, out, codec, LADDER, step, timing, budget);
    log(describeStep(codec, last));
    if (!last.overBudget) return last;
    step = nextStep(LADDER, codec, step, last, timing.sourceWidth);
  }
  if (!last) throw new Error('unreachable: empty encode ladder');
  return last;
}

export function describeStep(codec: Codec, r: CodecResult): string {
  return (
    `    ${codec} crf ${r.crf} maxw ${r.maxWidth} → ${formatBytes(r.bytes)}` +
    (r.overBudget ? ` (over ${formatBytes(r.budget)})` : '')
  );
}

/**
 * GIF/MP4/MOV/WebM → `<outBase>.mp4` (H.264) + `<outBase>.webm` (VP9) + `<outBase>.poster.webp`.
 * FPS = min(30, round(source avg fps)); each codec walks LADDER until it fits its budget.
 * Throws BudgetError when a budget can't be met, unless `allowOver`.
 */
export async function encodeVideo(
  input: string,
  outBase: string,
  { mode, speed, allowOver = false, log = () => {} }: EncodeVideoOptions,
): Promise<EncodeVideoResult> {
  const timing = await videoTiming(input, speed);
  const budget = BUDGETS[mode];

  if (mode === 'loop' && timing.duration > BUDGETS.loop.maxDuration && !allowOver) {
    throw new BudgetError(
      `loop is ${timing.duration.toFixed(1)} s (> ${BUDGETS.loop.maxDuration} s); use click-to-play`,
    );
  }

  await mkdir(dirname(outBase), { recursive: true });
  const [mp4, webm] = await Promise.all([
    encodeWithinBudget('mp4', input, `${outBase}.mp4`, timing, budget.mp4, log),
    encodeWithinBudget('webm', input, `${outBase}.webm`, timing, budget.webm, log),
  ]);
  const poster = await extractPoster(input, `${outBase}.poster.webp`, timing, mp4.maxWidth);
  const result: EncodeVideoResult = { mode, ...timing, mp4, webm, poster };

  if ((mp4.overBudget || webm.overBudget) && !allowOver) {
    throw new BudgetError(
      `${mode} budget exceeded after full escalation: mp4 ${formatBytes(mp4.bytes)} / ` +
        `${formatBytes(budget.mp4)}, webm ${formatBytes(webm.bytes)} / ${formatBytes(budget.webm)}`,
      result,
    );
  }
  return result;
}

/**
 * Poster: the frame at 10% of the output duration, rendered through the same filter chain as
 * the .mp4 (so dimensions match) → PNG in .cache/tmp → WebP q90.
 */
export async function extractPoster(
  input: string,
  output: string,
  timing: VideoTiming,
  maxWidth: number,
): Promise<PosterResult> {
  const tmpDir = join(CACHE_DIR, 'tmp');
  await mkdir(tmpDir, { recursive: true });
  const png = join(tmpDir, `poster-${randomUUID()}.png`);
  const vf = videoFilter(timing.fps, maxWidth, timing.speed).replace(/,format=yuv420p$/, '');
  try {
    // prettier-ignore
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vf', vf,
      '-ss', (timing.duration * 0.1).toFixed(3), '-frames:v', '1', '-update', '1', png,
    ]);
    const info = await sharp(png)
      .webp({ quality: 90, effort: 6, smartSubsample: true })
      .toFile(output);
    return { bytes: info.size, width: info.width, height: info.height };
  } finally {
    await rm(png, { force: true });
  }
}

/* ─────────────────────────── YouTube ─────────────────────────── */

async function fetchImage(url: string): Promise<Buffer | undefined> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return undefined;
  const buf = Buffer.from(await res.arrayBuffer());
  const { width, height } = await sharp(buf).metadata();
  // i.ytimg.com answers missing sizes with a 120×90 grey placeholder.
  if (width === 120 && height === 90) return undefined;
  return buf;
}

/**
 * Remove the 45px black letterbox bars hqdefault (480×360) adds around 16:9 videos. Only the
 * JPEG-block-aligned rows 0–39 and 320–359 are sampled, so ringing at the picture edge can't
 * hide a bar. (stats() ignores pipeline operations, hence the intermediate buffer.)
 */
async function trimLetterbox(buf: Buffer): Promise<Sharp> {
  const { width, height } = await sharp(buf).metadata();
  if (width !== 480 || height !== 360) return sharp(buf);
  const isBar = async (top: number) => {
    const strip = await sharp(buf).extract({ left: 0, top, width, height: 40 }).toBuffer();
    return (await sharp(strip).stats()).channels.every((c) => c.max < 24);
  };
  if ((await isBar(0)) && (await isBar(320))) {
    return sharp(buf).extract({ left: 0, top: 45, width: 480, height: 270 });
  }
  return sharp(buf);
}

/**
 * Download a YouTube poster (maxresdefault → hqdefault fallback) and store it as WebP q90.
 * Throws if neither size exists.
 */
export async function fetchYouTubePoster(
  id: string,
  output: string,
): Promise<{ bytes: number; width: number; height: number; source: string }> {
  if (!/^[\w-]{11}$/.test(id)) throw new Error(`invalid YouTube id: ${id}`);
  for (const size of ['maxresdefault', 'hqdefault'] as const) {
    const buf = await fetchImage(`https://i.ytimg.com/vi/${id}/${size}.jpg`);
    if (!buf) continue;
    await mkdir(dirname(output), { recursive: true });
    const img = size === 'hqdefault' ? await trimLetterbox(buf) : sharp(buf);
    const info = await img.webp({ quality: 90, effort: 6, smartSubsample: true }).toFile(output);
    return { bytes: info.size, width: info.width, height: info.height, source: size };
  }
  throw new Error(`no YouTube poster available for ${id}`);
}

/* ─────────────────────────── YAML snippets ─────────────────────────── */

export type MediaItem =
  | { kind: 'image'; file: string; note?: string | undefined }
  | { kind: 'video'; file: string; autoplay: boolean; note?: string | undefined }
  | { kind: 'youtube'; id: string; note?: string | undefined };

const note = (text: string | undefined) => (text ? ` # ${text}` : '');

/** A ready-to-paste `media:` block for a project's index.md frontmatter (alt/title = "TODO"). */
export function mediaYaml(items: readonly MediaItem[]): string {
  if (items.length === 0) return 'media: []\n';
  const lines = ['media:'];
  for (const item of items) {
    lines.push(`  - kind: ${item.kind}`);
    if (item.kind === 'youtube') {
      lines.push(`    id: "${item.id}"${note(item.note)}`, '    title: "TODO"');
      continue;
    }
    lines.push(`    src: ./${item.file}${note(item.note)}`, '    alt: "TODO"');
    if (item.kind === 'video') lines.push(`    autoplay: ${item.autoplay}`);
  }
  return `${lines.join('\n')}\n`;
}
