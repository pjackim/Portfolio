/**
 * Encode media for a project folder and print a ready-to-paste `media:` YAML block.
 *
 *   npm run media -- <files...> --project <slug> [--lossless] [--loop|--click] [--speed N] [--allow-over]
 *   npm run media -- --youtube <id> [--youtube <id>…] --project <slug>
 *
 *   images (png/jpg/jpeg/webp/tif/tiff/avif)  → <name>.webp  (q90, or lossless with --lossless)
 *   videos (gif/mp4/mov/webm)                 → <name>.mp4 + <name>.webm + <name>.poster.webp
 *   --youtube <id>                            → yt-<id>.webp poster
 *
 * <name> is the kebab-cased source file name. Without --loop/--click a video becomes a loop
 * when it lasts ≤ 45 s (after --speed), else click-to-play. Over-budget videos fail unless
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
  type MediaItem,
  type VideoMode,
  encodeImage,
  encodeVideo,
  fetchYouTubePoster,
  formatBytes,
  kebab,
  mediaYaml,
  probeVideo,
} from './lib.ts';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.avif']);
const VIDEO_EXT = new Set(['.gif', '.mp4', '.mov', '.webm']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const USAGE = `usage: npm run media -- <files...> --project <slug> [--lossless] [--loop|--click] [--speed N] [--allow-over]
       npm run media -- --youtube <id> [--youtube <id>...] --project <slug>`;

function die(message: string): never {
  console.error(`✖ ${message}\n\n${USAGE}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      project: { type: 'string' },
      lossless: { type: 'boolean', default: false },
      loop: { type: 'boolean', default: false },
      click: { type: 'boolean', default: false },
      speed: { type: 'string' },
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
  const speed = values.speed === undefined ? undefined : Number(values.speed);
  if (speed !== undefined && !(speed > 0)) die(`--speed must be a positive number`);
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

  for (const arg of positionals) {
    // npm runs scripts from the package root; INIT_CWD is where the user typed the command.
    const input = resolve(process.env.INIT_CWD ?? process.cwd(), arg);
    if (!existsSync(input)) die(`no such file: ${arg}`);
    const ext = extname(input).toLowerCase();
    const name = kebab(basename(input, extname(input)));
    if (!name) die(`cannot derive a kebab-case name from ${arg}`);

    if (IMAGE_EXT.has(ext)) {
      claim(`${name}.webp`);
      const r = await encodeImage(input, join(staging, `${name}.webp`), {
        lossless: values.lossless,
      });
      console.log(`✔ ${name}.webp  ${r.width}×${r.height} ${r.encoding}  ${formatBytes(r.bytes)}`);
      items.push({ kind: 'image', file: `${name}.webp` });
    } else if (VIDEO_EXT.has(ext)) {
      for (const f of [`${name}.mp4`, `${name}.webm`, `${name}.poster.webp`]) claim(f);
      let mode: VideoMode;
      if (values.loop) mode = 'loop';
      else if (values.click) mode = 'click';
      else {
        const { duration } = await probeVideo(input);
        mode = duration / (speed ?? 1) <= BUDGETS.loop.maxDuration ? 'loop' : 'click';
      }
      console.log(`• ${arg} → ${name}.{mp4,webm,poster.webp} (${mode})`);
      try {
        const r = await encodeVideo(input, join(staging, name), {
          mode,
          speed,
          allowOver: values['allow-over'],
          log: (m) => console.log(m),
        });
        const over = r.mp4.overBudget || r.webm.overBudget ? '  ⚠ over budget (--allow-over)' : '';
        console.log(
          `✔ ${name}: mp4 ${formatBytes(r.mp4.bytes)} (crf ${r.mp4.crf}, ${r.mp4.width}px), ` +
            `webm ${formatBytes(r.webm.bytes)} (crf ${r.webm.crf}, ${r.webm.width}px), ` +
            `poster ${formatBytes(r.poster.bytes)}${over}`,
        );
        items.push({ kind: 'video', file: `${name}.mp4`, autoplay: mode === 'loop' });
      } catch (error) {
        if (error instanceof BudgetError) {
          die(`${arg}: ${error.message}. Try --click, --speed, or --allow-over.`);
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

  console.log(`\n# paste into src/content/projects/${slug}/index.md frontmatter:\n`);
  process.stdout.write(mediaYaml(items));
}

await main();
