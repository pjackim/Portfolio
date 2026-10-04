/**
 * Project section index scrollspy (interactions spec §4; markup in CaseIndex.astro). The
 * current section is the last one whose heading has passed a reading line 30% down the viewport.
 * One IntersectionObserver watches the headings against a band that reaches from far above the
 * page down to that line, so a heading is "in" the band exactly when it is above the line — and
 * even a long jump (a click in the index) flips every heading it crosses.
 *
 * The current link gets `aria-current="true"`; the accent tick slides to it along the rail (its
 * offset and height through CSSOM custom properties, re-measured when the index resizes).
 * Nothing is current above the first section. The index only shows from 72rem, and the spy only
 * runs while it does.
 */
import { fragmentTarget } from './fragment';

const WIDE = '(width >= 72rem)';
/** The reading line, as the share of the viewport below it (rootMargin bottom). */
const BELOW_LINE = '-70%';

function spy(nav: HTMLElement): void {
  const track = nav.querySelector<HTMLElement>('.case-index__track') ?? nav;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const targets = links.map((link) => fragmentTarget(link.hash));
  const above = new Set<Element>();
  let current = -2;
  let observer: IntersectionObserver | null = null;

  const place = () => {
    const link = links[current];
    if (!link) {
      delete nav.dataset.spy;
      return;
    }
    track.style.setProperty('--tick-y', `${link.offsetTop}px`);
    track.style.setProperty('--tick-h', `${link.offsetHeight}px`);
    nav.dataset.spy = 'on';
  };

  const update = () => {
    let next = -1;
    targets.forEach((target, i) => {
      if (target && above.has(target)) next = i;
    });
    if (next === current) return;
    current = next;
    links.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    place();
  };

  const start = () => {
    if (observer) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) above.add(entry.target);
          else above.delete(entry.target);
        }
        update();
      },
      { rootMargin: `100000px 0px ${BELOW_LINE} 0px` },
    );
    for (const target of targets) if (target) observer.observe(target);
  };

  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  const wide = matchMedia(WIDE);
  const sync = () => (wide.matches ? start() : stop());
  wide.addEventListener('change', sync);
  sync();
  // Fonts, a resize: the links' boxes can change under the tick.
  new ResizeObserver(() => {
    if (current >= 0) place();
  }).observe(track);
}

const nav = document.querySelector<HTMLElement>('[data-case-index]');
if (nav) spy(nav);
