/**
 * LoopVideo controller (spec-design-content §3, JS inventory 3). Enhances every
 * `[data-video][data-autoplay]` wrapper rendered by LoopVideo:
 * - swaps the native controls for one visible Pause / Play toggle (WCAG 2.2.2);
 * - plays while at least half the video is on screen, pauses it when it leaves;
 * - never autoplays under `prefers-reduced-motion: reduce` (tracked live) or Save-Data;
 * - a video the user paused stays paused until they press Play again;
 * - a rejected `play()` (e.g. iOS Low Power Mode) just leaves the paused state showing.
 * Click-to-play videos (no `data-autoplay`) keep their native controls and are left alone.
 */
interface Loop {
  video: HTMLVideoElement;
  button: HTMLButtonElement;
  label: HTMLElement;
  /** At least half of it is in the viewport. */
  visible: boolean;
  /** Paused by the user: autoplay leaves it alone until they press Play. */
  held: boolean;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveData =
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const mayAutoplay = () => !reducedMotion.matches && !saveData;

const ICON =
  '<svg class="video-toggle__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
  '<path class="video-toggle__pause" d="M5.25 3.5v9M10.75 3.5v9"></path>' +
  '<path class="video-toggle__play" d="M5 3.25v9.5L12.5 8z"></path></svg>';

const loops = new Map<Element, Loop>();

function render(loop: Loop): void {
  const playing = !loop.video.paused;
  loop.button.dataset.state = playing ? 'playing' : 'paused';
  loop.button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
  loop.label.textContent = playing ? 'Pause' : 'Play';
}

function play(loop: Loop): void {
  loop.video.play().catch(() => render(loop));
}

function autoplay(loop: Loop): void {
  if (loop.visible && !loop.held && mayAutoplay()) play(loop);
}

function pause(loop: Loop): void {
  if (!loop.video.paused) loop.video.pause();
}

for (const wrapper of document.querySelectorAll<HTMLElement>('[data-video][data-autoplay]')) {
  const video = wrapper.querySelector('video');
  if (!video) continue;
  video.controls = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video-toggle';
  button.innerHTML = `${ICON}<span class="video-toggle__label" aria-hidden="true"></span>`;
  wrapper.append(button);

  const label = button.querySelector<HTMLElement>('.video-toggle__label')!;
  const loop: Loop = { video, button, label, visible: false, held: false };
  loops.set(video, loop);

  button.addEventListener('click', () => {
    loop.held = !video.paused;
    if (loop.held) video.pause();
    else play(loop);
  });
  video.addEventListener('play', () => render(loop));
  video.addEventListener('pause', () => render(loop));
  render(loop);
}

if (loops.size > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const loop = loops.get(entry.target);
        if (!loop) continue;
        // "Half visible" — or, for a video taller than twice the viewport, filling half of it.
        const viewport = entry.rootBounds?.height ?? innerHeight;
        loop.visible =
          entry.isIntersecting &&
          (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= viewport / 2);
        if (loop.visible) autoplay(loop);
        else pause(loop);
      }
    },
    { threshold: [0, 0.5] },
  );
  for (const video of loops.keys()) observer.observe(video);

  reducedMotion.addEventListener('change', () => {
    for (const loop of loops.values()) {
      if (mayAutoplay()) autoplay(loop);
      else pause(loop);
    }
  });
}
