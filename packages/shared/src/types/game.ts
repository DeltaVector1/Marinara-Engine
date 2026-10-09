// ──────────────────────────────────────────────
// Game Mode Types
// ──────────────────────────────────────────────

/** The four main states a game can be in during a session. */
export type GameActiveState = "exploration" | "dialogue" | "combat" | "travel_rest";


/**
 * Combat presentation preference for Game Mode.
 * - `classic`: existing cinematic JRPG menu combat (GameCombatUI + combat.service).
 * - `tactical`: Fire Emblem / FFT style grid battle (tactical-combat feature engine).
 */
export type GameCombatStyle = "classic" | "tactical";




// ── Maps ──

/** A cell in the overworld grid map. */
interface GridCell {
  x: number;
  y: number;
  emoji: string;
  label: string;
  discovered: boolean;
  terrain: string;
  /** Optional longer description shown on hover/click */
  description?: string;
  /** Explicit hierarchical-location binding. Unbound cells remain tactical positions. */
  spatialLocationId?: string;
}

/** A node in a dungeon/interior node-graph map. */
interface MapNode {
  id: string;
  emoji: string;
  label: string;
  /** Visual position (percentage 0–100) */
  x: number;
  /** Visual position (percentage 0–100) */
  y: number;
  discovered: boolean;
  description?: string;
  /** Explicit hierarchical-location binding. Unbound nodes remain tactical positions. */
  spatialLocationId?: string;
}

/** An edge connecting two nodes in a node-graph map. */
interface MapEdge {
  from: string;
  to: string;
  label?: string;
}

/** A map of the current area — either a grid (overworld/city) or a node graph (dungeon/interior). */
export interface GameMap {
  /** Stable ID used when a game stores more than one map. Older saves may omit it. */
  id?: string;
  type: "grid" | "node";
  name: string;
  description: string;
  /** Hierarchical location represented by this local or tactical map. */
  spatialLocationId?: string;
  /** Grid dimensions (only for type: "grid") */
  width?: number;
  height?: number;
  cells?: GridCell[];
  /** Node graph data (only for type: "node") */
  nodes?: MapNode[];
  edges?: MapEdge[];
  /** Current party position — {x, y} for grids, node ID for node graphs */
  partyPosition: { x: number; y: number } | string;
}

// ── NPCs ──

/** A tracked NPC in the game world. */
export interface GameNpc {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Origin of the description. "model", "library", and "user" descriptions are canonical profile text. */
  descriptionSource?: "model" | "library" | "narration" | "user";
  /** Optional presentation hint used for systems like NPC voice matching. */
  gender?: string | null;
  /** Optional pronoun hint used for systems like NPC voice matching. */
  pronouns?: string | null;
  location: string;
  /** Party reputation with this NPC: -100 (hostile) to 100 (devoted) */
  reputation: number;
  /** Notable interactions or knowledge */
  notes: string[];
  /** Optional avatar URL (generated or uploaded) */
  avatarUrl?: string | null;
}




// ── Dice ──

/** Result of a dice roll. */
export interface DiceRollResult {
  /** The notation used, e.g. "2d6+3" */
  notation: string;
  /** Individual die results */
  rolls: number[];
  /** Modifier applied */
  modifier: number;
  /** Final total */
  total: number;
  /** Optional difficulty class declared before the roll. */
  dc?: number;
}

