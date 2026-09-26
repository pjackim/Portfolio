const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const withBase = (p = '') =>
  /^(?:[a-z]+:|\/\/|#)/i.test(p) ? p : B + p.replace(/^\/+/, '');
