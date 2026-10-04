/**
 * Capability taxonomy (spec-design-content §5b) and project groups.
 *
 * Every item below comes from the legacy site (commit d8782d1) or the résumé PDF — see the
 * source note on each group. Do not add skills that are not in the repo.
 */

/** Capability ids used by `capabilities` in project frontmatter (1–4 per project). */
export const CAPABILITIES = [
  'offensive-security',
  'data-ml',
  'languages',
  'engineering-practice',
  'engines-systems',
  'design-3d',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  'offensive-security': 'Offensive security & reverse engineering',
  'data-ml': 'Data & ML',
  languages: 'Languages',
  'engineering-practice': 'Engineering practice',
  'engines-systems': 'Engines & systems',
  'design-3d': 'Design & 3D',
};

/** Project groups: the three sections of /work/ (`group` in project frontmatter). */
export const GROUPS = ['security', 'software', 'design'] as const;

export type Group = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<Group, string> = {
  security: 'Security & systems',
  software: 'Software',
  design: 'Design & 3D',
};

/**
 * One skill in a capability group. `seenIn` names the projects whose frontmatter (`stack`,
 * `summary` or `highlights`) shows it, rendered as evidence chips linking to their projects;
 * `note` is non-project evidence stated in the résumé (a certification).
 */
export interface CapabilityItem {
  name: string;
  seenIn?: readonly string[];
  note?: string;
}

export interface CapabilityGroup {
  id: Capability;
  label: string;
  /** Short name for the group's tab on the home page (the open panel shows `label`). */
  tab: string;
  items: readonly CapabilityItem[];
}

/** Every project slug a group cites as evidence, in first-cited order. */
export const groupSeenIn = (group: CapabilityGroup): string[] => [
  ...new Set(group.items.flatMap((item) => item.seenIn ?? [])),
];

/**
 * The capability groups on the home page (Portfolio.dc.html, Claude Design, Sept 2026: a tab per
 * group, a row per skill with its evidence), in display order. Each item's `seenIn` is read off
 * the cited project's own frontmatter; see the note beside it.
 */
export const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
  {
    // mordhauhack.html:90-91, foresthack.html:92-102/:139, aes.html:79, résumé (Memory Hacking,
    // DETER Lab)
    id: 'offensive-security',
    label: CAPABILITY_LABELS['offensive-security'],
    tab: 'Offensive security',
    items: [
      // mordhau stack; the-forest highlights ("Reverse-engineered the game")
      { name: 'Reverse engineering', seenIn: ['mordhau', 'the-forest'] },
      { name: 'Memory patching', seenIn: ['mordhau'] }, // mordhau stack
      { name: 'DLL injection', seenIn: ['mordhau'] }, // mordhau stack
      { name: 'Mono injection', seenIn: ['the-forest'] }, // the-forest stack
      { name: 'Dumping game objects with ILSpy', seenIn: ['the-forest'] }, // the-forest highlights
      { name: 'Discovering basic network vulnerabilities', seenIn: ['the-forest'] }, // ditto
      // aes.html:79 ("It implements AES 256 as a recursive directory encryptor")
      { name: 'AES-256 encryption', seenIn: ['aes-256'] },
      // résumé (DETER Lab); no project page
      { name: 'DETER testbeds: SQLi, buffer overflow DoS, SYN flooding, L7 privilege escalation' },
    ],
  },
  {
    // credential_correlation.html:90-106 (every item: credential-correlation stack + highlights)
    id: 'data-ml',
    label: CAPABILITY_LABELS['data-ml'],
    tab: 'Data & ML',
    items: [
      {
        name: 'Curating and featurizing a ~120M-credential dataset',
        seenIn: ['credential-correlation'],
      },
      { name: 'Hadoop MapReduce', seenIn: ['credential-correlation'] },
      { name: 'Apache Spark', seenIn: ['credential-correlation'] },
      { name: 'Cluster computing', seenIn: ['credential-correlation'] },
      { name: 'Machine learning', seenIn: ['credential-correlation'] },
    ],
  },
  {
    // index.html:207-348 (skills), résumé (Programming Languages)
    id: 'languages',
    label: CAPABILITY_LABELS.languages,
    tab: 'Languages',
    items: [
      // résumé: "PCAP Certified Associate in Python Programming · Summer 2020"
      { name: 'Python', note: 'PCAP · 2020' },
      { name: 'C++', seenIn: ['mordhau', 'aes-256'] }, // both stacks
      { name: 'C#', seenIn: ['the-forest'] }, // the-forest stack
      { name: 'Java' },
      { name: 'Bash', seenIn: ['arch-linux'] }, // arch-linux stack
      { name: 'JavaScript (React)', seenIn: ['trip-planner', 'hero-trivia'] }, // both stacks
      { name: 'HTML & CSS' },
    ],
  },
  {
    // tripsite.html:92-110, mordhaumod.html:83-84, résumé (Trip Planner)
    id: 'engineering-practice',
    label: CAPABILITY_LABELS['engineering-practice'],
    tab: 'Engineering practice',
    items: [
      // trip-planner highlights (CMMI, database search, shared protocols) and stack
      { name: 'CMMI configuration & change management', seenIn: ['trip-planner'] },
      { name: 'Baselines and integrity & maintainability audits', seenIn: ['trip-planner'] },
      { name: 'SCRUM', seenIn: ['trip-planner', 'nodes'] }, // both stacks
      { name: 'Test-driven development', seenIn: ['hardpoint'] }, // hardpoint stack
      // hardpoint stack; nodes summary ("shaped by iterative design")
      { name: 'Iterative design', seenIn: ['hardpoint', 'nodes'] },
      { name: 'Interoperability protocols', seenIn: ['trip-planner'] },
      { name: 'Database implementation', seenIn: ['trip-planner'] },
      { name: 'GitHub, ZenHub & Code Climate', seenIn: ['trip-planner'] },
    ],
  },
  {
    // mordhaumod.html:81-82, foresthack.html:78, archlinux.html:89-100
    id: 'engines-systems',
    label: CAPABILITY_LABELS['engines-systems'],
    tab: 'Engines & systems',
    items: [
      { name: 'Unreal Engine 4 server & client replication', seenIn: ['hardpoint'] }, // stack
      { name: 'Unity', seenIn: ['the-forest', 'ant-game'] }, // both stacks
      // arch-linux stack (Linux, Bash, Vim) and summary
      { name: 'Arch Linux', seenIn: ['arch-linux'] },
      { name: 'Bash scripting', seenIn: ['arch-linux'] },
      { name: 'Linux permissions & file-system structure', seenIn: ['arch-linux'] },
      { name: 'Vim', seenIn: ['arch-linux'] },
    ],
  },
  {
    // index.html:221-344 (skills), ant_game.html:88-93, paradox.html:86-89
    id: 'design-3d',
    label: CAPABILITY_LABELS['design-3d'],
    tab: 'Design & 3D',
    items: [
      { name: 'Photoshop, Illustrator & Premiere', seenIn: ['paradox'] }, // paradox stack
      { name: 'Cinema 4D', seenIn: ['paradox', 'nodes'] }, // both stacks
      { name: 'ZBrush sculpting', seenIn: ['ant-game'] }, // ant-game stack
      { name: 'Substance Painter texturing', seenIn: ['ant-game'] }, // ant-game stack
      { name: 'Maya rigging', seenIn: ['ant-game'] }, // ant-game stack
      // paradox summary ("graphical user interfaces")
      { name: 'UI & UX design', seenIn: ['paradox'] },
    ],
  },
];