/** Result of a skill check resolution. */
export interface SkillCheckResult {
  skill: string;
  dc: number;
  rolls: number[];
  usedRoll: number;
  modifier: number;
  total: number;
  success: boolean;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  rollMode: "advantage" | "disadvantage" | "normal";
  /** How the reported total was calculated from the dice. */
  resolution: "sum" | "successes";
  /**
   * Dice notation actually rolled (e.g. "1d20", "6d10"). Absent on results from
   * before this field existed, and on the built-in resolver's own output where
   * it is always "1d20" — readers should default to that. Non-d20 values only
   * arrive from a GM-declared [skill_check: dice="..."] tag, which is how
   * non-d20 systems (pool systems like V20) reach the dice card intact.
   */
  dice?: string;
  /**
   * The party member the check was rolled for, in a game with a pinned ruleset. Absent means the
   * player, and always absent under the Engine's own rules, which only ever check the player.
   */
  who?: string;
  /**
   * Per-die target a success pool counted with, so a card can mark the dice that counted. Set by
   * both pool paths: the legacy `resolution="successes"` tag, which knows the threshold it was
   * given, and a `dice-pool` ruleset, which knows the one its rules chose. Absent on every summed
   * check, where there is no such thing.
   */
  threshold?: number;
  /**
   * What a ruleset check actually applied of the tag's `with=` and `bonus=`: the ability's label
   * when the skill was rolled with another ability than its own, and the situational dice after the
   * ruleset's clamp. Absent when nothing was applied, so a record never claims an ask that the roll
   * ignored. Only a ruleset game sets them.
   */
  withAbility?: string;
  bonusDice?: number;
  /**
   * What the roller's wound track took off this check, when the ruleset names one with
   * `resolution.penaltyFrom` and the character is marked. Always negative, and absent when there
   * was no penalty, so a record never claims a wound nobody has. A summed check has it folded into
   * `modifier` as well, because it IS a modifier there; a pool check spent it on dice instead, so
   * this is the only place the pool's missing dice are said.
   */
  penalty?: number;
  /**
   * What this check actually paid out of a pool, when the Game Master wrote `spend=` and the
   * ruleset offers such a purchase. Absent when nothing was bought, and never what the tag asked
   * for: a spend the pool could not cover buys nothing and costs nothing, so a record only ever
   * says what really left the sheet.
   */
  spent?: { pool: string; amount: number };
  /**
   * Successes a purchase added that nobody rolled. They are inside `total` already; this is what
   * lets a card show which part of the result came out of the dice. Only a ruleset game sets it.
   */
  autoSuccesses?: number;
  /**
   * The catalog entry this check actually applied, by the label the ruleset gives it. Absent when
   * the Game Master named none, when the character does not have it, or when the pool could not
   * cover it, so a record never claims a charm that did nothing.
   */
  used?: string;
  /** How many dice a bought re-throw replaced. Absent when none were. */
  rerolled?: number;
  /**
   * The faces a pool check exploded and doubled from, set only when the check moved them off the
   * ruleset's own default (a Game Master's `explode=` or `double=`, or an entry that grants it).
   */
  explodeFrom?: number;
  doubleFrom?: number;
  /**
   * The roll did not botch outright, but something went wrong on the side of it: a pool ruleset whose
   * `botch.rule` is `halfOrMore` saw low faces on half its dice or more while a die still succeeded.
   * `success` is still the outcome; this is what happens beside it. Absent everywhere else.
   */
  complication?: boolean;
  /**
   * What the sheet itself added to or took off the check through `resolution.adjust`, beside any
   * wound penalty: dice on a pool, a flat number on a sum (where it is inside `modifier` too). Absent
   * when nothing applied.
   */
  adjust?: number;
  /** The standing re-throw the Game Master named with `reroll=` and the check applied, by its id. */
  reroll?: string;
  /**
   * What the character's conditions and worn or carried items added to or took off the check, their
   * dice rolled: dice on a pool, a flat number on a sum (where it is inside `modifier` too). Absent
   * when nothing did.
   */
  effects?: number;
  /**
   * The conditions and items that changed this check, by name: its number, how it was thrown, or that
   * it failed without a roll. Only a ruleset game sets it, and only what changed something.
   */
  from?: string[];
  /** The save failed without a roll, because something named in `from` makes it fail. */
  automatic?: boolean;
}

// ── The sighted dice pool (opt-in, last) ──

