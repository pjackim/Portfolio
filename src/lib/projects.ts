/**
 * Project collection queries (spec-architecture §4). Every getter goes through `getProjects()`,
 * which excludes drafts outside dev and enforces the collection invariants at build time.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { CAPABILITY_GROUPS, GROUPS, groupSeenIn, type Group } from '../data/taxonomy';
import { REMOVED_LEGACY } from './legacy';

export type Project = CollectionEntry<'projects'>;

export interface PrevNext {
  prev: Project | undefined;
  next: Project | undefined;
}

const FEATURED_MIN = 3;
const FEATURED_MAX = 8;

const byOrder = (a: Project, b: Project) =>
  a.data.order - b.data.order || a.data.title.localeCompare(b.data.title);

const byYearDescThenTitle = (a: Project, b: Project) =>
  b.data.year - a.data.year || a.data.title.localeCompare(b.data.title);

/**
 * Throws when the collection breaks an invariant: duplicate `order` among featured projects,
 * a legacy path claimed twice (or colliding with a removed page's redirect), a featured
 * count outside 3–8, or a capability "Seen in" slug that isn't a published project id.
 */
export function validateProjects(projects: readonly Project[]): void {
  const featured = projects.filter((p) => p.data.featured);
  if (featured.length < FEATURED_MIN || featured.length > FEATURED_MAX) {
    throw new Error(
      `projects: ${featured.length} featured projects; expected ${FEATURED_MIN}–${FEATURED_MAX} ` +
        `(${featured.map((p) => p.id).join(', ') || 'none'})`,
    );
  }

  const orders = new Map<number, string>();
  for (const p of featured) {
    const other = orders.get(p.data.order);
    if (other !== undefined) {
      throw new Error(
        `projects: duplicate featured order ${p.data.order} (${other}, ${p.id}) — ` +
          'each featured project needs a unique `order`',
      );
    }
    orders.set(p.data.order, p.id);
  }

  const owners = new Map<string, string>(
    Object.keys(REMOVED_LEGACY).map((path) => [path, 'REMOVED_LEGACY']),
  );
  for (const p of projects) {
    for (const path of p.data.legacyPaths) {
      const other = owners.get(path);
      if (other !== undefined) {
        throw new Error(`projects: duplicate legacy path ${path} (${other}, ${p.id})`);
      }
      owners.set(path, p.id);
    }
  }

  const ids = new Set(projects.map((p) => p.id));
  for (const group of CAPABILITY_GROUPS) {
    for (const slug of groupSeenIn(group)) {
      if (!ids.has(slug)) {
        throw new Error(
          `taxonomy: CAPABILITY_GROUPS "${group.id}" seenIn "${slug}" is not a published project id`,
        );
      }
    }
  }
}

/** All published projects (drafts included only in dev), validated. */
export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection(
    'projects',
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  validateProjects(projects);
  return projects;
}

/**
 * Every project entry, drafts included, unvalidated. Only for the legacy redirect stubs: a
 * legacy URL must keep resolving while its project is a draft. Pages use `getProjects()`.
 */
export async function getAllProjectEntries(): Promise<Project[]> {
  return getCollection('projects');
}

/** Featured projects, sorted by `order`. */
export async function getFeatured(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.data.featured).sort(byOrder);
}

/** Non-featured projects, newest year first, then by title. */
export async function getArchive(): Promise<Project[]> {
  return (await getProjects()).filter((p) => !p.data.featured).sort(byYearDescThenTitle);
}

/** The archive rows shown on the home page (`showOnHome`), in archive order. */
export async function getHomeArchive(): Promise<Project[]> {
  return (await getArchive()).filter((p) => p.data.showOnHome);
}

/**
 * Projects by group, keyed in `GROUPS` order (every group present, possibly empty). Within a
 * group: featured first by `order`, then the archive by year (newest first) and title.
 */
export async function getByGroup(): Promise<Map<Group, Project[]>> {
  const [featured, archive] = await Promise.all([getFeatured(), getArchive()]);
  const groups = new Map<Group, Project[]>(GROUPS.map((g) => [g, []]));
  for (const p of [...featured, ...archive]) groups.get(p.data.group)?.push(p);
  return groups;
}

/**
 * Neighbours for the project footer. Featured projects step through the featured list by
 * `order`; archive projects step through the archive by year. No wraparound: `undefined` at
 * either end. Throws for an unknown id.
 */
export async function getPrevNext(id: string): Promise<PrevNext> {
  const [featured, archive] = await Promise.all([getFeatured(), getArchive()]);
  for (const list of [featured, archive]) {
    const i = list.findIndex((p) => p.id === id);
    if (i !== -1) return { prev: list[i - 1], next: list[i + 1] };
  }
  throw new Error(`getPrevNext: no published project with id "${id}"`);
}
