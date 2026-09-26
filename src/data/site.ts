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
  about: readonly string[];
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

/**
 * Size of the credential-correlation dataset, for the hero readouts: "Compiled ~120,000,000
 * real-world credentials" (src/content/projects/credential-correlation/index.md; legacy
 * credential_correlation.html:90-105).
 */
export const CREDENTIALS_ANALYZED = 120_000_000;

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

  about: [
    // index.html:156, résumé (Experience: Freelance Developer); AI practice per the author
    // (Sept 2026): custom agent harnesses, AI tooling, skills, and AI quality processes.
    'I am a cyber security researcher and software developer at the Johns Hopkins ' +
      'University Applied Physics Laboratory. My work sits where offensive security, ' +
      'systems engineering, and applied AI meet: understanding how software actually ' +
      'behaves, finding where it breaks, and building the tooling that makes that work ' +
      'repeatable.',
    // index.html:176-177, paradox.html:72-76, aes.html:79, résumé (Education; Teacher, iD
    // Tech), foresthack.html:78/:101, mordhaumod.html:81-82, tripsite.html:79-81,
    // credential_correlation.html:79/:90-105, 1460ff3^:index.html:148
    'I started early. At 10 I was designing logos, interfaces, and promotional material ' +
      'for Paradox, a game-hacking community, and the interface work pulled me into ' +
      'programming. At 15 I wrote an AES-256 encryption tool for clipboard text, single ' +
      'files, and whole volumes. I went on to study computer science at Colorado State ' +
      'University and teach programming for iD Tech. Along the way I instrumented a Unity ' +
      'game at runtime, built a replicated Unreal Engine 4 game mode, delivered a team ' +
      'React application under CMMI, and curated a dataset of roughly 120 million ' +
      'real-world credentials for machine-learning research on credential security.',
    // Author (Sept 2026)
    'Today much of my work is building with and around large language models: custom ' +
      'agent harnesses, developer tooling, reusable skills, and the evaluation and quality ' +
      'processes that make AI output trustworthy enough to ship. I bring the same ' +
      'discipline to that work that I bring to security research: assume nothing, verify ' +
      'everything, and design for the failure case.',
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
