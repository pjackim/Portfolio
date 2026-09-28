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

/** A skill family: one lane colour in the Experience git log (tokens.css `--family-*`). */
export type LogFamily = 'security' | 'software' | 'teaching' | 'design';

export const LOG_FAMILIES: readonly LogFamily[] = ['security', 'software', 'teaching', 'design'];

/** A skill a commit merged in, or (`learning`) one still on an open branch. */
export interface LogSkill {
  name: string;
  family: LogFamily;
  /** Still open: actively learning, per the author. */
  learning?: boolean;
}

/**
 * One commit in the Experience git log (Portfolio.dc.html, Claude Design, Sept 2026): a role,
 * a milestone or a qualification, with the skills it brought in.
 */
export interface LogCommit {
  /** Stable key (toggle state, ids). */
  id: string;
  /** Mono date column: a year, an age or "Now"; only when the repo states it. */
  when?: string;
  title: string;
  org: string;
  /** Colours the commit's own branch; `edu` is the neutral line for education. */
  family: LogFamily | 'edu';
  /** Mono meta at the row's end (place, months); only when stated. */
  meta?: string;
  skills: readonly LogSkill[];
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
  /** Reverse chronological; the first is HEAD (the current role). No invented dates. */
  experience: readonly LogCommit[];
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
    // index.html:156 (role; interests include embedded systems, machine learning and reverse
    // engineering). The two still-open branches are the author's (Claude Design chat, Sept 2026:
    // "the 'still open' being things that i am actively learning"). No dates or work location.
    {
      id: 'apl',
      when: 'Now',
      title: 'Cyber Security Researcher',
      org: 'JHU APL',
      family: 'security',
      skills: [
        { name: 'Reverse engineering', family: 'security' },
        { name: 'Machine learning', family: 'security', learning: true },
        { name: 'Embedded systems', family: 'security', learning: true },
      ],
    },
    // résumé (Experience): "Teacher, iD Tech, May 2021 - August 2021, Online … Minecraft
    // modding in Java and the foundations of programming in C++ and Python"
    {
      id: 'id-tech',
      when: '2021',
      title: 'Teacher',
      org: 'iD Tech',
      family: 'teaching',
      meta: 'May–Aug · Online',
      skills: [
        { name: 'Teaching ages 7 to 18', family: 'teaching' },
        { name: 'Minecraft modding in Java', family: 'software' },
        { name: 'C++ and Python foundations', family: 'teaching' },
      ],
    },
    // hardpoint frontmatter (year 2021, role Freelance developer, stack); mordhaumod.html
    {
      id: 'hardpoint',
      when: '2021',
      title: 'Hardpoint game mode',
      org: 'Freelance, for Mordhau',
      family: 'software',
      skills: [
        { name: 'Unreal Engine 4', family: 'software' },
        { name: 'Server & client replication', family: 'software' },
        { name: 'Test-driven development', family: 'software' },
        { name: 'Iterative design', family: 'design' },
      ],
    },
    // foresthack.html:79-82 ("independently created a curriculum and taught students (ages
    // 18-20) how to cheat in Unity Engine games"); :85-91 (reverse engineering). Undated.
    {
      id: 'curriculum',
      title: 'Game-hacking curriculum',
      org: 'Independent',
      family: 'security',
      skills: [
        { name: 'Game hacking', family: 'security' },
        { name: 'Reverse engineering', family: 'security' },
        { name: 'Curriculum design', family: 'teaching' },
        { name: 'Teaching ages 18 to 20', family: 'teaching' },
      ],
    },
    // résumé: "PCAP Certified Associate in Python Programming · Summer 2020"
    {
      id: 'pcap',
      when: '2020',
      title: 'PCAP',
      org: 'Certified Associate in Python Programming',
      family: 'software',
      skills: [{ name: 'Python', family: 'software' }],
    },
    // résumé (Education): "August 2019 – Present, Fort Collins, Colorado"; completion not stated
    {
      id: 'csu',
      when: '2019',
      title: 'Computer Science',
      org: SCHOOL,
      family: 'edu',
      meta: 'Fort Collins, CO',
      skills: [],
    },
    // résumé (Experience): "Freelance Developer, Self Employed, 2016 – Present … functional GUI
    // templates, video game modding & hacking, identity branding, and teaching"
    {
      id: 'freelance',
      when: '2016',
      title: 'Freelance Developer',
      org: 'Self-employed',
      family: 'software',
      skills: [
        { name: 'Functional GUI templates', family: 'design' },
        { name: 'Video game modding & hacking', family: 'security' },
        { name: 'Identity branding', family: 'design' },
      ],
    },
    // aes.html:79 ("I was 15 when I wrote this program"; AES 256, C++)
    {
      id: 'aes',
      when: 'Age 15',
      title: 'AES-256 encryption tool',
      org: 'Independent project',
      family: 'security',
      skills: [
        { name: 'AES-256 encryption', family: 'security' },
        { name: 'C++', family: 'software' },
      ],
    },
    // index.html:176-177 ("I started learning graphic design when I was 10 … branding (logos,
    // banners, etc.), advertisements, and user interfaces for videogame cheats")
    {
      id: 'graphic-design',
      when: 'Age 10',
      title: 'Graphic design',
      org: 'Game-hacking community',
      family: 'design',
      skills: [
        { name: 'Branding', family: 'design' },
        { name: 'User interfaces', family: 'design' },
      ],
    },
  ],
};
