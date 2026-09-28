/**
 * The phone home page's ending (Portfolio.dc.html, Claude Design, Sept 2026 — `mScrollFx`): the
 * sticky "Get in touch" / résumé bar steps aside while the Contact panel, which carries the same
 * channels, is on screen, and comes back once it leaves.
 *
 * Only the state lives here: `data-away` on the bar while Contact's top is above 85% of the
 * screen (or past it). HomeMobilePanels.astro's CSS does the fade, the motion-gated slide, and
 * keeps a bar that holds focus on screen. Without this script nothing is lost: the bar docks
 * above Contact and scrolls away under the header.
 *
 * Import-free on purpose, so Astro inlines it (no request).
 */
export {};

const bar = document.querySelector<HTMLElement>('[data-m-cta]');
const contact = document.getElementById('contact-m');

if (bar && contact && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      bar.toggleAttribute('data-away', entry.isIntersecting || entry.boundingClientRect.top < 0);
    },
    // The screen less its bottom 15%: Contact "arrives" once its top passes 85% of the height.
    { rootMargin: '0px 0px -15% 0px' },
  ).observe(contact);
}
