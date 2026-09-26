/**
 * Display helpers shared by the home page, /work/ and case studies: zero-padded indices and
 * date strings split into plain text and `<time>`-able parts (spec-design-content §7: years
 * use `<time>` where a real date exists).
 */
import type { Project } from './projects';

/** `1` → `"01"`. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** What a project shows as its date: `period` when set ("Fall 2021", "c. 2016"), else `year`. */
export const projectDate = (project: Project): string =>
  project.data.period ?? String(project.data.year);

export interface DatePart {
  text: string;
  /** Machine-readable value for `<time datetime>`; absent for plain text. */
  datetime?: string;
}

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const DATE = /\b(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4})\b/g;

/**
 * Splits a display date into text and dated parts: "May–Aug 2021" → "May–" + <time 2021-08>,
 * "Fall 2021" → "Fall " + <time 2021>. Approximate dates ("c. 2016") and undated strings
 * ("High school") stay plain text — no made-up precision.
 */
export function dateParts(text: string): DatePart[] {
  if (/^c\.\s/i.test(text)) return [{ text }];
  const parts: DatePart[] = [];
  let last = 0;
  for (const match of text.matchAll(DATE)) {
    const [whole, month, year] = match;
    if (year === undefined) continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const mm = month === undefined ? undefined : MONTHS[month.toLowerCase()];
    parts.push({ text: whole, datetime: mm ? `${year}-${mm}` : year });
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
