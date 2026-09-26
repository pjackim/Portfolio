/**
 * Theme toggle (spec-design-content §2). Two states: the system scheme, or its opposite.
 * Choosing the opposite pins it (<html data-scheme>, the color-scheme meta, localStorage
 * `scheme`); choosing the system scheme again clears the pin. The inline bootstrap in
 * BaseLayout applies a stored pin before first paint; this module only handles changes.
 *
 * While motion is allowed the switch is a circular reveal out of the toggle (interactions spec
 * §3): a same-document view transition, styled in global.css under `html.vt-theme` — a class
 * that exists only while this transition runs, so cross-document navigations are unaffected.
 * Otherwise, or without view transitions, the switch is instant.
 *
 * Import-free on purpose, so Astro inlines it (no request on any page); the motion check
 * mirrors motionAllowed() in src/scripts/motion.ts.
 */
type Scheme = 'light' | 'dark';

const KEY = 'scheme';
const root = document.documentElement;
const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
const VT_CLASS = 'vt-theme';
const VT_PROPS = ['--vt-x', '--vt-y', '--vt-r'] as const;

const isScheme = (value: unknown): value is Scheme => value === 'light' || value === 'dark';
const system = (): Scheme => (systemDark.matches ? 'dark' : 'light');
const effective = (): Scheme => {
  const pinned = root.getAttribute('data-scheme');
  return isScheme(pinned) ? pinned : system();
};

function apply(pin: Scheme | null): void {
  if (pin) root.setAttribute('data-scheme', pin);
  else root.removeAttribute('data-scheme');
  meta?.setAttribute('content', pin ?? 'light dark');
}

function sync(): void {
  const next: Scheme = effective() === 'dark' ? 'light' : 'dark';
  for (const button of buttons) {
    button.setAttribute('data-next', next);
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.hidden = false;
  }
}

function switchScheme(): void {
  const next: Scheme = effective() === 'dark' ? 'light' : 'dark';
  const pin = next === system() ? null : next;
  apply(pin);
  try {
    if (pin) localStorage.setItem(KEY, pin);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the pin still holds for this page.
  }
  sync();
}

/** The transition in flight, if any: only the latest one may clean up after itself. */
let running: ViewTransition | null = null;

/** Drops the transition's class and properties (and the style attribute, once it's empty). */
function clearTransitionState(): void {
  root.classList.remove(VT_CLASS);
  for (const prop of VT_PROPS) root.style.removeProperty(prop);
  if (root.style.length === 0) root.removeAttribute('style');
}

function toggle(this: HTMLButtonElement): void {
  const motion = !reduceMotion.matches && root.dataset.motion !== 'off';
  if (!motion || typeof document.startViewTransition !== 'function') {
    switchScheme();
    return;
  }
  // The class goes on first: it must be in place when the old state is captured.
  root.classList.add(VT_CLASS);
  let transition: ViewTransition;
  try {
    transition = document.startViewTransition(switchScheme);
  } catch {
    // Refused outright (the update never ran): switch instantly, leave nothing behind.
    clearTransitionState();
    switchScheme();
    return;
  }
  // The circle grows from the toggle's centre until it reaches the farthest viewport corner.
  // Set once the transition is under way: its pseudo-elements, which read these, are only
  // built at the next frame — and a refused call never touches the style attribute at all.
  const box = this.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.style.setProperty('--vt-x', `${x}px`);
  root.style.setProperty('--vt-y', `${y}px`);
  root.style.setProperty('--vt-r', `${Math.ceil(r)}px`);
  running = transition;
  // Skipped (another click, a hidden tab): nothing to report, the scheme still switches.
  transition.ready.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => {
      if (running !== transition) return;
      running = null;
      clearTransitionState();
    });
}

for (const button of buttons) button.addEventListener('click', toggle);
systemDark.addEventListener('change', sync);

// Restored from the back/forward cache: another page may have changed the pin meanwhile.
addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    return;
  }
  apply(isScheme(stored) ? stored : null);
  sync();
});

sync();
