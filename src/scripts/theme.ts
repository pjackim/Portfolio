/**
 * Theme toggle (spec-design-content §2). Two states: the system scheme, or its opposite.
 * Choosing the opposite pins it (<html data-scheme>, the color-scheme meta, localStorage
 * `scheme`); choosing the system scheme again clears the pin. The inline bootstrap in
 * BaseLayout applies a stored pin before first paint; this module only handles changes.
 *
 * While motion is allowed the switch is a scan sweep (interactions spec §3; Ruling G14): a
 * same-document view transition in which the new scheme wipes down the page from the top edge,
 * led by a 1px accent scanline with a soft glow tail — the card reticle's scanline, full width.
 * It is styled in global.css under `html.vt-theme`, a class that exists only while this
 * transition runs, so cross-document navigations are unaffected. The scanline is an
 * `aria-hidden` overlay added for the transition's new state only and removed once it's over.
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
/** The sweep's leading scanline (global.css `.theme-scan`), made once, in the page only while a
    theme transition runs. */
const scan = document.createElement('div');
scan.className = 'theme-scan';
scan.setAttribute('aria-hidden', 'true');

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

/**
 * The transition in flight, if any: only the latest one may clean up after itself. (The same
 * guard as startTransition() in src/scripts/motion.ts, which this import-free script can't use.)
 */
let running: ViewTransition | null = null;

/** Drops the transition's class and scanline. */
function clearTransitionState(): void {
  root.classList.remove(VT_CLASS);
  scan.remove();
}

function toggle(): void {
  const motion = !reduceMotion.matches && root.dataset.motion !== 'off';
  if (!motion || typeof document.startViewTransition !== 'function') {
    switchScheme();
    return;
  }
  // The class goes on first: it must be in place when the old state is captured.
  root.classList.add(VT_CLASS);
  let transition: ViewTransition;
  try {
    // The scanline joins the new state only (its own capture, above the page's).
    transition = document.startViewTransition(() => {
      document.body.append(scan);
      switchScheme();
    });
  } catch {
    // Refused outright (the update never ran): switch instantly, leave nothing behind.
    clearTransitionState();
    switchScheme();
    return;
  }
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
