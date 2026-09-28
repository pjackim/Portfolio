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

const IDS = ['about', 'experience', 'work', 'contact'] as const;
type Id = (typeof IDS)[number];

function findSections(): Record<Id, HTMLElement> | null {
  const laidOut = (el: Element | null): el is HTMLElement =>
    el instanceof HTMLElement && el.offsetParent !== null;
  const desktop = IDS.map((id) => document.getElementById(id));
  if (desktop.every(laidOut)) {
    return Object.fromEntries(IDS.map((id, i) => [id, desktop[i] as HTMLElement])) as Record<
      Id,
      HTMLElement
    >;
  }
  const mobile = IDS.map((id) => document.getElementById(`${id}-m`));
  if (mobile.every(laidOut)) {
    return Object.fromEntries(IDS.map((id, i) => [id, mobile[i] as HTMLElement])) as Record<
      Id,
      HTMLElement
    >;
  }
  return null;
}

const fills = document.querySelectorAll<HTMLElement>('[data-navfill]');
const links = document.querySelectorAll<HTMLElement>('[data-nav-id]');
const defaults = document.querySelectorAll<HTMLElement>('[data-default-active]');

if (fills.length && links.length) {
  const header = document.querySelector<HTMLElement>('.site-header');
  const reduced = () =>
    document.documentElement.dataset.motion === 'off' ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let raf = 0;
  let ran = false;

  const update = () => {
    raf = 0;
    const sections = findSections();
    if (!sections) return;
    if (!ran) {
      ran = true;
      defaults.forEach((el) => el.removeAttribute('data-default-active'));
    }
    const headerH = header?.offsetHeight ?? 0;
    const nav = headerH + 40;
    const doc = document.documentElement;
    const atEnd = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
    const smooth = !reduced();
    const fillOf: Record<string, number> = {};
    let active: Id | null = null;
    for (const id of IDS) {
      const r = sections[id].getBoundingClientRect();
      const past = r.top <= nav + 41;
      fillOf[id] = smooth
        ? Math.max(0, Math.min(1, (nav + 40 - r.top) / Math.max(1, r.height)))
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
