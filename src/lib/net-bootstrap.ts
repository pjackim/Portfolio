/**
 * The adaptive image loader's head script (spec: "quality first"): project media ships at full
 * quality, and only a connection that is detected as poor gets lighter images first, upgraded in
 * the background by src/scripts/net.ts. BaseLayout emits this string byte for byte, blocking in
 * the head, and hashes it into the CSP (src/lib/csp.ts), so it must stay plain JavaScript with
 * no `</script` and no backtick or `${`.
 *
 * `<html data-net>` is absent for full quality (the default), `slow` for light-first-then-full,
 * `save` for light with no upgrade (Save-Data). Detection, strongest first: the `net` override in
 * localStorage (`fast`, `slow` or `save`: for tests, and a future quality switch), Save-Data or
 * `prefers-reduced-data`, a verdict stored for this tab by src/scripts/net.ts (a measured stall),
 * and NetInfo's `effectiveType` of 2g or 3g. Nothing here reads `rtt` or `downlink`: Chromium
 * reports about 1.5–2.7 Mbps on a fast desktop until it has seen traffic, which would make most
 * desktops "slow".
 *
 * Light mode scales the lengths in an image's `sizes` (and its `<source>`s'), so the browser
 * picks a smaller candidate from the srcset it already has: no separate files. The authored list
 * is kept in `data-sizes` for the upgrade. Every adaptive image ships `loading="lazy"` (no engine
 * fetches one before this has run), and the ones marked `priority` are made eager here, after
 * their `sizes` are settled. Without JS lazy loading is off by spec: they load at full quality.
 *
 * Events on `document`: `net:check` (re-evaluate; `detail: 'slow'` forces slow), `net:change`
 * (the verdict changed). `<html data-net-busy>` is set in slow mode until the upgrade queue
 * drains (net.ts).
 */
export const NET_BOOTSTRAP = String.raw`{
  const d = document.documentElement;
  const c = navigator.connection;
  const mode = () => {
    try {
      const o = localStorage.getItem('net');
      if (o === 'fast') return '';
      if (o === 'slow' || o === 'save') return o;
    } catch {}
    if ((c && c.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches) return 'save';
    try {
      if (sessionStorage.getItem('net') === 'slow') return 'slow';
    } catch {}
    return c && /2g|3g/.test(c.effectiveType) ? 'slow' : '';
  };
  const set = (m) => {
    if (m) d.dataset.net = m;
    else delete d.dataset.net;
    if (m === 'slow') d.dataset.netBusy = '';
    else delete d.dataset.netBusy;
  };
  const lite = (img) => {
    const whole = d.dataset.net === 'save' || img.dataset.netImg === 'lite';
    const k = Math.min(1, (whole ? 1 : 0.5) / devicePixelRatio);
    const p = img.parentNode;
    for (const e of p.nodeName === 'PICTURE' ? p.children : [img]) {
      const s = e.dataset.sizes || e.getAttribute('sizes');
      if (!s) continue;
      e.dataset.sizes = s;
      e.setAttribute(
        'sizes',
        s.replace(/([\d.]+)(px|rem|vw)(?=\s*(?:,|$))/g, (_, n, u) => +(n * k).toFixed(2) + u),
      );
    }
    img.dataset.netState = 'lite';
  };
  const sync = (e) => {
    const m = (e && e.detail) || mode();
    if (m === (d.dataset.net || '')) return;
    set(m);
    if (m) {
      const waiting = 'img[data-net-img]:not([data-net-img="priority"]):not([data-net-state])';
      for (const img of document.querySelectorAll(waiting)) if (!img.complete) lite(img);
    }
    document.dispatchEvent(new Event('net:change'));
  };
  set(mode());
  const see = (records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeName !== 'IMG' || n.dataset.netImg === undefined) continue;
        if (d.dataset.net) lite(n);
        if (n.dataset.netImg === 'priority') n.loading = 'eager';
      }
    }
  };
  const seen = new MutationObserver(see);
  seen.observe(d, { childList: true, subtree: true });
  addEventListener(
    'DOMContentLoaded',
    () => {
      see(seen.takeRecords());
      seen.disconnect();
    },
    { once: true },
  );
  addEventListener('pageshow', (e) => {
    if (e.persisted) sync();
  });
  if (c && c.addEventListener) c.addEventListener('change', sync);
  document.addEventListener('net:check', sync);
}`;
