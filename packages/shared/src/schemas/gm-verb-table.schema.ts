import { z } from "zod";

// Package-declared Game Master verbs (#5798). An Experience package ships its closed verb
// vocabulary as a hash-pinned asset; the Engine renders one prompt line per verb into the GM
// format reminder, scans the finished narration for exactly those tags, and either writes a
// STATE verb's arguments wholesale under the package's own chat-metadata key or delivers an
// EVENT verb to the package live. This file is the declaration contract only — the reader, the
// prompt render and the executor land with the runtime.

/** Reserved filename a package ships its verb table under. Discovery is by convention rather
 *  than by a manifest key — the first convention-discovered file in the package pipeline, since
 *  `entrypoints` are declared paths read by name — so an older Engine sees an ordinary JSON asset
 *  and ignores it instead of refusing the whole manifest. The file must still be declared in
 *  `contributions.assets.paths` and hash-pinned in `files[]`; shipped in `files[]` alone it is
 *  silent in both directions. */
export const GM_VERB_TABLE_ASSET_PATH = "gm-verbs.json";

/** Byte ceiling checked against the manifest's declared `files[].bytes` BEFORE the asset is read.
 *  `files[].bytes` permits up to 100 MB and nothing else caps an asset ahead of a read, so a verb
 *  table is refused on its declared size rather than after the bytes are already in memory. */
export const GM_VERB_TABLE_MAX_BYTES = 64 * 1024;

/** Bracket-tag names the Engine already owns, case-folded, so a package verb can never shadow a
 *  built-in tag — the GM would emit one name for two consumers and the tag would be stripped by
 *  whichever path matched first. `whisper` is the sharpest of them: a package verb by that name
 *  would have `[whisper:Tam]` cut out of a dialogue line before save, and the line stops matching
 *  the dialogue grammar for good.
 *
 *  Derived from two kinds of source, all of them swept by `capability-gm-verbs.regression.ts` so
 *  the pin cannot rot silently:
 *    1. The prompt renders — every `[name:` the GM format reminder
 *       (`packages/server/src/services/game/gm-prompts.ts`) and the party/VN reminder
 *       (`party-prompts.ts`) can emit across all of their branches (`reputation`, `skill_check`,
 *       `state`, `whisper`, `[Note:`/`[Book:` and the rest).
 *    2. The narration parsers — every bracket name the Engine matches back out of a finished turn.
 *       There are five. Two of them carry names nothing else does: the client tag parser
 *       (`packages/client/src/lib/game-tag-parser.ts`), whose set is wider than any reminder
 *       renders (`ambient`, `direction`, `music`, `element_attack`, …) and the only source of
 *       `party-chat`/`party-turn`, and the client narration formatter
 *       (`packages/client/src/components/game/game-narration-format.ts`), the only source of
 *       `qte_bonus`/`qte_result`, which it renders as command badges mid-stream. Which name is
 *       unique to which source shifts as the list grows: `element_attack` held the tag parser's
 *       half of that pin until the narration formatter — which matches it too — joined, so
 *       uniqueness is re-audited whenever a source is added rather than assumed to survive.
 *       The other three — the server's segment editor
 *       (`packages/server/src/services/game/segment-edits.ts`), the sidecar scene analyzer
 *       (`packages/server/src/services/sidecar/scene-analyzer.ts`) and the generate route's
 *       dialogue rewriter (`packages/server/src/routes/generate/generate-route-utils.ts`) — add no
 *       name the first two do not already yield today, and are swept so that a token arriving in
 *       one of them first cannot become shadowable unnoticed.
 *  The four that carry the dialogue tokens spell them as a regex alternation
 *  (`\[(main|side|extra|action|thought|whisper…)\]`), so the sweep walks alternation groups instead
 *  of reading one name per bracket. Those tokens are pinned from the parsers on purpose: the
 *  reminder renders them inside an alternation (`[main|side|whisper:Target|thought]`) that a
 *  `[name:` scan cannot see, and a bare-bracket scan of a prompt file would collect the example
 *  speaker names and expressions standing next to them. A shadowed name does its damage where the
 *  Engine parses it, so that is where the pin is derived.
 *  Case-folding is load-bearing: the reminder renders `[Note:`/`[Book:` capitalized and the shipped
 *  parse regex is case-insensitive, so a lowercase `note` verb would shadow the journal tag.
 *  `party-chat`/`party-turn` cannot collide anyway — a verb name may not contain a hyphen — and are
 *  kept so the pin matches its sources exactly, which is also what leaves them free to serve as the
 *  tag parser's canary.
 *  `roll` is the one name here that no sweep above yields, and it is reserved by hand for two
 *  colliding readers a package verb would shadow: Roleplay mode's own `[roll: character="…"]`
 *  command (`packages/server/src/services/generation/roleplay-commands.ts`), and the inner
 *  `[roll: 2d6+3]` of a Game placeholder, both of which match `CAPABILITY_COMMAND_TAG_PATTERN`
 *  exactly. `capability-gm-verbs.regression.ts` pins the reservation rather than derives it.
 *  `branch` and `on` are reserved by hand for the same reason and are NOT the same case as each
 *  other, so the difference is written down rather than implied. `[branch: crates]` matches
 *  `CAPABILITY_COMMAND_TAG_PATTERN` exactly, so a package verb named `branch` would intercept
 *  every one-request dice branch block before the engine's own arm ever saw it: that one is a
 *  real shadow. `on` is DEFENSIVE ONLY and cannot fire — `[on success]` puts a space between the
 *  name and the `]`, which that pattern does not accept — so it closes the name space without
 *  buying a fix, and it must never be cited as the reason the delimiters get stripped. What
 *  strips them is a literal pattern in `utils/dice-branch.ts`; no name set on either side
 *  reaches `[on success]` or `[/branch]` at all. */
