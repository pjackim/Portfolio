/**
 * Per-page CSS for values only known at build time: a cover's `view-transition-name`, crop
 * position and source width, a video's aspect ratio (spec-architecture §6, Ruling R29).
 *
 * Inline `style=""` attributes would need `'unsafe-inline'` in the Content-Security-Policy.
 * Instead a component registers its declarations with `pageStyle()` and puts the returned
 * token on the element as `data-style`. BaseLayout renders the page body first, then emits
 * every rule in one `<style>` element in the head and adds that element's hash to the policy
 * — so only components inside BaseLayout's default slot may call `pageStyle()`; a later call
 * throws instead of silently shipping an unstyled element.
 *
 * Rules are keyed by a digest of their declarations, so identical blocks share one rule.
 */
import { createHash } from 'node:crypto';

/** Property → value, e.g. `{ 'view-transition-name': 'cover-nodes', '--cover-max': '1920px' }`. */
export type Declarations = Readonly<Record<string, string>>;

interface Sheet {
  rules: Map<string, string>;
  sealed: boolean;
}

/** One sheet per page render, keyed by that render's `Astro.locals` object. */
const sheets = new WeakMap<object, Sheet>();

const PROPERTY = /^(?:--)?[a-z][a-z0-9-]*$/;
/** Characters that could end the declaration, the rule or the `<style>` element. */
const UNSAFE_VALUE = /[;{}<>\\]|\/\*/;

function sheetFor(locals: object): Sheet {
  let sheet = sheets.get(locals);
  if (!sheet) {
    sheet = { rules: new Map(), sealed: false };
    sheets.set(locals, sheet);
  }
  return sheet;
}

function serialize(declarations: Declarations): string {
  return Object.entries(declarations)
    .map(([property, value]) => {
      if (!PROPERTY.test(property)) throw new Error(`pageStyle: invalid property "${property}"`);
      if (value === '' || UNSAFE_VALUE.test(value)) {
        throw new Error(`pageStyle: unsafe value for ${property}: "${value}"`);
      }
      return `${property}:${value}`;
    })
    .join(';');
}

/**
 * Registers `declarations` for the page being rendered and returns the token to put in the
 * element's `data-style` attribute. `locals` is the component's `Astro.locals`.
 */
export function pageStyle(locals: object, declarations: Declarations): string {
  const sheet = sheetFor(locals);
  if (sheet.sealed) {
    throw new Error(
      'pageStyle: called after the page style was emitted — only components inside ' +
        "BaseLayout's default slot can use it",
    );
  }
  const block = serialize(declarations);
  const token = createHash('sha256').update(block).digest('hex').slice(0, 10);
  sheet.rules.set(`[data-style="${token}"]`, block);
  return token;
}

/**
 * Seals the page's sheet and returns its CSS (empty when nothing was registered). Rules are
 * emitted sorted by selector token rather than insertion order: components can render
 * concurrently (e.g. image processing), so the order `pageStyle()` is called in — and thus the
 * `Map`'s insertion order — isn't guaranteed to match between two builds of the same input.
 * Sorting keeps the emitted `<style>` (and its hash) byte-identical either way.
 */
export function takePageStyle(locals: object): string {
  const sheet = sheetFor(locals);
  sheet.sealed = true;
  return [...sheet.rules]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([selector, block]) => `${selector}{${block}}`)
    .join('');
}
