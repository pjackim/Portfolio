/**
 * Resolves colour tokens to concrete colours for a canvas, in one style pass. The tokens are
 * light-dark() compositions, which a 2D context can't take, so each goes into a colour property
 * that paints nothing on a canvas element and is read back computed. Transitions are switched
 * off for the read: the reduced-motion / Motion-off safety nets give every property a 0.01ms
 * transition, and a transitioning property reads back its start value (the inherited text
 * colour), not the token. Shared by the hero graph and the About timeline.
 */

/** Colour properties a canvas element never paints, one per token (so up to five tokens). */
const SLOTS = [
  'color',
  'text-decoration-color',
  'column-rule-color',
  'outline-color',
  'caret-color',
] as const;

/** `{ edge: '--line-ui', … }` → `{ edge: 'rgb(…)', … }`, read off `canvas`. */
export function readTokenColors<K extends string>(
  canvas: HTMLElement,
  tokens: Readonly<Record<K, string>>,
): Record<K, string> {
  const { style } = canvas;
  const keys = Object.keys(tokens) as K[];
  if (keys.length > SLOTS.length) throw new Error('readTokenColors: too many tokens');
  style.setProperty('transition-property', 'none', 'important');
  keys.forEach((key, i) => style.setProperty(SLOTS[i]!, `var(${tokens[key]})`));
  const computed = getComputedStyle(canvas);
  const colors = {} as Record<K, string>;
  keys.forEach((key, i) => {
    colors[key] = computed.getPropertyValue(SLOTS[i]!);
    style.removeProperty(SLOTS[i]!);
  });
  style.removeProperty('transition-property');
  return colors;
}