const RESERVED_GM_TAG_NAMES = Object.freeze([
  "action",
  "ambient",
  "bg",
  "book",
  "branch",
  "choices",
  "combat",
  "combat_result",
  "dialogue",
  "dice",
  "direction",
  "element_attack",
  "extra",
  "inventory",
  "item_used",
  "loot",
  "main",
  "map_update",
  "music",
  "note",
  "on",
  "party-chat",
  "party-turn",
  "party_add",
  "party_change",
  "place",
  "qte",
  "qte_bonus",
  "qte_result",
  "reputation",
  "roll",
  "session_end",
  "sfx",
  "sheet",
  "side",
  "skill_check",
  "state",
  "status",
  "tag",
  "thought",
  "whisper",
  "widget",
] as const);

const reservedGmTagNames = new Set<string>(RESERVED_GM_TAG_NAMES);

const gmVerbEffectSchema = z.enum(["state", "event"]);

const gmVerbArgBaseSchema = z
  .object({
    /** Becomes a key of the flat JSON payload the GM writes into the tag. */
    name: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9_]*$/)
      .max(32),
    type: z.enum(["string", "number", "boolean"]),
    /** Closed value set. Strings only — an enum of numbers or booleans is a type, not a vocabulary. */
    enum: z.array(z.string().min(1).max(80)).min(1).max(16).optional(),
    /** Required for an un-enum'd string. The executor's scoped parse inherits no ceiling from the
     *  conversation-command registry's 2000-character default, so a free-text argument without a cap
     *  would invite a narration fragment into the package. */
    maxLength: z.number().int().min(1).max(500).optional(),
    optional: z.boolean().default(false),
  })
  .strict();

