export const MARI_STORY_STATES = [
  "thinking",
  "research",
  "planning",
  "editing",
  "debugging",
  "images",
  "waiting",
  "approval",
  "success",
  "retry",
  "cancelled",
  "idle",
] as const;

export type MariStoryState = (typeof MARI_STORY_STATES)[number];
export type MariWorkAnimation = { id: MariStoryState; src: string };

export interface MariAppearancePack {
  id: string;
  label: string;
  description: string;
  /** Workspace, omnibar and top-bar Maris resolve the same pack. */
  portraits: {
    idle: string;
    blink: string;
    arrival: string;
    map: string;
    shrug: string;
    drag: string;
  };
  stories: Record<MariStoryState, MariWorkAnimation>;
}

const generated = (filename: string) => `/sprites/mari/generated/${filename}`;

export const MARI_APPEARANCE_PACKS: readonly MariAppearancePack[] = [
  {
    id: "basic",
    label: "Basic",
    description:
      "Mari's familiar pixel look, with a little story for every state. Shared by the workspace, omnibar and top bar.",
    portraits: {
      idle: generated("professor-mari-assistant-idle.png"),
      blink: generated("professor-mari-assistant-blink-v3.png"),
      arrival: generated("professor-mari-assistant-sheet.png"),
      map: generated("professor-mari-assistant-map.png"),
      shrug: generated("professor-mari-assistant-shrug.png"),
      drag: generated("professor-mari-assistant-drag-sheet-v3.png"),
    },
    stories: Object.fromEntries(
      MARI_STORY_STATES.map((id) => [
        id,
        {
          id,
          src: `/sprites/mari/basic/${id}.png`,
        },
      ]),
    ) as Record<MariStoryState, MariWorkAnimation>,
  },
  {
    id: "dottore",
    label: "Mari loves Dottore",
    description:
      "A cyan heart pin, a Dottore plush and twelve little fangirl stories. Shared by the workspace, omnibar and top bar.",
    portraits: {
      idle: "/sprites/mari/dottore/portrait-idle.png",
      blink: "/sprites/mari/dottore/portrait-blink.png",
      arrival: "/sprites/mari/dottore/idle.png",
      map: "/sprites/mari/dottore/portrait-map.png",
      shrug: "/sprites/mari/dottore/portrait-shrug.png",
      drag: "/sprites/mari/dottore/idle.png",
    },
    stories: Object.fromEntries(
      MARI_STORY_STATES.map((id) => [id, { id, src: `/sprites/mari/dottore/${id}.png` }]),
    ) as Record<MariStoryState, MariWorkAnimation>,
  },
  {
    id: "golden",
    label: "Golden Mari",
    description:
      "Shiny gold, a larger-than-life Chad expression and twelve golden stories. Shared by the workspace, omnibar and top bar.",
    portraits: {
      idle: "/sprites/mari/golden/portrait-idle.png",
      blink: "/sprites/mari/golden/portrait-blink.png",
      arrival: "/sprites/mari/golden/idle.png",
      map: "/sprites/mari/golden/portrait-map.png",
      shrug: "/sprites/mari/golden/portrait-shrug.png",
      drag: "/sprites/mari/golden/idle.png",
    },
    stories: Object.fromEntries(
      MARI_STORY_STATES.map((id) => [id, { id, src: `/sprites/mari/golden/${id}.png` }]),
    ) as Record<MariStoryState, MariWorkAnimation>,
  },
  {
    id: "safari",
    label: "Safari Mari",
    description:
      "Safari gear, jungle discoveries and twelve little expeditions. Shared by the workspace, omnibar and top bar.",
    portraits: {
      idle: "/sprites/mari/safari/portrait-idle.png",
      blink: "/sprites/mari/safari/portrait-blink.png",
      arrival: "/sprites/mari/safari/idle.png",
      map: "/sprites/mari/safari/portrait-map.png",
      shrug: "/sprites/mari/safari/portrait-shrug.png",
      drag: "/sprites/mari/safari/idle.png",
    },
    stories: Object.fromEntries(
      MARI_STORY_STATES.map((id) => [id, { id, src: `/sprites/mari/safari/${id}.png` }]),
    ) as Record<MariStoryState, MariWorkAnimation>,
  },
];

export function getMariAppearancePack(id: unknown): MariAppearancePack {
  return MARI_APPEARANCE_PACKS.find((pack) => pack.id === id) ?? MARI_APPEARANCE_PACKS[0]!;
}

/** A completed reply alone is not evidence that a workspace change succeeded. */
export function resolveMariRestStory({
  working,
  failed,
  cancelled,
  needsApproval,
  hasAppliedChanges,
}: {
  working: boolean;
  failed: boolean;
  cancelled: boolean;
  needsApproval: boolean;
  hasAppliedChanges: boolean;
}): MariStoryState | null {
  if (working) return null;
  if (failed) return "retry";
  if (cancelled) return "cancelled";
  if (needsApproval) return "approval";
  return hasAppliedChanges ? "success" : null;
}

export function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Prefer a real lifecycle state; tool activity only chooses working stories. */
export function selectMariWorkAnimation({
  activity,
  toolNames,
  packId,
  state,
}: {
  activity: string;
  toolNames: string[];
  packId?: string;
  state?: MariStoryState;
}): MariWorkAnimation {
  const stories = getMariAppearancePack(packId).stories;
  if (state) return stories[state];
  const signal = `${activity} ${toolNames.join(" ")}`.toLowerCase();
  if (/image|picture|portrait|sprite|thumbnail|gallery|illustrat|crop|visual/.test(signal)) return stories.images;
  if (/error|fail|debug|repair|fix|diagnos|test/.test(signal)) return stories.debugging;
  if (/search|research|read|fetch|browse|wiki|inspect|find|grep/.test(signal)) return stories.research;
  if (/plan|reason|map|decid|compar|analy/.test(signal)) return stories.planning;
  if (/write|edit|patch|create|update|remove|file/.test(signal)) return stories.editing;
  if (/install|build|compile|command|shell|bash|terminal|wait/.test(signal)) return stories.waiting;
  return stories.thinking;
}
