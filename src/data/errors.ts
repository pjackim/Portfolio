/**
 * Copy for the error screens (src/components/ErrorScreen.astro). One entry per HTTP status a
 * visitor could be shown; reason phrases are the standard ones (RFC 9110 §15). The copy is
 * written for this site, in its plain voice: it states what happened and what to do, and makes
 * no claim about Parker.
 *
 * Only 404 is ever served by the host on its own (GitHub Pages sends `404.html` for any missing
 * path), so `src/pages/404.astro` builds it. Every other status builds to `errors/<code>/`
 * (`src/pages/errors/[code].astro`), ready to be wired in as an error document wherever the
 * site is served from.
 *
 * Body text puts `code` in backticks; the screen renders those spans as inline code.
 */

/** Where the request stopped, as drawn by the screen's request trace. */
export type ErrorStop = 'request' | 'server' | 'page';

export interface ErrorScreenCopy {
  code: number;
  /** The status's reason phrase, e.g. "Not Found". */
  status: string;
  /** The `<h1>`: what happened, in a few words. */
  title: string;
  /** One or two short sentences: why, and what to do. */
  body: string;
  /** Where the request stopped: never left the browser, failed at the server, or no page came back. */
  stop: ErrorStop;
  /** Whether trying the same address again can help. */
  retry: boolean;
}

export const ERROR_SCREENS: readonly ErrorScreenCopy[] = [
  {
    code: 400,
    status: 'Bad Request',
    title: 'That request was malformed.',
    body: "The server couldn't read what your browser sent. Check the address, or start from the home page.",
    stop: 'request',
    retry: false,
  },
  {
    code: 401,
    status: 'Unauthorized',
    title: 'This page asks for a login.',
    body: 'This site has no private pages, so a login prompt is a mistake. Start from the home page.',
    stop: 'page',
    retry: false,
  },
  {
    code: 403,
    status: 'Forbidden',
    title: 'Access denied.',
    body: 'The server understood the request and refused it. Everything meant for visitors is linked from the home page.',
    stop: 'page',
    retry: false,
  },
  {
    code: 404,
    status: 'Not Found',
    title: 'Page not found.',
    body: 'The link may be old or mistyped. The site was rebuilt, and projects now live under `/work/`.',
    stop: 'page',
    retry: false,
  },
  {
    code: 405,
    status: 'Method Not Allowed',
    title: "That action isn't allowed here.",
    body: 'This site is read-only. It has no forms and accepts no uploads.',
    stop: 'page',
    retry: false,
  },
  {
    code: 408,
    status: 'Request Timeout',
    title: 'The request timed out.',
    body: 'The connection stalled before the page finished loading. Try again.',
    stop: 'request',
    retry: true,
  },
  {
    code: 410,
    status: 'Gone',
    title: 'This page is gone.',
    body: 'It was removed and has no replacement. The current projects are under `/work/`.',
    stop: 'page',
    retry: false,
  },
  {
    code: 429,
    status: 'Too Many Requests',
    title: 'Too many requests.',
    body: 'Your connection sent a lot of requests in a short time. Wait a minute, then try again.',
    stop: 'request',
    retry: true,
  },
  {
    code: 500,
    status: 'Internal Server Error',
    title: 'Something broke on the server.',
    body: "That's not something you did. Try again in a moment.",
    stop: 'server',
    retry: true,
  },
  {
    code: 502,
    status: 'Bad Gateway',
    title: 'Bad gateway.',
    body: 'A server between you and this site sent back an invalid response. Try again in a moment.',
    stop: 'server',
    retry: true,
  },
  {
    code: 503,
    status: 'Service Unavailable',
    title: 'Temporarily unavailable.',
    body: "The server can't take requests right now. Try again in a few minutes.",
    stop: 'server',
    retry: true,
  },
  {
    code: 504,
    status: 'Gateway Timeout',
    title: 'The server took too long.',
    body: 'A server between you and this site waited too long for a reply. Try again in a moment.',
    stop: 'server',
    retry: true,
  },
];

/** The screen for `code`; throws on a code with no entry, so a typo fails the build. */
export function errorScreen(code: number): ErrorScreenCopy {
  const screen = ERROR_SCREENS.find((entry) => entry.code === code);
  if (!screen) throw new Error(`errors: no screen for status ${code}`);
  return screen;
}

/** Document title, in the site's "Page — Parker Jackim" pattern. */
export const errorTitle = ({ code, status }: ErrorScreenCopy, name: string): string =>
  `${code} ${status} — ${name}`;

/** Meta description: the status and the screen's own sentence, without the code markup. */
export const errorDescription = ({ code, status, body }: ErrorScreenCopy): string =>
  `${code} ${status}. ${body.replaceAll('`', '')}`;

/** Statuses built to `errors/<code>/`: everything but 404, which the host serves from the root. */
export const ERROR_ROUTE_CODES: readonly number[] = ERROR_SCREENS.filter(
  ({ code }) => code !== 404,
).map(({ code }) => code);
