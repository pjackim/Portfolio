/**
 * Encode media for a project folder and print a ready-to-paste `media:` YAML block.
 *
 *   npm run media -- <files...> --project <slug> [--name <kebab>] [--crop W:H:X:Y] [--lossy]
 *                    [--trim A-B] [--frame T] [--loop|--click] [--speed N] [--crf N] [--allow-over]
 *   npm run media -- --youtube <id> [--youtube <id>…] --project <slug>
 *
 *   images (png/jpg/jpeg/webp/tif/tiff/avif)  → <name>.webp  (lossless; q95 with --lossy)
 *   videos (gif/mp4/mov/webm)                 → <name>.mp4 + <name>.webm + <name>.poster.webp
 *   a video with --frame T                    → <name>.webp  (the frame at T, lossless)
 *   --youtube <id>                            → yt-<id>.webp poster
 *
 * Quality first: always encode from the original (the recording, the PNG), never from a file
 * that was already encoded for the site. --crop and --trim exist so that stays one generation.
 * Times are seconds or m:ss(.f). <name> is the kebab-cased source file name, or --name (one
 * input only). Without --loop/--click a video becomes a loop when it lasts ≤ 45 s (after
 * --trim and --speed), else click-to-play. A result over its guard rail fails unless
 * --allow-over. Outputs are staged in .cache/build/<slug>/ and only copied into
 * src/content/projects/<slug>/ once everything succeeded.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  BUDGETS,
  BudgetError,
  CACHE_DIR,
  PROJECTS_DIR,
  ROOT,
  VIDEO,
  type Crop,
  type MediaItem,
  type Trim,
  type VideoMode,
  encodeImage,
  encodeVideo,
  extractFrame,
  fetchYouTubePoster,
  formatBytes,
  kebab,
  mediaYaml,
  probeVideo,
} from './lib.ts';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.avif']);
const VIDEO_EXT = new Set(['.gif', '.mp4', '.mov', '.webm']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const USAGE = `usage: npm run media -- <files...> --project <slug> [--name <kebab>] [--crop W:H:X:Y] [--lossy]
                        [--trim A-B] [--frame T] [--loop|--click] [--speed N] [--crf N] [--allow-over]
       npm run media -- --youtube <id> [--youtube <id>...] --project <slug>`;

function die(message: string): never {
  console.error(`✖ ${message}\n\n${USAGE}`);
  process.exit(1);
}

/** Seconds from "83.5" or "1:23.5". */
function parseTime(text: string, flag: string): number {
  const match = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(text);
  if (!match) die(`${flag}: "${text}" is not a time (seconds or m:ss.f)`);
  return Number(match[1] ?? 0) * 60 + Number(match[2]);
}

function parseTrim(text: string | undefined): Trim | undefined {
  if (text === undefined) return undefined;
  const [start, end, extra] = text.split('-');
  if (start === undefined || end === undefined || extra !== undefined) {
    die(`--trim must be A-B, got "${text}"`);
  }
  const trim = { start: parseTime(start, '--trim'), end: parseTime(end, '--trim') };
  if (trim.end <= trim.start) die(`--trim: ${text} ends before it starts`);
  return trim;
}