/** The seven sizes the engine pre-throws. Anything else is an overflow, not a pool miss. */
export type GameDicePoolSize = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

/**
 * One chat's dice pool as it stood for one turn.
 *
 * Stored per (chat, message, swipe) in `game_dice_pools` rather than in the game-state
 * snapshot or in chat metadata, for reasons that are load-bearing: the snapshot is only
 * written when a tracker agent runs, so with agents off no row exists at all; its writer
 * is a delete-then-insert from an explicit field list, so any column a caller does not
 * name is silently lost; and metadata is client-writable and not per-swipe, so a swipe
 * would spend dice and never give them back.
 */
export interface GameDicePool {
  /** On-disk revision. A row of another revision is refused, never half-read. */
  v: 1;
  /** Accepted turns this pool has lived through. Advisory; the aging clock is per size. */
  turn: number;
  /** Each size's queue, head first. Consumption is from the head, refill at the tail. */
  values: Record<GameDicePoolSize, number[]>;
  /** Accepted turns each size has gone unspent, which is what bounds the frozen head. */
  idle: Record<GameDicePoolSize, number>;
}

/** One value the engine actually spent, in the order it spent it. */
export interface GameDicePoolConsumption {
  size: GameDicePoolSize;
  /** Zero-based index into the size's queue. The slot NAME in a tag is one-based. */
  slot: number;
  /** The value spent. The engine's record, not the model's claim. */
  value: number;
  /** Which tag of the turn spent it, in reading order, so the ledger reads as a sequence. */
  tagIndex: number;
}

/**
 * What the model wrote in `pool=` or `rolls=` disagreeing with what the engine spent.
 *
 * Recorded and never obeyed. The slot name is a checksum, not an instruction: the engine
 * spends the next unconsumed value of that size in reading order whatever the tag says,
 * so a mismatch changes the log and the notice and changes no number at all.
 */
export interface GameDicePoolMismatch {
  /**
   * `slot`: a slot other than the one spent, which covers a skipped slot and a reordered
   * one alike. `value`: a number other than the one spent. `reuse`: a slot this turn had
   * already spent.
   *
   * There is deliberately no attribute-order kind. The design re-grades "declaration
   * before value" as a weak signal with no defensive worth — for a thinking model the DC
   * is chosen in reasoning tokens long before any attribute is emitted — and the engine's
   * own record writes `pool=` last, so a positional rule would flag the engine's own
   * shape on every turn. A signal that fires on the correct answer is noise.
   */
  kind: "slot" | "value" | "reuse";
  size: GameDicePoolSize;
  /** What the engine spent, zero-based. */
  slot: number;
  /** What the model claimed, verbatim and truncated, for the log line. */
  wrote?: string;
}

/** The head values the prompt shows, at the configured window. One entry per size. */
export type GameDicePoolView = Array<{ size: GameDicePoolSize; values: number[] }>;

/** A parsed `pool="d6:1|2|3"` value: the size, and its slots as zero-based indices. */
export interface GameDicePoolSlotName {
  size: GameDicePoolSize;
  slots: number[];
}

type DirectionEffect =
  | "fade_from_black"
  | "fade_to_black"
  | "flash"
  | "screen_shake"
  | "blur"
  | "vignette"
  | "letterbox"
  | "color_grade"
  | "focus"
  | "pulse"
  | "slow_zoom"
  | "impact_zoom"
  | "tilt"
  | "desaturate"
  | "chromatic_aberration"
  | "film_grain"
  | "rain_streaks"
  | "spotlight";

/** A single cinematic direction command parsed from GM output. */
export interface DirectionCommand {
  effect: DirectionEffect;
  /** Duration in seconds. Default 1. */
  duration?: number;
  /** Intensity 0-1. Default 0.5. */
  intensity?: number;
  /** Target layer: "background" | "content" | "all". Default "all". */
  target?: "background" | "content" | "all";
  /** Arbitrary params: color for flash, preset for color_grade, etc. */
  params?: Record<string, string>;
}