const gmVerbArgSchema = gmVerbArgBaseSchema.superRefine((arg, ctx) => {
  if (arg.enum && arg.type !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["enum"],
      message: "Only a string argument can declare an enum",
    });
  }
  if (arg.type !== "string" && arg.maxLength !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxLength"],
      message: "maxLength applies to string arguments only",
    });
  }
  if (arg.type === "string" && arg.enum && arg.maxLength !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxLength"],
      message: "An enum already bounds the value; drop maxLength",
    });
  }
  if (arg.type === "string" && !arg.enum && arg.maxLength === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxLength"],
      message: "A string argument without an enum must declare maxLength",
    });
  }
  // The other closed lists here — verb names, argument names, metadata keys — all refuse a repeat,
  // and a value set is no different: membership is a set, so a duplicate buys the vocabulary
  // nothing and reads as a typo in the one place a package spells its argument's values out.
  if (arg.enum) {
    const values = new Set<string>();
    for (const [index, value] of arg.enum.entries()) {
      if (values.has(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["enum", index],
          message: `Duplicate enum value "${value}"`,
        });
      }
      values.add(value);
    }
  }
});

const gmVerbBaseSchema = z
  .object({
    /** The bracket tag the GM emits. A subset of the shipped tag grammar's own name pattern
     *  (`[a-z][a-z0-9_-]*`) — no hyphens, so a verb can never take the shape of the hyphenated
     *  built-ins. */
    name: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/)
      .max(32),
    /** Rendered verbatim as the verb's line in the GM format reminder's COMMANDS block. */
    description: z.string().min(1).max(200),
    effect: gmVerbEffectSchema,
    /** Where a state verb's arguments are written, wholesale, on the chat's metadata row.
     *  Ownership is checked separately against the declaring package (`gmVerbMetadataKeyIssue`). */
    metadataKey: z
      .string()
      .regex(/^[a-z0-9][a-zA-Z0-9]*$/)
      .max(64)
      .optional(),
    args: z.array(gmVerbArgSchema).max(6).default([]),
  })
  .strict();

function refineGmVerb(verb: z.infer<typeof gmVerbBaseSchema>, ctx: z.RefinementCtx): void {
  if (reservedGmTagNames.has(verb.name.toLowerCase())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["name"],
      message: `"${verb.name}" is a built-in Game Master tag and cannot be a package verb`,
    });
  }
  // The description is a prompt line. A line break or a bracket would split the COMMANDS block or
  // take the shape of another tag, so both are refused at declaration rather than rendered.
  // CR and LF are not the whole break vocabulary: NEL (U+0085) and the Unicode line and paragraph
  // separators (U+2028, U+2029) end a line for anything that reads the rendered block back, and the
  // C0 controls reshape it without ending a line at all — a tab is the one a package is likeliest to
  // reach for, and it walks the next verb's line out of the column the block is read in.
  if (/[\r\n\u0085\u2028\u2029]/.test(verb.description)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["description"],
      message: "A verb description is one prompt line and cannot contain line breaks",
    });
  }
  if (/[\u0000-\u001F\u007F]/.test(verb.description)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["description"],
      message: "A verb description cannot contain control characters",
    });
  }
  if (/[[\]]/.test(verb.description)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["description"],
      message: "A verb description cannot contain square brackets",
    });
  }
  // Two-sided, so an event verb cannot squat a metadata key it never writes.
  if (verb.effect === "state" && !verb.metadataKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["metadataKey"],
      message: "A state verb must declare the metadataKey its arguments are written under",
    });
  }
  if (verb.effect === "event" && verb.metadataKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["metadataKey"],
      message: "An event verb writes nothing and must not declare a metadataKey",
    });
  }
  const argNames = new Set<string>();
  for (const [index, arg] of verb.args.entries()) {
    if (argNames.has(arg.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["args", index, "name"],
        message: `Duplicate argument name "${arg.name}"`,
      });
    }
    argNames.add(arg.name);
  }
}

/** One verb, checked for everything that does not depend on who declared it. */
const gmVerbSchema = gmVerbBaseSchema.superRefine(refineGmVerb);

export type GmVerb = z.infer<typeof gmVerbSchema>;
