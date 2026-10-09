// ──────────────────────────────────────────────
// Game: the sighted dice pool — the primitive
//
// The blind forms (the branch block and the placeholder) need no pool at all: the
// engine rolls at parse time, after the model has committed the sentence, so there
// is nothing to pre-throw. The pool exists for the one case neither blind form can
// serve — a number that itself has to pick between three or more different endings —
// and the only way to put a value in front of the model before it writes is to have
// thrown it already. That is the whole reason this module exists and the whole source
// of its integrity loss, which is why the sub-option ships off.
//
// What lives here is the arithmetic half, with no chat, no database and no prompt in
// it: the sizes, the allotment, the queue, the refill, the aging clock and the slot
// names. Everything that needs a chat lives in the server's pool service beside it.
//
// The queue is what makes the model's freedoms bounded rather than a matter of trust:
// it cannot get a value out of order, it cannot reuse one, and it cannot see past the
// window, because none of those is a rule the prompt asks it to follow — they are
// facts about a queue the engine holds.
// ──────────────────────────────────────────────

import type { GameDicePoolSize, GameDicePoolSlotName } from "../types/game.js";

/**
 * The seven sizes the product already treats as standard, in the order the prompt
 * lists them: biggest first, because a GM scanning the block wants the d20 first, and
 * the d100 last because it is the odd one out in both allotment and use.
 *
 * Anything outside this set is an overflow case, not a pool miss. The NdM grammar
 * allows up to 100 dice of up to 1000 sides and pre-loading that space is not possible.
 */
const GAME_DICE_POOL_SIZES: readonly GameDicePoolSize[] = ["d20", "d12", "d10", "d8", "d6", "d4", "d100"];

/**
 * How many values of each size the engine holds. Six for d4 through d20, two for d100.
 *
 * Reasoned from what a turn actually spends: one `[dice:]` tag can consume several
 * values of one size (`3d8+2` is one tag and three d8 values), advantage needs two d20
 * values for one check, and the guide frames checks as rare. The allotment governs only
 * how many BLIND spends a turn can absorb before overflowing; the window is what governs
 * how much the model sees, and that is a different number.
 */
const GAME_DICE_POOL_ALLOTMENT: Readonly<Record<GameDicePoolSize, number>> = {
  d4: 6,
  d6: 6,
  d8: 6,
  d10: 6,
  d12: 6,
  d20: 6,
  d100: 2,
};

/**
 * How many values per size the model is shown. **One**, and this is the single largest
 * mitigation in the whole design: at 1 the exposed surface is seven values rather than
 * thirty-eight, and every second spend of a size in a turn is blind.
 */
export const DEFAULT_GAME_DICE_POOL_WINDOW = 1;

/**
 * How many accepted turns a size may go unspent before it is rethrown. Without it the
 * head is a LATCH, not a per-turn choice: once a 2 parks at the head of the d20 queue, a
 * model that prefers successes can refuse d20 checks forever and the 2 never ages out.
 * Three bounds that latch. Zero turns aging off.
 */
export const DEFAULT_GAME_DICE_POOL_AGE_TURNS = 3;

/** The widest window worth offering: showing the whole allotment is showing everything. */
export const MAX_GAME_DICE_POOL_WINDOW = 6;
/** The longest idle clock worth offering. Past this the latch is effectively unbounded. */
export const MAX_GAME_DICE_POOL_AGE_TURNS = 20;

/**
 * Read a `pool=` value the model wrote.
 *
 * Read as a CHECKSUM, never as an instruction: what comes back is compared against what
 * the engine spent and recorded as a mismatch when they disagree. Nothing here can make
 * the engine spend a different value, which is why a hostile or nonsense slot name costs
 * the turn a log line rather than a roll.
 */
export function parsePoolSlotName(raw: string | null | undefined): GameDicePoolSlotName | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  const separator = trimmed.indexOf(":");
  if (separator <= 0) return null;
  const size = trimmed.slice(0, separator).trim().toLowerCase() as GameDicePoolSize;
  if (!GAME_DICE_POOL_SIZES.includes(size)) return null;
  const slots: number[] = [];
  for (const part of trimmed.slice(separator + 1).split(/[|,]/)) {
    const entry = part.trim();
    if (!/^\d+$/.test(entry)) return null;
    const slot = Number.parseInt(entry, 10);
    if (slot < 1 || slot > GAME_DICE_POOL_ALLOTMENT[size]) return null;
    slots.push(slot - 1);
  }
  return slots.length > 0 ? { size, slots } : null;
}
