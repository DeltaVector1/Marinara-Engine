// ──────────────────────────────────────────────
// Dice placeholders — `[[roll: <notation>]]`
//
// The Game Master writes a number it never sees: "the axe bites deep for
// [[roll: 2d6+3]] damage". After the turn is written, the engine rolls each
// placeholder, substitutes the total into the saved narration, and records the roll.
// The model committed the sentence before a die existed, so there is nothing for it
// to steer and nothing to pre-throw.
//
// Two things in here are load-bearing and neither is obvious.
//
// 1. THE SCAN IS AN OPENER WALK, NOT A BOUNDED REGEX. A bounded regex cannot see the
//    malformed spans the contract promises to replace, and a span that is never
//    matched cannot be replaced with anything. Measured against a bounded pattern:
//    `[[roll: 1d6+<70 nines>]]` does not match at all, `[[roll: 2d6]` does not match
//    at all, and `[[roll: 2d6 [x]]]` matches short and leaves a stray `]` in the
//    prose. A survivor is then half-eaten rather than left visible: the shipped
//    unknown-tag strippers turn "for [[roll: 2d6+3]] damage" into "for [] damage".
//    So every opener produces a BOUNDED span, and every bounded span is replaced —
//    with a number when the body reads, and with a short visible notice when it does
//    not. Never with an invented number.
//
// 2. THE ROLLER IS INJECTED. This package must stay free of `node:crypto`, and the
//    engine rolls a placeholder with `crypto.randomInt` rather than `Math.random()`.
//    Same dependency-injection shape `resolveGameDiceRequests` already uses for its
//    own roller, for the same reason: a lane needs a scripted die.
//
// The 64-character cap is a REJECTION REASON inside the pass, not a matching
// precondition. That distinction is the whole difference between a contract that
// holds and one that only looks like it does.
// ──────────────────────────────────────────────

/**
 * One substituted placeholder: what was rolled, and where the number landed.
 *
 * Saved out of band, because the content itself carries a bare number so the prompt
 * leaf and the transcript both read as prose.
 */
export interface GameDicePlaceholderRecord {
  /** The body as the model wrote it, for audit: "2d6+3", "1d8+STR". */
  raw: string;
  /** The notation actually thrown, after clamping and sheet resolution, with the modifier total. */
  notation: string;
  rolls: number[];
  /** The summed modifier: the flat term plus whatever the sheet name resolved to. */
  modifier: number;
  /**
   * Which form supplied the modifier, so a hover can name its source. A body carrying
   * both a flat number and a sheet name reports the sheet form; `raw` carries the rest.
   */
  modifierSource: "flat" | "attribute" | "skill" | "none";
  total: number;
  /** The substituted text, as written into content. */
  text: string;
  /** Character offset of `text` in the substituted content. */
  index: number;
}
