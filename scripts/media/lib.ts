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

/**
 * Guard rails, not quality governors: nothing is ever encoded harder to fit one. They stop a
 * mistake (a raw screen recording, a 4K lossless photo dump) from landing in git, and keep the
 * built site well under GitHub Pages' 1 GB limit.
 */
export const BUDGETS = {
  /** Autoplaying, muted loops. */
  loop: { mp4: 24 * MB, webm: 24 * MB, maxDuration: 45 },
  /** Click-to-play videos (controls, preload none). */
  click: { mp4: 48 * MB, webm: 48 * MB },
  /** No single file in src/content may exceed this (GitHub warns at 50 MB). */
  file: 50 * MB,
  /** Sum of one src/content/projects/<slug>/ folder. */
  project: 150 * MB,
  /** Sum of everything in src/content. */
  total: 500 * MB,
  /** Covers narrower than this only produce a warning. */
  coverMinWidth: 1200,
  /** WebP masters are capped at this long edge. */
  imageMaxEdge: 3840,
  /** Videos wider than this are scaled down to it (2× the widest figure column). */
  videoMaxWidth: 1920,
} as const;

/** Quality-first video settings: one encode per codec, never a resolution or CRF trade. */
export const VIDEO = {
  /** libx264 CRF. */
  crf: 20,
  /** libvpx-vp9 CRF = the x264 CRF + this (calibrated so the .webm matches the .mp4). */
  webmCrfOffset: 10,
  /** Allowed `--crf` range. */
  crfRange: [14, 28],
  maxFps: 30,
} as const;

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

/** Like `run`, for commands that write binary data (a PNG frame) to stdout. */
async function runBuffer(cmd: string, args: readonly string[]): Promise<Buffer> {
  try {
    const { stdout } = await execFile(cmd, [...args], { maxBuffer: 512 * MB, encoding: 'buffer' });
    return stdout;
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
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
  pixFmt: string;
  /** The stream's YUV matrix tag (`color_space`); undefined when it carries none. */
  colorSpace: string | undefined;
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
    'stream=width,height,avg_frame_rate,pix_fmt,color_space:format=duration',
    '-of',
    'json',
    path,
  ]);
  const json = JSON.parse(out) as {
    streams?: {
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      pix_fmt?: string;
      color_space?: string;
    }[];
    format?: { duration?: string };
  };
  const stream = json.streams?.[0];
  if (!stream?.width || !stream.height) throw new Error(`ffprobe: no video stream in ${path}`);
  const tagged = stream.color_space && stream.color_space !== 'unknown';
  return {
    width: stream.width,
    height: stream.height,
    fps: parseRate(stream.avg_frame_rate),
    duration: Number(json.format?.duration ?? 0),
    pixFmt: stream.pix_fmt ?? '',
    colorSpace: tagged ? stream.color_space : undefined,
  };
}

/* ─────────────────────────── images ─────────────────────────── */

export interface EncodeImageOptions {
  /** Lossy WebP q95, for a large photographic source whose lossless file is unreasonable. */
  lossy?: boolean;
  /** Region of the (auto-rotated) source to keep, applied before resizing. */
  crop?: Crop | undefined;
}

export interface EncodeImageResult {
  bytes: number;
  width: number;
  height: number;
  /** What was actually written. */
  encoding: 'lossless' | 'q95';
}

