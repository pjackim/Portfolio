const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const withBase = (p = '') =>
  /^(?:[a-z]+:|\/\/|#)/i.test(p) ? p : B + p.replace(/^\/+/, '');

/** Absolute URL (`site` + base) of a path relative to the base, e.g. `absoluteUrl('work/')`. */
export const absoluteUrl = (p = '') => new URL(withBase(p), import.meta.env.SITE).href;
