/**
 * Figure lightbox (interactions spec §4; markup in Lightbox.astro). Every figure image
 * with a large rendition — the figures MediaFigure gives a "Full size" link — opens the dialog:
 * a click on the image, or on the link (Enter included). A modified click on the link (new tab,
 * new window) still just opens the image; without JS the link always does.
 *
 * Open: the dialog shows the thumbnail's own (already decoded) image at once, sized to the large
 * rendition's box, and swaps the large rendition in once it has decoded — same box, so nothing
 * moves. While motion is allowed that happens inside a same-document view transition: the
 * thumbnail and the dialog image share one name (`lightbox-image`, through CSSOM, for the
 * duration only), so the picture morphs out of the page and back into it on close. `vt-lightbox`
 * on <html> keeps anything else from being captured on its own meanwhile.
 *
 * Its stylesheet (src/styles/lightbox.css) comes with this script, not with the page, and the
 * figures are wired only once it has loaded — so the dialog is never seen unstyled.
 *
 * Close: the close button, Esc, or a click on the empty stage or backdrop. Focus goes to the close
 * button on open and back to the figure's link on close (the image itself isn't focusable), and
 * <html> is scroll-locked (`lightbox-open`) while it's open.
 */
import { pad2 } from '../lib/format';
import stylesheet from '../styles/lightbox.css?url';
import { motionAllowed, startTransition } from './motion';

const root = document.documentElement;
const NAME = 'lightbox-image';
const VT_CLASS = 'vt-lightbox';
const LOCK_CLASS = 'lightbox-open';

interface Figure {
  figure: HTMLElement;
  /** Where focus returns on close: the "Full size" link, or a video's play/pause chip. */
  link: HTMLElement;
  thumb: HTMLImageElement | null;
  /** An autoplay loop's in-page video: opens a playing copy, with no morph. */
  video?: HTMLVideoElement;
}

function setName(el: HTMLElement): void {
  el.style.setProperty('view-transition-name', NAME);
}

function clearName(el: HTMLElement): void {
  el.style.removeProperty('view-transition-name');
  if (el.style.length === 0) el.removeAttribute('style');
}

const onScreen = (el: Element): boolean => {
  const box = el.getBoundingClientRect();
  return box.bottom > 0 && box.top < innerHeight && box.width > 0;
};