// ── HUD Widgets ──

/** Available widget types the model can use for custom HUD elements. */
type HudWidgetType =
  "progress_bar" | "gauge" | "relationship_meter" | "counter" | "stat_block" | "list" | "inventory_grid" | "timer";

/** Milestone marker on a progress/relationship bar. */
interface WidgetMilestone {
  at: number;
  label: string;
}

/** A model-defined HUD widget. */
export interface HudWidget {
  id: string;
  type: HudWidgetType;
  label: string;
  icon?: string;
  position: "hud_left" | "hud_right";
  accent?: string;
  config: HudWidgetConfig;
}

/** Type-specific widget config. */
interface HudWidgetConfig {
  // progress_bar / gauge / relationship_meter
  /** Initial value used when the widget is created for a new session. */
  startingValue?: number;
  /** Current value shown at runtime. */
  value?: number;
  max?: number;
  milestones?: WidgetMilestone[];
  dangerBelow?: number;

  // counter
  count?: number;

  // stat_block
  stats?: Array<{ name: string; value: number | string }>;

  // list
  items?: string[];

  // inventory_grid
  slots?: number;
  categories?: string[];
  contents?: Array<{ name: string; slot?: string; quantity?: number }>;

  // timer
  seconds?: number;
  running?: boolean;

  // GM-defined value hints for the scene model (e.g. "alpha | omega | beta" for a class stat)
  valueHints?: Record<string, string>;
}






export type GameSceneVideoAspectRatio = "16:9" | "9:16";

export interface GeneratedSceneVideo {
  id: string;
  chatId: string;
  filePath: string;
  url: string;
  sourceIllustrationTag: string | null;
  sourceIllustrationPath: string | null;
  prompt: string;
  provider: string;
  model: string;
  durationSeconds: number;
  aspectRatio: GameSceneVideoAspectRatio;
  createdAt: string;
}

type GameStoryboardStatus =
  "planning" | "rendering_images" | "rendering_videos" | "complete" | "partial" | "failed";

type GameStoryboardKeyframeStatus =
  "planned" | "rendering_image" | "image_complete" | "rendering_video" | "complete" | "failed";

type StoryboardAnimationSuitability = "suitable" | "simplify" | "subtle" | "regenerate";

interface GameStoryboardMediaRef {
  id: string;
  url: string;
  prompt: string;
  provider: string;
  model: string;
  createdAt: string;
}

interface GameTurnStoryboardKeyframe {
  id: string;
  storyboardId: string;
  index: number;
  title: string;
  sectionStartIndex: number | null;
  sectionEndIndex: number | null;
  anchorQuote: string;
  anchorKind: "narration" | "dialogue" | "readable" | "system" | "user" | "assistant" | "";
  narrationBeat: string;
  mangaPanelPrompt: string;
  imagePrompt: string;
  videoPrompt: string;
  animationSuitability: StoryboardAnimationSuitability | "";
  characters: string[];
  continuityNotes: string;
  cameraMotion: string;
  transitionHint: string;
  durationSeconds: number;
  aspectRatio: GameSceneVideoAspectRatio;
  chatImageId: string | null;
  sceneVideoId: string | null;
  image: GameStoryboardMediaRef | null;
  video: GeneratedSceneVideo | null;
  status: GameStoryboardKeyframeStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameTurnStoryboard {
  id: string;
  chatId: string;
  messageId: string;
  swipeIndex: number;
  snapshotId: string | null;
  sessionNumber: number | null;
  turnNumber: number | null;
  title: string;
  sourceNarration: string;
  sourceNarrationHash: string;
  status: GameStoryboardStatus;
  provider: string;
  model: string;
  directorPrompt: string;
  error: string | null;
  keyframes: GameTurnStoryboardKeyframe[];
  createdAt: string;
  updatedAt: string;
}
