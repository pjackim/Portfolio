/**
 * LoopVideo controller (spec-design-content §3, JS inventory 3). Enhances every
 * `[data-video][data-autoplay]` wrapper rendered by LoopVideo:
 * - swaps the native controls for one visible Pause / Play toggle (WCAG 2.2.2);
 * - plays while at least half the video is on screen, pauses it when it leaves;
 * - never autoplays while motion isn't allowed — `prefers-reduced-motion: reduce` or the site's
 *   Motion toggle off (`<html data-motion="off">`), both tracked live: switching motion off
 *   pauses a playing loop, switching it back on resumes it — or in Save-Data mode
 *   (`<html data-net="save">`, src/lib/net-bootstrap.ts);
 * - on a slow connection (`data-net="slow"`) a visible loop waits for the page's images to finish
 *   upgrading (`net:idle`, src/scripts/net.ts), then loads its one high-quality file and plays
 *   once it can play through; Play always starts it at once;
 * - a video the user paused stays paused until they press Play again (motion coming back on
 *   doesn't override that);
 * - a rejected `play()` (e.g. iOS Low Power Mode) just leaves the paused state showing.
 * Click-to-play videos (no `data-autoplay`) keep their native controls and are left alone.
 *
 * Import-free on purpose, so Astro inlines it (no request); the motion check mirrors
 * motionAllowed() in src/scripts/motion.ts, and `motion:change` is that module's event.
 */
export {}; // a module (its own scope), though it imports nothing

interface Loop {
  video: HTMLVideoElement;
  button: HTMLButtonElement;
  label: HTMLElement;
  /** At least half of it is in the viewport. */
  visible: boolean;
  /** Paused by the user: autoplay leaves it alone until they press Play. */
  held: boolean;
  /** Slow connection: its file has loaded far enough to play through (or it has played). */
  ready: boolean;
  /** Slow connection: the file is being loaded for autoplay. */
  armed: boolean;
}

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mayAutoplay = () =>
  !reducedMotion.matches && root.dataset.motion !== 'off' && root.dataset.net !== 'save';

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
  if (!loop.visible || loop.held || !mayAutoplay()) return;
  if (root.dataset.net !== 'slow' || loop.ready) return play(loop);
  // Playback is already under way (Play pressed, or a fast-mode autoplay still buffering): never
  // `load()` it again, which would abort the request and start the download over.
  if (!loop.video.paused) {
    loop.armed = true;
    return;
  }
  // Slow connection: the poster and Play stay until the page's images are upgraded and the loop
  // can play through.
  if (loop.armed || root.dataset.netBusy !== undefined) return;
  loop.armed = true;
  loop.video.addEventListener(
    'canplaythrough',
    () => {
      loop.ready = true;
      autoplay(loop);
    },
    { once: true },
  );
  loop.video.preload = 'auto';
  loop.video.load();
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
  const loop: Loop = {
    video,
    button,
    label,
    visible: false,
    held: false,
    ready: false,
    armed: false,
  };
  loops.set(video, loop);

  button.addEventListener('click', () => {
    loop.held = !video.paused;
    if (loop.held) video.pause();
    else play(loop);
  });
  video.addEventListener('play', () => render(loop));
  video.addEventListener('pause', () => render(loop));
  // A loop that is playing has what it needs: autoplay never reloads it.
  video.addEventListener('playing', () => (loop.ready = true));
  render(loop);
}

if (loops.size > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const loop = loops.get(entry.target);
        if (!loop) continue;
        loop.visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (loop.visible) autoplay(loop);
        else pause(loop);
      }
    },
    { threshold: [0, 0.5] },
  );
  for (const video of loops.keys()) observer.observe(video);

  // Motion switched off (the OS setting or the site's toggle) pauses every loop; back on, the
  // ones on screen that the user hadn't paused play again.
  const onMotionChange = () => {
    for (const loop of loops.values()) {
      if (mayAutoplay()) autoplay(loop);
      else pause(loop);
    }
  };
  reducedMotion.addEventListener('change', onMotionChange);
  document.addEventListener('motion:change', onMotionChange);
  // The connection verdict changed, or the page's images finished upgrading: a loop waiting on
  // either starts (or stops) as motion changes do.
  document.addEventListener('net:change', onMotionChange);
  document.addEventListener('net:idle', onMotionChange);
}
