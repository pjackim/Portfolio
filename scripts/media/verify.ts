/**
 * Proof that a re-encoded master is the same picture as the one it replaces, and no worse.
 *
 *   npm run media:verify -- --project <slug> [--against <rev>]
 *
 * Compares every media file in src/content/projects/<slug>/ that differs from `<rev>`
 * (default HEAD) with its version there. Exits 1 on any failure; notes never fail.
 *
 *  images  - same alpha presence, same aspect ratio (±0.5%), never smaller
 *          - PSNR against the old master (the new one scaled to the old size) ≥ 30 dB
 *          - same size: the PSNR over shifts of −2…2 px peaks at (0, 0), so the crop is exact
 *          - note when the new master is lossy (expected only after --lossy)
 *  videos  - same frame count and frame rate, never smaller
 *          - H.264 High / VP9 profile 0, yuv420p, tagged BT.709 limited range
 *          - mean PSNR of five sampled frames against the old encode (the new one scaled to
 *            the old size) ≥ 28 dB
 *  posters - same size as their .mp4
 */
import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import sharp from 'sharp';
import { CACHE_DIR, MB, PROJECTS_DIR, ROOT, formatBytes, webpIsLossless } from './lib.ts';

const execFile = promisify(execFileCallback);
const IMAGE_PSNR = 30;
const VIDEO_PSNR = 28;
const SHIFT = 2;

const { values } = parseArgs({
  options: { project: { type: 'string' }, against: { type: 'string', default: 'HEAD' } },
});
const slug = values.project;
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('usage: npm run media:verify -- --project <slug> [--against <rev>]');
  process.exit(1);
}
const rev = values.against;
const dir = join(PROJECTS_DIR, slug);

const failures: string[] = [];
const lines: string[] = [];

/** The file's bytes at `rev`, or undefined when it did not exist there. */
async function previous(name: string): Promise<Buffer | undefined> {
  try {
    const { stdout } = await execFile(
      'git',
      ['show', `${rev}:src/content/projects/${slug}/${name}`],
      { cwd: ROOT, encoding: 'buffer', maxBuffer: 512 * MB },
    );
    return stdout;
  } catch {
    return undefined;
  }
}

interface Pixels {
  data: Buffer;
  width: number;
  height: number;
}

