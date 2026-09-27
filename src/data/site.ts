/**
 * Site identity and home-page copy (spec-design-content §5a, §5c, §5f).
 *
 * Every fact here comes from the legacy site (`git show d8782d1:index.html`, the pre-2024
 * About at `git show 1460ff3^:index.html`, the legacy project pages) or the résumé
 * (`public/files/Resume_General.pdf`, June 2022). Unknown ⇒ omitted. Email is the only
 * published contact detail.
 *
 * Paths are raw (no base): callers wrap them with `withBase()` from `src/lib/url.ts`.
 */

export interface StatusEntry {
  label: string;
  value: string;
}

/** One stop on the About timeline (Portfolio.dc.html, Claude Design, Sept 2026). */
export interface TimelineEntry {
  /** Mono marker: an age, a year, "Then" or "Now"; uppercased by CSS. */
  when: string;
  title: string;
  text: string;
  /** The current stop: drawn as the accent bar, and its marker in full text colour. */
  now?: boolean;
}

export interface ExperienceEntry {
  /** Display string, only when the repo states a date. */
  period?: string;
  title: string;
  org?: string;
  place?: string;
}

export interface Site {
  name: string;
  role: string;
  /** "City, ST". */
  location: string;
  /** Organisation of the current role (the first experience entry). */
  employer: string;
  /** University (Education on the résumé). */
  school: string;
  email: string;
  github: string;
  linkedin: string;
  /** Raw path to the résumé PDF — wrap with `withBase()`. */
  resume: string;
  /** Mono eyebrow above the h1; stored in mixed case, uppercased by CSS. */
  eyebrow: string;
  lede: string;
  /** Oldest first; the last entry is the current role. */
  timeline: readonly TimelineEntry[];
  status: readonly StatusEntry[];
  /** Reverse chronological; only entries stated in the repo; no invented dates. */
  experience: readonly ExperienceEntry[];
}

const EMPLOYER = 'Johns Hopkins University Applied Physics Laboratory'; // index.html:156
const SCHOOL = 'Colorado State University'; // résumé (Education)

/**
 * Focus areas — index.html:156: "My interests include … embedded systems, machine learning, and
 * reverse engineering". Typed out by the hero's focus line (the one place they appear: the status
 * strip used to repeat them in a FOCUS cell).
 */
export const FOCUS_AREAS = ['Reverse engineering', 'Machine learning', 'Embedded systems'] as const;

export const site: Site = {
  name: 'Parker Jackim',
  role: 'Cyber Security Researcher', // index.html:156
  location: 'Columbia, MD', // index.html:418
  employer: EMPLOYER,
  school: SCHOOL,
  email: 'parkerwjackim@gmail.com', // index.html:420
  github: 'https://github.com/pjackim', // index.html:398
  linkedin: 'https://www.linkedin.com/in/parker-jackim-68b3561b8/', // index.html:399
  resume: 'files/Resume_General.pdf', // index.html:375

  eyebrow: 'Cyber Security Researcher · Columbia, MD', // index.html:156, :418

  // index.html:156 (role, interests), :166 (high-impact projects, aiding my country)
  lede:
    'Cyber security researcher at the Johns Hopkins University Applied Physics Laboratory. ' +
    'My interests run from reverse engineering and machine learning to building software, ' +
    'and I want my work to be high-impact and in service of my country.',

  timeline: [
    // index.html:176-177 ("I started learning graphic design when I was 10 … user interfaces
    // for videogame cheats"); paradox.html:72-76 (the game-hacking group)
    {
      when: 'Age 10',
      title: 'Graphic design',
      text: 'I started building interfaces for a game-hacking community.',
    },
    // index.html:177 ("Designing UI piqued my interest in programming")
    {
      when: 'Then',
      title: 'Programming',
      text: 'The interface work pulled me into writing the software behind it.',
    },
    // aes.html:79 ("I was 15 when I wrote this program, making it one of my first substantial
    // independent projects")
    {
      when: 'Age 15',
      title: 'AES-256 encryption tool',
      text: 'One of my first substantial independent projects.',
    },
    // résumé (Experience: Freelance Developer, 2016 – Present); mordhaumod.html (Hardpoint,
    // commissioned by Mordhau's competitive community)
    {
      when: '2016',
      title: 'Freelance developer',
      text: 'Self-employed, including a commissioned Unreal Engine 4 game mode for Mordhau.',
    },
    // résumé (Education: August 2019 –; Teacher, iD Tech, May–Aug 2021, Online);
    // foresthack.html:79-82 (the game-hacking curriculum)
    {
      when: '2019',
      title: 'Computer Science, Colorado State University',
      text: 'Taught online at iD Tech and wrote a game-hacking curriculum alongside it.',
    },
    // index.html:156 (role, interests), :166 (aiding my country)
    {
      when: 'Now',
      title: 'Cyber security researcher, JHU APL',
      text: 'Reverse engineering, machine learning and embedded systems, in service of my country.',
      now: true,
    },
  ],

  // The focus areas aren't repeated here: the hero's typed FOCUS line carries them.
  status: [
    { label: 'Now', value: 'Cyber security research · JHU APL' }, // index.html:156
    // résumé (Education). Degree completion and end date are not stated in the repo.
    { label: 'Edu', value: `Computer Science · ${SCHOOL}` },
  ],

  experience: [
    // index.html:156 — the repo gives no dates or work location for this role
    { title: 'Cyber Security Researcher', org: EMPLOYER },
    // résumé (Experience): "May 2021 - August 2021 · Online"
    { period: 'May–Aug 2021', title: 'Teacher', org: 'iD Tech', place: 'Online' },
    // foresthack.html:79-82 — undated; the project itself is Spring 2020 per the résumé
    { title: 'Game-hacking curriculum creator & instructor', org: 'Independent' },
    // résumé: "PCAP Certified Associate in Python Programming · Summer 2020"
    { period: 'Summer 2020', title: 'PCAP — Certified Associate in Python Programming' },
    // résumé (Education): "August 2019 – Present" as of June 2022; completion not stated
    {
      period: 'From Aug 2019',
      title: 'Computer Science student',
      org: SCHOOL,
      place: 'Fort Collins, Colorado',
    },
    // résumé (Experience): "2016 – Present" as of June 2022
    { period: 'From 2016', title: 'Freelance Developer', org: 'Self-employed' },
  ],
};