/** The master's pixels: auto-rotated, cropped, capped at BUDGETS.imageMaxEdge, 8-bit sRGB. */
async function imagePixels(input: string | Buffer, crop: Crop | undefined) {
  let img = sharp(input).rotate();
  if (crop) img = img.extract(crop);
  return img
    .resize({
      width: BUDGETS.imageMaxEdge,
      height: BUDGETS.imageMaxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/** Throws unless `webp` decodes to exactly `pixels` (colour under zero alpha is ignored). */
async function assertSamePixels(pixels: Sharp, webp: Buffer, label: string): Promise<void> {
  const want = await pixels.ensureAlpha().raw().toBuffer();
  const got = await sharp(webp).ensureAlpha().raw().toBuffer();
  if (want.length !== got.length) throw new Error(`${label}: lossless output changed size`);
  for (let i = 0; i < want.length; i += 4) {
    if (want[i + 3] === 0 && got[i + 3] === 0) continue;
    if (
      want[i] !== got[i] ||
      want[i + 1] !== got[i + 1] ||
      want[i + 2] !== got[i + 2] ||
      want[i + 3] !== got[i + 3]
    ) {
      throw new Error(`${label}: lossless output differs from its source at pixel ${i / 4}`);
    }
  }
}

/**
 * Encode any still image to a WebP master (≤3840px long edge, metadata stripped — sharp's
 * default). Lossless unless `lossy`: the site's delivery encodes are made from this file, so
 * any loss here caps what a visitor can ever see. A lossless result is decoded and compared
 * with its source pixels before it is written.
 */
export async function encodeImage(
  input: string | Buffer,
  output: string,
  { lossy = false, crop }: EncodeImageOptions = {},
): Promise<EncodeImageResult> {
  await mkdir(dirname(output), { recursive: true });
  const { data, info } = await imagePixels(input, crop);
  const pixels = () =>
    sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });

  const webp = lossy
    ? await pixels()
        .webp({ quality: 95, effort: 6, smartSubsample: true, alphaQuality: 100 })
        .toBuffer()
    : await pixels().webp({ lossless: true, effort: 6 }).toBuffer();
  if (!lossy) await assertSamePixels(pixels(), webp, output);

  await writeFile(output, webp);
  return {
    bytes: webp.length,
    width: info.width,
    height: info.height,
    encoding: lossy ? 'q95' : 'lossless',
  };
}

/**
 * Whether a WebP file is lossless (a `VP8L` bitstream) rather than lossy (`VP8 `, with any
 * alpha in a separate `ALPH` chunk). Walks the RIFF chunks, so an extended (`VP8X`) file
 * with a colour profile or animation header in front is read correctly.
 */
export function webpIsLossless(file: Buffer): boolean {
  if (file.toString('latin1', 0, 4) !== 'RIFF' || file.toString('latin1', 8, 12) !== 'WEBP') {
    throw new Error('not a WebP file');
  }
  for (let at = 12; at + 8 <= file.length;) {
    const chunk = file.toString('latin1', at, at + 4);
    if (chunk === 'VP8L') return true;
    if (chunk === 'VP8 ') return false;
    // Chunks are padded to an even length.
    at += 8 + file.readUInt32LE(at + 4) + (file.readUInt32LE(at + 4) % 2);
  }
  throw new Error('WebP file has no image data');
}

/* ─────────────────────────── videos ─────────────────────────── */

/** A span of the source, in seconds. */
export interface Trim {
  start: number;
  end: number;
}

export interface EncodeVideoOptions {
  mode: VideoMode;
  /** Playback speed-up (setpts=PTS/speed), e.g. 2 for long screen recordings. */
  speed?: number | undefined;
  /** Keep only this span of the source (frame-accurate). */
  trim?: Trim | undefined;
  /** Region of the source frame to keep, applied before any scaling. */
  crop?: Crop | undefined;
  /** libx264 CRF (default VIDEO.crf); the .webm uses this + VIDEO.webmCrfOffset. */
  crf?: number | undefined;
  /** Keep an over-budget result instead of throwing. */
  allowOver?: boolean | undefined;
  log?: ((message: string) => void) | undefined;
}

export type Codec = 'mp4' | 'webm';

export interface CodecResult {
  bytes: number;
  crf: number;
  width: number;
  height: number;
  budget: number;
  overBudget: boolean;
}

/** Everything both codecs and the poster share: timing, output frame, filter chains. */
export interface VideoPlan {
  fps: number;
  /** Speed-up factor applied (1 = none). */
  speed: number;
  /** Output duration in seconds (after trim and speed-up). */
  duration: number;
  width: number;
  height: number;
  /** ffmpeg options placed before `-i` (the trim). */
  inputArgs: string[];
  /** Filter chain ending in BT.709 limited-range yuv420p, for the encodes. */
  yuv: string;
  /** The same geometry ending in rgb24, for the poster. */
  rgb: string;
}

export interface EncodeVideoResult {
  mode: VideoMode;
  fps: number;
  speed: number;
  duration: number;
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

const SCALE_FLAGS = 'lanczos+accurate_rnd+full_chroma_int';
// prettier-ignore
const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

/**
 * `:in_color_matrix=…` for a YUV source that carries no matrix tag (players assume BT.709 from
 * 720 lines up, BT.601 below); empty when the stream is tagged or isn't YUV.
 */
function inputMatrix(probe: VideoProbe): string {
  if (probe.colorSpace || !probe.pixFmt.startsWith('yuv')) return '';
  return `:in_color_matrix=${probe.height >= 720 ? 'bt709' : 'bt601'}`;
}

/**
 * Timing and geometry for a source. FPS = min(30, round(avg fps)). A frame wider than
 * BUDGETS.videoMaxWidth is scaled down to it; a narrower one is never resampled — an odd
 * edge loses its last pixel row/column instead (yuv420p needs even dimensions).
 */
export async function planVideo(
  input: string,
  { speed, trim, crop }: Pick<EncodeVideoOptions, 'speed' | 'trim' | 'crop'> = {},
): Promise<VideoPlan> {
  const probe = await probeVideo(input);
  const factor = speed && speed > 0 ? speed : 1;
  if (trim && !(trim.start >= 0 && trim.end > trim.start && trim.end <= probe.duration + 0.05)) {
    throw new Error(`trim ${trim.start}-${trim.end} s is outside the ${probe.duration} s source`);
  }
  const source = crop ?? { left: 0, top: 0, width: probe.width, height: probe.height };
  if (source.left + source.width > probe.width || source.top + source.height > probe.height) {
    throw new Error(`crop is outside the ${probe.width}×${probe.height} frame`);
  }

  const even = (n: number) => Math.trunc(n / 2) * 2;
  const scaled = source.width > BUDGETS.videoMaxWidth;
  const width = even(scaled ? BUDGETS.videoMaxWidth : source.width);
  const height = scaled
    ? Math.round((source.height * width) / source.width / 2) * 2
    : even(source.height);
  const region = scaled ? source : { ...source, width, height };
  const whole = region.width === probe.width && region.height === probe.height;

  const fps = Math.max(1, Math.min(VIDEO.maxFps, Math.round(probe.fps || VIDEO.maxFps)));
  const span = trim ? trim.end - trim.start : probe.duration;
  const head = [
    ...(whole ? [] : [`crop=${region.width}:${region.height}:${region.left}:${region.top}`]),
    ...(factor === 1 ? [] : [`setpts=PTS/${factor}`]),
    `fps=${fps}`,
  ];
  const scale = `scale=${width}:${height}:flags=${SCALE_FLAGS}${inputMatrix(probe)}`;
  return {
    fps,
    speed: factor,
    duration: span / factor,
    width,
    height,
    inputArgs: trim ? ['-ss', trim.start.toFixed(3), '-t', span.toFixed(3)] : [],
    yuv: [...head, `${scale}:out_color_matrix=bt709:out_range=tv`, 'format=yuv420p'].join(','),
    rgb: [...head, scale, 'format=rgb24'].join(','),
  };
}

/** Lowest H.264 level (from 4.1) whose frame size and macroblock rate hold the output. */
function h264Level({ width, height, fps }: VideoPlan): string {
  const blocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const rate = blocks * fps;
  if (blocks <= 8192 && rate <= 245_760) return '4.1';
  if (blocks <= 8704 && rate <= 522_240) return '4.2';
  if (blocks <= 22_080 && rate <= 589_824) return '5.0';
  return '5.1';
}

function commonArgs(input: string, plan: VideoPlan): string[] {
  // prettier-ignore
  return [
    '-hide_banner', '-loglevel', 'error', '-y', ...plan.inputArgs, '-i', input, '-vf', plan.yuv,
    '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1',
  ];
}

async function encodeMp4(input: string, out: string, plan: VideoPlan, crf: number, gop: number) {
  // prettier-ignore
  await run('ffmpeg', [
    ...commonArgs(input, plan),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-aq-mode', '3',
    '-profile:v', 'high', '-level:v', h264Level(plan), '-pix_fmt', 'yuv420p', ...BT709,
    '-g', String(gop), '-movflags', '+faststart', out,
  ]);
}

/** Two-pass constant-quality VP9: the first pass only gathers statistics for the second. */
async function encodeWebm(input: string, out: string, plan: VideoPlan, crf: number, gop: number) {
  const tmpDir = join(CACHE_DIR, 'tmp');
  await mkdir(tmpDir, { recursive: true });
  const stats = join(tmpDir, `vp9-${randomUUID()}`);
  // prettier-ignore
  const pass = (n: 1 | 2, tail: string[]) => run('ffmpeg', [
    ...commonArgs(input, plan),
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-deadline', 'good',
    '-row-mt', '1', '-tile-columns', '2', '-pix_fmt', 'yuv420p', ...BT709, '-g', String(gop),
    '-pass', String(n), '-passlogfile', stats, ...tail,
  ]);
  try {
    await pass(1, ['-cpu-used', '4', '-f', 'null', '-']);
    await pass(2, ['-cpu-used', '1', '-auto-alt-ref', '1', '-lag-in-frames', '25', out]);
  } finally {
    await rm(`${stats}-0.log`, { force: true });
  }
}

export function describeCodec(codec: Codec, r: CodecResult): string {
  return (
    `    ${codec} crf ${r.crf} ${r.width}×${r.height} → ${formatBytes(r.bytes)}` +
    (r.overBudget ? ` (over ${formatBytes(r.budget)})` : '')
  );
}

/**
 * GIF/MP4/MOV/WebM → `<outBase>.mp4` (H.264) + `<outBase>.webm` (VP9) + `<outBase>.poster.webp`.
 * One encode per codec at VIDEO.crf (or `crf`): quality is never traded for a budget. Throws
 * BudgetError when a result is over its guard rail, unless `allowOver`.
 */
export async function encodeVideo(
  input: string,
  outBase: string,
  options: EncodeVideoOptions,
): Promise<EncodeVideoResult> {
  const { mode, speed, trim, crop, crf = VIDEO.crf, allowOver = false, log = () => {} } = options;
  const plan = await planVideo(input, { speed, trim, crop });
  const budget = BUDGETS[mode];

  if (mode === 'loop' && plan.duration > BUDGETS.loop.maxDuration && !allowOver) {
    throw new BudgetError(
      `loop is ${plan.duration.toFixed(1)} s (> ${BUDGETS.loop.maxDuration} s); use click-to-play`,
    );
  }

  await mkdir(dirname(outBase), { recursive: true });
  // Loops restart often and are never scrubbed; click-to-play gets a keyframe every 2 s.
  const gop = plan.fps * (mode === 'loop' ? 5 : 2);
  const finish = async (codec: Codec, codecCrf: number): Promise<CodecResult> => {
    const bytes = await fileSize(`${outBase}.${codec}`);
    const result: CodecResult = {
      bytes,
      crf: codecCrf,
      width: plan.width,
      height: plan.height,
      budget: budget[codec],
      overBudget: bytes > budget[codec],
    };
    log(describeCodec(codec, result));
    return result;
  };
  const webmCrf = crf + VIDEO.webmCrfOffset;
  const [mp4, webm] = await Promise.all([
    encodeMp4(input, `${outBase}.mp4`, plan, crf, gop).then(() => finish('mp4', crf)),
    encodeWebm(input, `${outBase}.webm`, plan, webmCrf, gop).then(() => finish('webm', webmCrf)),
  ]);
  const poster = await extractPoster(input, `${outBase}.poster.webp`, plan);
  const result: EncodeVideoResult = {
    mode,
    fps: plan.fps,
    speed: plan.speed,
    duration: plan.duration,
    mp4,
    webm,
    poster,
  };

  if ((mp4.overBudget || webm.overBudget) && !allowOver) {
    throw new BudgetError(
      `${mode} guard rail exceeded: mp4 ${formatBytes(mp4.bytes)} / ` +
        `${formatBytes(budget.mp4)}, webm ${formatBytes(webm.bytes)} / ${formatBytes(budget.webm)}`,
      result,
    );
  }
  return result;
}

/**
 * Poster: the frame at 10% of the output duration, taken from the source (not from an encode)
 * through the same trim, crop and scale as the videos, stored lossless.
 */
export async function extractPoster(
  input: string,
  output: string,
  plan: VideoPlan,
): Promise<PosterResult> {
  // prettier-ignore
  const png = await runBuffer('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', ...plan.inputArgs, '-i', input, '-vf', plan.rgb,
    '-ss', (plan.duration * 0.1).toFixed(3), '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-',
  ]);
  const info = await sharp(png).webp({ lossless: true, effort: 6 }).toFile(output);
  return { bytes: info.size, width: info.width, height: info.height };
}

/** One frame of a video at `time` seconds, as a PNG: the input for a still made from footage. */
export async function extractFrame(input: string, time: number): Promise<Buffer> {
  const probe = await probeVideo(input);
  if (!(time >= 0 && time <= probe.duration)) {
    throw new Error(`frame time ${time} s is outside the ${probe.duration} s source`);
  }
  const vf = `scale=iw:ih:flags=${SCALE_FLAGS}${inputMatrix(probe)},format=rgb24`;
  // prettier-ignore
  return runBuffer('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-ss', time.toFixed(3), '-i', input, '-vf', vf,
    '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-',
  ]);
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
 * Download a YouTube poster (maxresdefault → hqdefault fallback) and store it as lossless
 * WebP: the JPEG is already lossy, so a second lossy pass would only compound it.
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
    const info = await img.webp({ lossless: true, effort: 6 }).toFile(output);
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
