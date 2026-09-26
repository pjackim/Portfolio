/**
 * Theme toggle (spec-design-content §2). Two states: the system scheme, or its opposite.
 * Choosing the opposite pins it (<html data-scheme>, the color-scheme meta, localStorage
 * `scheme`); choosing the system scheme again clears the pin. The inline bootstrap in
 * BaseLayout applies a stored pin before first paint; this module only handles changes.
 */
type Scheme = 'light' | 'dark';

const KEY = 'scheme';
const root = document.documentElement;
const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');

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

function toggle(): void {
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
