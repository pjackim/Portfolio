/**
 * Footer status-line clock (interactions spec §4): UTC `HH:MM:SS`, updated once a second on the
 * second — but only while it can be seen and motion is allowed. It stops when the footer is
 * offscreen (IntersectionObserver), when the page is hidden, and when motion is off (the Motion
 * toggle or the OS setting); with motion off it goes back to the server-rendered build time,
 * so nothing on the page keeps changing (WCAG 2.2.2). `data-state` on the line — `live`,
 * `paused` or `static` — drives the status dot's pulse (SiteFooter.astro).
 *
 * A timer, never an animation-frame loop, and nothing starts before the page has loaded and gone
 * idle (spec §0.1, §0.9). Part of the motion-layer entry.
 */
import { afterLoadIdle, motionAllowed, onMotionChange } from './motion';

function runClock(line: HTMLElement, time: HTMLElement): void {
  const buildTime = time.textContent ?? '';
  let onScreen = false;
  let timer = 0;

  const show = (text: string) => {
    if (time.textContent !== text) time.textContent = text;
  };

  const tick = () => {
    show(new Date().toISOString().slice(11, 19));
    // The next whole second (plus a hair, so it never lands a tick early and repeats a second).
    timer = window.setTimeout(tick, 1005 - (Date.now() % 1000));
  };

  const stop = () => {
    clearTimeout(timer);
    timer = 0;
  };

  const update = () => {
    const allowed = motionAllowed();
    const live = allowed && onScreen && !document.hidden;
    if (live && !timer) tick();
    else if (!live) stop();
    if (!allowed) show(buildTime);
    line.dataset.state = live ? 'live' : allowed ? 'paused' : 'static';
  };

  // A little ahead of the viewport, so the time is current by the moment it scrolls into view.
  new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting;
      update();
    },
    { rootMargin: '160px 0px' },
  ).observe(line);
  document.addEventListener('visibilitychange', update);
  onMotionChange(update);
  update();
}

const line = document.querySelector<HTMLElement>('[data-clock]');
const time = line?.querySelector<HTMLElement>('[data-clock-time]');
if (line && time) afterLoadIdle(() => runClock(line, time));
