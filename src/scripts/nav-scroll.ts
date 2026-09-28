/**
 * Header nav scroll-spy (Portfolio.dc.html, Claude Design, Sept 2026 — `navFx`/`data-navfill`):
 * on the home page, each of the four nav items (About/Experience/Work/Contact — both the
 * desktop `.site-nav` and the phone `.phone-nav`) gets a fill bar that tracks scroll progress
 * through its section, and the nearest section to the header is marked `.is-active`.
 *
 * Off the home page, or with no matching sections, this no-ops and the static `aria-current`
 * markup (SiteHeader.astro) stands. Under reduced motion (OS setting or the motion toggle) the
 * fill is discrete (0 or 1), not a continuous scroll-linked value — only the active mark still
 * tracks scroll, which is informational, not decorative motion.
 *
 * Two id sets exist for the same four sections — the desktop `<section>`s (about/experience/
 * work/contact) and the phone snap panels (about-m/experience-m/work-m/contact-m) — because a
 * document can't repeat an id; whichever set is actually laid out (not `display:none`) is used.
 */
export {};

/**
 * Phones don't lay out the desktop sections (index.astro hides them under 40rem), so an
 * in-page hash that only exists there — the hero's `#work` button, and the legacy deep links
 * `#about-section`/`#portfolio-section`/`#social-section` (index.astro) — would land nowhere.
 * Redirect those to their phone-panel equivalent, on load and on click, the same way the
 * header's own phone nav already does (SiteHeader.astro's `mobileHref`).
 */
const FRAGMENT_REDIRECT: Record<string, string> = {
  work: 'work-m',
  'about-section': 'about-m',
  'portfolio-section': 'work-m',
  'social-section': 'contact-m',
};

const isLaidOut = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement && el.offsetParent !== null;

function redirectFragment(hash: string): boolean {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  const alt = FRAGMENT_REDIRECT[id];
  if (!alt || isLaidOut(document.getElementById(id))) return false;
  const target = document.getElementById(alt);
  if (!isLaidOut(target)) return false;
  target.scrollIntoView({ block: 'start' });
  history.replaceState(null, '', `#${alt}`);
  return true;
}

if (location.hash) redirectFragment(location.hash);

document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest?.('a[href*="#"]');
  if (!(link instanceof HTMLAnchorElement) || !link.hash) return;
  if (link.origin !== location.origin || link.pathname !== location.pathname) return;
  if (redirectFragment(link.hash)) event.preventDefault();
});

const IDS = ['about', 'experience', 'work', 'contact'] as const;
type Id = (typeof IDS)[number];

/** The four sections actually laid out: the desktop `<section>`s, or else the phone panels. */
function findSections(): { sections: Record<Id, HTMLElement>; phone: boolean } | null {
  for (const [suffix, phone] of [
    ['', false],
    ['-m', true],
  ] as const) {
    const els = IDS.map((id) => document.getElementById(`${id}${suffix}`));
    if (els.every(isLaidOut)) {
      const sections = Object.fromEntries(IDS.map((id, i) => [id, els[i]])) as Record<
        Id,
        HTMLElement
      >;
      return { sections, phone };
    }
  }
  return null;
}

/**
 * Where a section comes to rest after a snap or an in-page jump: the root's top scroll padding
 * plus the section's own top scroll margin, in px from the viewport's top.
 */
function restLine(section: HTMLElement): number {
  const px = (value: string) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    px(getComputedStyle(document.documentElement).scrollPaddingTop) +
    px(getComputedStyle(section).scrollMarginTop)
  );
}

const fills = document.querySelectorAll<HTMLElement>('[data-navfill]');
const links = document.querySelectorAll<HTMLElement>('[data-nav-id]');

if (fills.length && links.length) {
  const header = document.querySelector<HTMLElement>('.site-header');
  const reduced = () =>
    document.documentElement.dataset.motion === 'off' ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let raf = 0;

  const update = () => {
    raf = 0;
    const found = findSections();
    if (!found) return;
    const { sections, phone } = found;
    // The design's `navFx` thresholds, both measured against a line at or under the header's
    // foot: a section becomes the active one once its top is within 1px of that line, and its
    // fill runs from 0 there to 1 a section-height further on. Desktop sections have a tall top
    // padding above their heading, so their line sits 40px below the header. A phone panel is
    // active once it has arrived, so its line is where a snap or a nav tap leaves it: the
    // header's foot in the design, and never above it.
    const headerH = header?.offsetHeight ?? 0;
    const line = phone ? Math.max(headerH, restLine(sections.about)) : headerH + 40;
    const doc = document.documentElement;
    const atEnd = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
    const smooth = !reduced();
    const fillOf: Record<string, number> = {};
    let active: Id | null = null;
    for (const id of IDS) {
      const r = sections[id].getBoundingClientRect();
      const past = r.top <= line + 1;
      fillOf[id] = smooth
        ? Math.max(0, Math.min(1, (line - r.top) / Math.max(1, r.height)))
        : past
          ? 1
          : 0;
      if (past) active = id;
    }
    if (atEnd) {
      for (const id of IDS) fillOf[id] = 1;
      active = 'contact';
    }
    fills.forEach((el) => {
      const id = el.dataset.navfill;
      if (id) el.style.transform = `scaleX(${fillOf[id] ?? 0})`;
    });
    links.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.navId === active);
    });
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
