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

export interface CapabilityGroup {
  id: Capability;
  label: string;
  items: readonly string[];
  /** Project slugs shown as "Seen in:" links. Empty ⇒ render no "Seen in" line. */
  seenIn: readonly string[];
}

/** The six capability boxes on the home page, in display order. */
export const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
  {
    // mordhauhack.html:90-91, foresthack.html:92-102/:139, résumé (Memory Hacking, DETER Lab)
    id: 'offensive-security',
    label: CAPABILITY_LABELS['offensive-security'],
    items: [
      'Reverse engineering',
      'Memory patching',
      'DLL injection',
      'Mono injection',
      'Dumping game objects with ILSpy',
      'Discovering basic network vulnerabilities',
      'DETER testbeds: SQLi, buffer overflow DoS, SYN flooding, L7 privilege escalation',
    ],
    seenIn: ['mordhau', 'the-forest', 'aes-256'],
  },
  {
    // credential_correlation.html:90-106
    id: 'data-ml',
    label: CAPABILITY_LABELS['data-ml'],
    items: [
      'Curating and featurizing a ~120M-credential dataset',
      'Hadoop MapReduce',
      'Apache Spark',
      'Cluster computing',
      'Machine learning',
    ],
    seenIn: ['credential-correlation'],
  },
  {
    // index.html:207-348 (skills), résumé (Programming Languages)
    id: 'languages',
    label: CAPABILITY_LABELS.languages,
    items: ['Python', 'C++', 'C#', 'Java', 'Bash', 'JavaScript (React)', 'HTML & CSS'],
    seenIn: [],
  },
  {
    // tripsite.html:92-110, mordhaumod.html:83-84, résumé (Trip Planner)
    id: 'engineering-practice',
    label: CAPABILITY_LABELS['engineering-practice'],
    items: [
      'CMMI configuration & change management',
      'Baselines and integrity & maintainability audits',
      'SCRUM',
      'Test-driven development',
      'Iterative design',
      'Interoperability protocols',
      'Database implementation',
      'GitHub, ZenHub & Code Climate',
    ],
    seenIn: ['trip-planner', 'hardpoint'],
  },
  {
    // mordhaumod.html:81-82, foresthack.html:78, archlinux.html:89-100
    id: 'engines-systems',
    label: CAPABILITY_LABELS['engines-systems'],
    items: [
      'Unreal Engine 4 server & client replication',
      'Unity',
      'Arch Linux',
      'Bash scripting',
      'Linux permissions & file-system structure',
      'Vim',
    ],
    seenIn: ['hardpoint', 'the-forest', 'arch-linux'],
  },
  {
    // index.html:221-344 (skills), ant_game.html:88-93, paradox.html:86-89
    id: 'design-3d',
    label: CAPABILITY_LABELS['design-3d'],
    items: [
      'Photoshop, Illustrator & Premiere',
      'Cinema 4D',
      'ZBrush sculpting',
      'Substance Painter texturing',
      'Maya rigging',
      'UI & UX design',
    ],
    seenIn: ['ant-game', 'paradox'],
  },
];
