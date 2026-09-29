/**
 * Playwright's WebKit on Windows (the WinCairo port) lacks three things its Linux and macOS
 * builds have, so the specs that depend on them skip there; CI (ubuntu) still runs every one.
 * Probed against this site (Sept 2026, WebKit 2359):
 * - Media: a <video> whose first <source> is WebM (`video/webm; codecs="vp9"`) never leaves
 *   networkState LOADING, so the element keeps delaying the document's `load` event and
 *   `page.goto` times out on every page with a loop. An mp4-only source, or none, loads fine.
 * - Keyboard: Tab and Alt+Tab both visit form controls only, never links, so no keystroke reaches
 *   the skip link or a card's link. (Linux WebKit honours Alt+Tab as Safari's Option+Tab.)
 * - Dialogs: the same-document view transition that closes the lightbox leaves the <dialog>
 *   open, or crashes the page. Opening it, and closing it with reduced motion, work.
 */
export const isWindowsWebKit = (browserName: string): boolean =>
  process.platform === 'win32' && browserName === 'webkit';

export const WINDOWS_WEBKIT = {
  media: 'Windows WebKit: a WebM <source> never finishes loading, so `load` never fires',
  links: 'Windows WebKit: neither Tab nor Alt+Tab focuses links',
  dialog: "Windows WebKit: the lightbox's closing view transition hangs or crashes the page",
} as const;
