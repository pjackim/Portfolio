/**
 * Share images and structured data (spec-design-content §6, spec-architecture §6): the default
 * Open Graph card, per-project cover crops, and the JSON-LD `Person` / `CreativeWork` objects.
 * Every URL here is absolute (`site` + base).
 */
import { getImage } from 'astro:assets';
import { site } from '../data/site';
import { CAPABILITY_GROUPS } from '../data/taxonomy';
import { imageFacts } from './images';
import type { Project } from './projects';
import { absoluteUrl } from './url';

export interface OgImage {
  /** Absolute URL. */
  src: string;
  width: number;
  height: number;
  alt: string;
}

/** `public/og-default.png`, rendered by `scripts/og/render-default.ts`. */
export const DEFAULT_OG_IMAGE: OgImage = {
  src: absoluteUrl('og-default.png'),
  width: 1200,
  height: 630,
  alt: `${site.name} — cyber security, reverse engineering, software`,
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
/** Smaller crops render as small thumbnails (or not at all) on some platforms. */
const OG_MIN_WIDTH = 600;
const OG_MIN_HEIGHT = 315;
/** `--surface-2-l`: the light plate the site shows transparent covers on. */
const ALPHA_PLATE = '#e8eaec';

/**
 * Maps a CSS `object-position` made only of keywords (`top`, `left bottom`, …) to sharp's crop
 * gravity. Anything else (lengths, percentages) crops from the centre.
 */
function cropPosition(objectPosition: string | undefined): string | undefined {
  const words = objectPosition?.trim().toLowerCase().split(/\s+/) ?? [];
  if (!words.every((w) => ['left', 'right', 'top', 'bottom', 'center'].includes(w))) return;
  const x = words.find((w) => w === 'left' || w === 'right');
  const y = words.find((w) => w === 'top' || w === 'bottom');
  return [x, y].filter(Boolean).join(' ') || undefined;
}

/**
 * The project's cover cropped to 1200×630 for link previews — JPEG q85, 4–8× smaller than PNG
 * for these covers. Astro never upscales, so a smaller cover gets the largest crop of the same
 * 40:21 shape instead, and one too small for even 600×315 gets the default card. Transparent
 * covers are flattened onto the site's light plate, so dark artwork never lands on black.
 */
export async function coverOgImage(project: Project): Promise<OgImage> {
  const { cover, coverAlt, coverPosition } = project.data;
  const facts = await imageFacts(cover);
  const scale = Math.min(1, facts.width / OG_WIDTH, facts.height / OG_HEIGHT);
  const width = Math.round(OG_WIDTH * scale);
  const height = Math.round(OG_HEIGHT * scale);
  if (width < OG_MIN_WIDTH || height < OG_MIN_HEIGHT) return DEFAULT_OG_IMAGE;
  const position = cropPosition(coverPosition);
  const image = await getImage({
    src: cover,
    width,
    height,
    fit: 'cover',
    ...(position ? { position } : {}),
    background: ALPHA_PLATE,
    format: 'jpeg',
    quality: 85,
    // One file: without this the global `constrained` layout adds a srcset of unused widths.
    layout: 'none',
  });
  return { src: new URL(image.src, import.meta.env.SITE).href, width, height, alt: coverAlt };
}

const PERSON_ID = `${absoluteUrl()}#person`;

/** True when lowercase `text` contains `term` as a whole word ("CLI" is not in "client"). */
function mentionsTerm(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text);
}

/**
 * JSON-LD `Person` for the home page. No email. `knowsAbout`: the capability group labels (for
 * "Languages", its items), then the featured case studies' stack terms that the capability
 * groups also name — the key ones, not incidental tooling such as "CLI" or "tkinter".
 */
export function personJsonLd(featured: readonly Project[]): object {
  const capabilityText = CAPABILITY_GROUPS.flatMap((g) => g.items.map((item) => item.name))
    .join(' · ')
    .toLowerCase();
  const terms = [
    ...CAPABILITY_GROUPS.flatMap((g) =>
      g.id === 'languages' ? g.items.map((item) => item.name) : [g.label],
    ),
    ...featured.flatMap((p) => p.data.stack).filter((term) => mentionsTerm(capabilityText, term)),
  ];
  const knowsAbout = new Map<string, string>();
  for (const term of terms) {
    if (!knowsAbout.has(term.toLowerCase())) knowsAbout.set(term.toLowerCase(), term);
  }
  const [locality, region] = site.location.split(', ');
  if (!locality || !region) throw new Error(`site.location "${site.location}" is not "City, ST"`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: site.name,
    url: absoluteUrl(),
    jobTitle: site.role,
    worksFor: { '@type': 'Organization', name: site.employer },
    alumniOf: { '@type': 'CollegeOrUniversity', name: site.school },
    address: {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressRegion: region,
      // `region` is a US state code (spec-design-content §6: Columbia / MD / US).
      addressCountry: 'US',
    },
    sameAs: [site.github, site.linkedin],
    knowsAbout: [...knowsAbout.values()],
  };
}

/**
 * JSON-LD `CreativeWork` for a case study. `dateCreated` is the project year, left out when the
 * period starts with "c." — an age-derived estimate (Ruling R5), not a real year.
 */
export function creativeWorkJsonLd(project: Project, image: OgImage): object {
  const { data } = project;
  const approximate = data.period?.startsWith('c.') ?? false;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: data.title,
    description: data.summary,
    ...(approximate ? {} : { dateCreated: String(data.year) }),
    author: { '@type': 'Person', '@id': PERSON_ID, name: site.name },
    url: absoluteUrl(`work/${project.id}/`),
    image: image.src,
    keywords: data.stack,
  };
}
