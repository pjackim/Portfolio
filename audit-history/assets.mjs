/*
 * assets.mjs — inventory of the showcase images in the 2024-02-08 snapshot (commit 60c6578, the last
 * commit before 2026-01-29, i.e. "8 months before" 2026-09-29). Run from this folder: node assets.mjs
 * Scope: everything under Images/ plus img/team/1.jpg (content imagery). UI chrome (arrows, loaders,
 * patterns, font svgs, Thumbs.db) is excluded. Each file is copied to reference-assets/NN--<slug>.png
 * (alpha kept, animated GIFs reduced to frame 1) so observers view one uniform format at native size.
 * assets.json records file, original path, project (folder name), the html pages that reference it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(import.meta.dirname, 'reference-assets');
fs.mkdirSync(OUT, { recursive: true });

const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const IMG = /\.(png|jpe?g|gif|webp)$/i;
const picked = files
  .filter((f) => IMG.test(f) && (f.startsWith('Images/') || f === 'img/team/1.jpg'))
  .sort();

const htmlFiles = files.filter(
  (f) => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'),
);
const htmlText = Object.fromEntries(
  htmlFiles.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]),
);

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const assets = [];
for (const [i, orig] of picked.entries()) {
  const id = i + 1;
  const pad = String(id).padStart(2, '0');
  const parts = orig.split('/');
  const project = parts[0] === 'Images' ? slug(parts[1]) : 'team';
  const base = slug(path.basename(orig, path.extname(orig)));
  const out = `reference-assets/${pad}--${project}--${base}.png`;
  const meta = await sharp(path.join(ROOT, orig)).metadata();
  await sharp(path.join(ROOT, orig))
    .png()
    .toFile(path.join(import.meta.dirname, out));
  const variants = [orig, orig.replaceAll(' ', '%20')];
  const refs = htmlFiles.filter((f) => variants.some((v) => htmlText[f].includes(v)));
  assets.push({
    id,
    file: out,
    original: orig,
    project,
    format: meta.format,
    animated: (meta.pages ?? 1) > 1,
    frames: meta.pages ?? 1,
    referenced_by: refs,
  });
}
fs.writeFileSync(path.join(import.meta.dirname, 'assets.json'), JSON.stringify(assets, null, 1));
console.log(
  assets.length,
  'assets;',
  assets.filter((a) => a.referenced_by.length).length,
  'referenced;',
  assets.filter((a) => a.animated).length,
  'animated',
);