function wire(dialog: HTMLDialogElement, figures: Figure[]): void {
  const frame = dialog.querySelector<HTMLElement>('[data-lightbox-frame]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-lightbox-stage]');
  const number = dialog.querySelector<HTMLElement>('[data-lightbox-number]');
  const name = dialog.querySelector<HTMLElement>('[data-lightbox-name]');
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]');
  // The dialog's own "Full size" link comes out of a <template>, into the page only once it has
  // an href (the first time the lightbox opens): an <a> without one isn't a link.
  const fullTemplate = dialog.querySelector<HTMLTemplateElement>('template[data-lightbox-full]');
  const full = fullTemplate?.content.firstElementChild?.cloneNode(true) as HTMLAnchorElement | null;
  const fullName = full?.querySelector<HTMLElement>('[data-lightbox-full-name]');
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]');
  const img = document.createElement('img');
  img.decoding = 'async';
  frame.append(img);
  const clip = document.createElement('video');
  clip.controls = true;
  clip.loop = true;
  clip.muted = true;
  clip.playsInline = true;
  clip.hidden = true;
  frame.append(clip);
  /** The page's own loop, paused while its copy plays here; resumed on close. */
  let resume: HTMLVideoElement | null = null;

  /** The figure shown, while the dialog is open (or opening). */
  let current: Figure | null = null;
  let closing = false;

  const canMorph = (thumb: HTMLImageElement | null): thumb is HTMLImageElement =>
    thumb !== null &&
    motionAllowed() &&
    typeof document.startViewTransition === 'function' &&
    thumb.complete &&
    thumb.naturalWidth > 0 &&
    onScreen(thumb);

  /** Runs `update` as a view transition with `vt-lightbox` on; `after` once it's over, unless a
      newer transition took over — Esc during the opening morph starts the closing one, which
      owns the names and the class then, and this cleanup would strip the name it needs. */
  const morph = (update: () => void | Promise<void>, after: () => void): boolean =>
    startTransition(VT_CLASS, update, after);

  const fillVideo = (source: HTMLVideoElement) => {
    img.hidden = true;
    delete frame.dataset.mode;
    frame.style.setProperty('--lb-w', String(source.width || 16));
    frame.style.setProperty('--lb-h', String(source.height || 9));
    clip.hidden = false;
    clip.setAttribute('aria-label', source.getAttribute('aria-label') ?? '');
    clip.poster = source.poster;
    clip.replaceChildren(...[...source.querySelectorAll('source')].map((s) => s.cloneNode(true)));
    clip.load();
    clip.currentTime = source.currentTime;
    if (!source.paused) resume = source;
    source.pause();
    if (motionAllowed()) clip.play().catch(() => {});
  };

  const fill = (item: Figure) => {
    const n = Number(item.figure.dataset.figure) || 0;
    if (number) number.textContent = `Fig. ${pad2(n)}`;
    if (name) name.textContent = `Figure ${n}`;
    if (caption)
      caption.textContent = item.figure.querySelector('.figure__text')?.textContent ?? '';
    if (full) {
      if (item.link instanceof HTMLAnchorElement) full.href = item.link.href;
      full.hidden = !!item.video;
      if (!full.isConnected) fullTemplate?.replaceWith(full);
    }
    if (fullName) fullName.textContent = ` of figure ${n}`;
    frame.style.setProperty('--lb-w', item.link.dataset.width ?? '16');
    frame.style.setProperty('--lb-h', item.link.dataset.height ?? '10');
    if (item.video || !item.thumb) {
      fillVideo(item.video!);
      return;
    }
    img.hidden = false;
    clip.hidden = true;
    const mode = item.figure.querySelector<HTMLElement>('.figure__frame')?.dataset.mode;
    if (mode) frame.dataset.mode = mode;
    else delete frame.dataset.mode;
    const href = (item.link as HTMLAnchorElement).href;
    img.alt = item.thumb.alt;
    // What's on the page now shows at once; the large rendition follows once decoded.
    img.src = item.thumb.currentSrc || href;
    const large = new Image();
    large.decoding = 'async';
    large.src = href;
    large.decode().then(
      () => {
        if (current === item) img.src = large.src;
      },
      () => {},
    );
  };

  const show = () => {
    dialog.showModal();
    root.classList.add(LOCK_CLASS);
    closeButton?.focus();
  };

  const open = (item: Figure) => {
    if (dialog.open || current) return;
    current = item;
    closing = false;
    fill(item);
    if (!canMorph(item.thumb)) {
      show();
      return;
    }
    const thumb = item.thumb;
    setName(thumb);
    const started = morph(
      async () => {
        clearName(thumb);
        setName(img);
        show();
        // The new state is captured once this settles: never with a blank image.
        await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 250))]);
      },
      () => clearName(img),
    );
    if (!started) {
      clearName(thumb);
      show();
    }
  };

  const close = () => {
    const item = current;
    if (!item || !dialog.open || closing) return;
    closing = true;
    if (!canMorph(item.thumb)) {
      dialog.close();
      return;
    }
    const thumb = item.thumb;
    setName(img);
    const started = morph(
      () => {
        clearName(img);
        setName(thumb);
        dialog.close();
      },
      () => clearName(thumb),
    );
    if (!started) {
      clearName(img);
      dialog.close();
    }
  };

  // Every way it closes (ours, or the browser's own close request) ends here.
  dialog.addEventListener('close', () => {
    root.classList.remove(LOCK_CLASS);
    const item = current;
    current = null;
    closing = false;
    clip.pause();
    clip.removeAttribute('poster');
    clip.replaceChildren();
    if (resume && mayResume()) resume.play().catch(() => {});
    resume = null;
    const back = item?.video ? item.figure.querySelector<HTMLElement>('.video-toggle') : item?.link;
    back?.focus({ preventScroll: true });
  });

  closeButton?.addEventListener('click', close);
  // Esc: ours, so it closes with the same morph as the button.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  });
  dialog.addEventListener('cancel', (event) => {
    if (!event.cancelable) return;
    event.preventDefault();
    close();
  });
  // The backdrop, and the empty stage around the picture.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target === stage) close();
  });

  const mayResume = () => motionAllowed();

  for (const item of figures) {
    if (item.video) {
      // A click on the picture (the chip is its own button, outside the <video>).
      item.video.addEventListener('click', () => open(item));
      item.video.dataset.zoomable = '';
      item.figure.dataset.zoomable = '';
      continue;
    }
    if (!(item.link instanceof HTMLAnchorElement) || !item.thumb) continue;
    item.link.setAttribute('aria-haspopup', 'dialog');
    item.link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      open(item);
    });
    item.thumb.addEventListener('click', () => open(item));
    item.figure.dataset.zoomable = '';
  }
}

/** Adds the lightbox's stylesheet to the page; resolves once it has loaded (or failed). */
function loadStyles(): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.append(link);
  });
}

const dialog = document.querySelector<HTMLDialogElement>('dialog[data-lightbox]');
if (dialog) {
  const figures: Figure[] = [];
  for (const figure of document.querySelectorAll<HTMLElement>('.figure[data-figure]')) {
    const link = figure.querySelector<HTMLAnchorElement>('a[data-lightbox-trigger]');
    const thumb = figure.querySelector<HTMLImageElement>('.figure__frame img');
    if (link && thumb) figures.push({ figure, link, thumb });
    const video = figure.querySelector<HTMLVideoElement>('[data-video][data-autoplay] video');
    if (video) figures.push({ figure, link: video, thumb: null, video });
  }
  // Wired once its styles are in: never an unstyled dialog. Until then the links just link.
  if (figures.length > 0) void loadStyles().then(() => wire(dialog, figures));
}