async function rgb(input: Buffer, size?: { width: number; height: number }): Promise<Pixels> {
  let img = sharp(input).removeAlpha();
  if (size) img = img.resize({ ...size, fit: 'fill', kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** PSNR in dB of `b` moved by (dx, dy) against `a`, over the area both cover. */
function psnr(a: Pixels, b: Pixels, dx = 0, dy = 0): number {
  let sum = 0;
  let count = 0;
  for (let y = SHIFT; y < a.height - SHIFT; y++) {
    const rowA = y * a.width * 3;
    const rowB = (y + dy) * b.width * 3;
    for (let x = SHIFT; x < a.width - SHIFT; x++) {
      for (let c = 0; c < 3; c++) {
        const d = (a.data[rowA + x * 3 + c] ?? 0) - (b.data[rowB + (x + dx) * 3 + c] ?? 0);
        sum += d * d;
      }
      count += 3;
    }
  }
  return sum === 0 ? Infinity : 10 * Math.log10((255 * 255 * count) / sum);
}

const db = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)} dB` : 'identical');

async function verifyImage(name: string, before: Buffer, after: Buffer): Promise<void> {
  const [old, now] = await Promise.all([sharp(before).metadata(), sharp(after).metadata()]);
  const fail = (why: string) => failures.push(`${name}: ${why}`);
  if (Boolean(old.hasAlpha) !== Boolean(now.hasAlpha)) fail('alpha channel appeared or vanished');
  const ratio = now.width / now.height / (old.width / old.height);
  if (Math.abs(ratio - 1) > 0.005) {
    fail(`aspect changed: ${old.width}×${old.height} → ${now.width}×${now.height}`);
    return;
  }
  if (now.width < old.width) fail(`smaller: ${old.width}px → ${now.width}px wide`);

  const a = await rgb(before);
  const b = await rgb(after, { width: old.width, height: old.height });
  const base = psnr(a, b);
  if (base < IMAGE_PSNR) fail(`only ${db(base)} against the old master (need ${IMAGE_PSNR})`);

  let aligned = '';
  if (now.width === old.width && now.height === old.height && Number.isFinite(base)) {
    let best = { dx: 0, dy: 0, value: base };
    for (let dy = -SHIFT; dy <= SHIFT; dy++) {
      for (let dx = -SHIFT; dx <= SHIFT; dx++) {
        const value = psnr(a, b, dx, dy);
        if (value > best.value) best = { dx, dy, value };
      }
    }
    if (best.dx !== 0 || best.dy !== 0) {
      fail(`crop is off by (${best.dx}, ${best.dy}) px: ${db(best.value)} there vs ${db(base)}`);
    }
    aligned = ', aligned';
  }
  const lossless = webpIsLossless(after);
  lines.push(
    `  ${name}: ${old.width}×${old.height} → ${now.width}×${now.height}, ` +
      `${formatBytes(before.length)} → ${formatBytes(after.length)}, ` +
      `${db(base)} vs old${aligned}${lossless ? ', lossless' : ', LOSSY (expected only with --lossy)'}`,
  );
}

interface Stream {
  codec_name: string;
  profile: string;
  pix_fmt: string;
  width: number;
  height: number;
  r_frame_rate: string;
  nb_read_frames: string;
  color_space?: string;
  color_range?: string;
}

async function probe(path: string): Promise<Stream> {
  // prettier-ignore
  const { stdout } = await execFile('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
    'stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames,color_space,color_range',
    '-of', 'json', path,
  ]);
  const stream = (JSON.parse(stdout) as { streams?: Stream[] }).streams?.[0];
  if (!stream) throw new Error(`ffprobe: no video stream in ${path}`);
  return stream;
}

/** The frames at `indices`, scaled to `size`, as RGB pixels. */
async function frames(
  path: string,
  indices: readonly number[],
  size: { width: number; height: number },
): Promise<Pixels[]> {
  const select = indices.map((n) => `eq(n,${n})`).join('+');
  // prettier-ignore
  const { stdout } = await execFile('ffmpeg', [
    '-v', 'error', '-i', path, '-vf',
    `select='${select}',scale=${size.width}:${size.height}:flags=bicubic`,
    '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { encoding: 'buffer', maxBuffer: 2048 * MB });
  const bytes = size.width * size.height * 3;
  return indices.map((_, i) => ({ data: stdout.subarray(i * bytes, (i + 1) * bytes), ...size }));
}

async function verifyVideo(name: string, before: Buffer, path: string): Promise<void> {
  const tmp = join(CACHE_DIR, 'tmp');
  await mkdir(tmp, { recursive: true });
  const oldPath = join(tmp, `verify-${randomUUID()}-${name}`);
  await writeFile(oldPath, before);
  const fail = (why: string) => failures.push(`${name}: ${why}`);
  try {
    const [old, now] = await Promise.all([probe(oldPath), probe(path)]);
    if (old.nb_read_frames !== now.nb_read_frames) {
      fail(`frame count ${old.nb_read_frames} → ${now.nb_read_frames}`);
    }
    if (old.r_frame_rate !== now.r_frame_rate) {
      fail(`frame rate ${old.r_frame_rate} → ${now.r_frame_rate}`);
    }
    if (now.width < old.width) fail(`smaller: ${old.width}px → ${now.width}px wide`);
    const profile = name.endsWith('.mp4') ? ['h264', 'High'] : ['vp9', 'Profile 0'];
    if (now.codec_name !== profile[0] || now.profile !== profile[1]) {
      fail(`is ${now.codec_name} ${now.profile}, expected ${profile.join(' ')}`);
    }
    if (now.pix_fmt !== 'yuv420p') fail(`pixel format ${now.pix_fmt}`);
    if (now.color_space !== 'bt709' || now.color_range !== 'tv') {
      fail(`colour tags ${now.color_space}/${now.color_range}, expected bt709/tv`);
    }

    // Sampled by frame index and compared here: ffmpeg's two-input psnr filter pairs frames
    // by timestamp, which mis-pairs a .webm (millisecond time base) with anything else.
    const count = Math.min(Number(old.nb_read_frames), Number(now.nb_read_frames));
    const indices = [0.1, 0.3, 0.5, 0.7, 0.9].map((at) => Math.floor(count * at));
    const size = { width: old.width, height: old.height };
    const [a, b] = await Promise.all([frames(oldPath, indices, size), frames(path, indices, size)]);
    const scores = a.map((frame, i) => psnr(frame, b[i] ?? frame));
    const average = scores.reduce((sum, n) => sum + Math.min(n, 99), 0) / scores.length;
    if (!(average >= VIDEO_PSNR)) {
      fail(`only ${db(average)} against the old encode (need ${VIDEO_PSNR})`);
    }
    lines.push(
      `  ${name}: ${old.width}×${old.height} → ${now.width}×${now.height}, ` +
        `${now.nb_read_frames} frames, ${formatBytes(before.length)} → ` +
        `${formatBytes((await readFile(path)).length)}, ${db(average)} vs old`,
    );
  } finally {
    await rm(oldPath, { force: true });
  }
}

async function main(): Promise<void> {
  const names = (await readdir(dir)).filter((n) => /\.(webp|mp4|webm)$/.test(n)).sort();
  let changed = 0;
  for (const name of names) {
    const path = join(dir, name);
    const after = await readFile(path);
    const before = await previous(name);
    if (before?.equals(after)) continue;
    changed++;
    if (!before) {
      lines.push(`  ${name}: new file (${formatBytes(after.length)}), nothing to compare`);
    } else if (name.endsWith('.webp')) {
      await verifyImage(name, before, after);
    } else {
      await verifyVideo(name, before, path);
    }
    if (name.endsWith('.poster.webp')) {
      const poster = await sharp(after).metadata();
      const video = await probe(join(dir, name.replace(/\.poster\.webp$/, '.mp4')));
      if (poster.width !== video.width || poster.height !== video.height) {
        failures.push(
          `${name}: ${poster.width}×${poster.height}, but its .mp4 is ${video.width}×${video.height}`,
        );
      }
    }
  }

  console.log(`media:verify — ${slug}: ${changed} of ${names.length} files differ from ${rev}`);
  for (const line of lines) console.log(line);
  if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('\n✔ same pictures, no worse');
}

await main();