function parseCrop(text: string | undefined): Crop | undefined {
  if (text === undefined) return undefined;
  const parts = text.split(':').map(Number);
  const [width, height, left, top] = parts;
  const whole = (n: number | undefined, min: number): n is number =>
    n !== undefined && Number.isInteger(n) && n >= min;
  if (parts.length !== 4 || !whole(width, 1) || !whole(height, 1) || !whole(left, 0)) {
    die(`--crop must be W:H:X:Y in pixels, got "${text}"`);
  }
  if (!whole(top, 0)) die(`--crop must be W:H:X:Y in pixels, got "${text}"`);
  return { left, top, width, height };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      project: { type: 'string' },
      name: { type: 'string' },
      crop: { type: 'string' },
      lossy: { type: 'boolean', default: false },
      lossless: { type: 'boolean', default: false },
      trim: { type: 'string' },
      frame: { type: 'string' },
      loop: { type: 'boolean', default: false },
      click: { type: 'boolean', default: false },
      speed: { type: 'string' },
      crf: { type: 'string' },
      'allow-over': { type: 'boolean', default: false },
      youtube: { type: 'string', multiple: true, default: [] },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }

  const slug = values.project;
  if (!slug) die('--project <slug> is required');
  if (!SLUG.test(slug)) die(`--project must be kebab-case, got "${slug}"`);
  if (values.loop && values.click) die('--loop and --click are mutually exclusive');
  if (values.lossless) console.log('• --lossless is now the default and can be dropped');
  const speed = values.speed === undefined ? undefined : Number(values.speed);
  if (speed !== undefined && !(speed > 0)) die(`--speed must be a positive number`);
  const crf = values.crf === undefined ? undefined : Number(values.crf);
  const [crfMin, crfMax] = VIDEO.crfRange;
  if (crf !== undefined && !(Number.isInteger(crf) && crf >= crfMin && crf <= crfMax)) {
    die(`--crf must be a whole number from ${crfMin} to ${crfMax}`);
  }
  const crop = parseCrop(values.crop);
  const trim = parseTrim(values.trim);
  const frame = values.frame === undefined ? undefined : parseTime(values.frame, '--frame');
  if (frame !== undefined && (trim || values.loop || values.click || speed !== undefined)) {
    die('--frame makes a still: it cannot be combined with --trim, --loop, --click or --speed');
  }
  if (values.name !== undefined) {
    if (!SLUG.test(values.name)) die(`--name must be kebab-case, got "${values.name}"`);
    if (positionals.length !== 1) die('--name needs exactly one input file');
  }
  if (positionals.length === 0 && values.youtube.length === 0) die('nothing to do');

  const staging = join(CACHE_DIR, 'build', slug);
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  const outputs: string[] = [];
  const items: MediaItem[] = [];
  const seen = new Set<string>();
  const claim = (file: string) => {
    if (seen.has(file)) die(`two inputs map to the same output ${file}`);
    seen.add(file);
    outputs.push(file);
  };
  const still = async (input: string | Buffer, name: string) => {
    claim(`${name}.webp`);
    const r = await encodeImage(input, join(staging, `${name}.webp`), {
      lossy: values.lossy,
      crop,
    });
    console.log(`✔ ${name}.webp  ${r.width}×${r.height} ${r.encoding}  ${formatBytes(r.bytes)}`);
    items.push({ kind: 'image', file: `${name}.webp` });
  };

  for (const arg of positionals) {
    // npm runs scripts from the package root; INIT_CWD is where the user typed the command.
    const input = resolve(process.env.INIT_CWD ?? process.cwd(), arg);
    if (!existsSync(input)) die(`no such file: ${arg}`);
    const ext = extname(input).toLowerCase();
    const name = values.name ?? kebab(basename(input, extname(input)));
    if (!name) die(`cannot derive a kebab-case name from ${arg}`);

    if (IMAGE_EXT.has(ext)) {
      if (frame !== undefined || trim) die(`${arg}: --frame and --trim only apply to videos`);
      await still(input, name);
    } else if (VIDEO_EXT.has(ext) && frame !== undefined) {
      await still(await extractFrame(input, frame), name);
    } else if (VIDEO_EXT.has(ext)) {
      for (const f of [`${name}.mp4`, `${name}.webm`, `${name}.poster.webp`]) claim(f);
      let mode: VideoMode;
      if (values.loop) mode = 'loop';
      else if (values.click) mode = 'click';
      else {
        const span = trim ? trim.end - trim.start : (await probeVideo(input)).duration;
        mode = span / (speed ?? 1) <= BUDGETS.loop.maxDuration ? 'loop' : 'click';
      }
      console.log(`• ${arg} → ${name}.{mp4,webm,poster.webp} (${mode})`);
      try {
        const r = await encodeVideo(input, join(staging, name), {
          mode,
          speed,
          trim,
          crop,
          crf,
          allowOver: values['allow-over'],
          log: (m) => console.log(m),
        });
        const over = r.mp4.overBudget || r.webm.overBudget ? '  ⚠ over budget (--allow-over)' : '';
        console.log(
          `✔ ${name}: ${r.mp4.width}×${r.mp4.height} ${r.fps}fps ${r.duration.toFixed(1)}s, ` +
            `mp4 ${formatBytes(r.mp4.bytes)} (crf ${r.mp4.crf}), ` +
            `webm ${formatBytes(r.webm.bytes)} (crf ${r.webm.crf}), ` +
            `poster ${formatBytes(r.poster.bytes)}${over}`,
        );
        items.push({ kind: 'video', file: `${name}.mp4`, autoplay: mode === 'loop' });
      } catch (error) {
        if (error instanceof BudgetError) {
          die(`${arg}: ${error.message}. Try --trim, --click, --speed, or --allow-over.`);
        }
        throw error;
      }
    } else {
      die(`unsupported file type ${ext || '(none)'}: ${arg}`);
    }
  }

  for (const id of values.youtube) {
    claim(`yt-${id}.webp`);
    const r = await fetchYouTubePoster(id, join(staging, `yt-${id}.webp`));
    console.log(`✔ yt-${id}.webp  ${r.width}×${r.height} (${r.source})  ${formatBytes(r.bytes)}`);
    items.push({ kind: 'youtube', id });
  }

  const dest = join(PROJECTS_DIR, slug);
  await mkdir(dest, { recursive: true });
  for (const file of outputs) {
    const replaced = existsSync(join(dest, file)) ? ' (replaced)' : '';
    await copyFile(join(staging, file), join(dest, file));
    console.log(`→ ${join(dest, file).slice(ROOT.length + 1)}${replaced}`);
  }
  await rm(staging, { recursive: true, force: true });

  // The exact recipe, so the file can be reproduced from its original later.
  const recipe = process.argv.slice(2).map((a) => (/\s/.test(a) ? `"${a}"` : a));
  console.log(
    `\n# for the project's "# Sources:" header:\n# media: npm run media -- ${recipe.join(' ')}`,
  );

  console.log(`\n# paste into src/content/projects/${slug}/index.md frontmatter:\n`);
  process.stdout.write(mediaYaml(items));
}

await main();
