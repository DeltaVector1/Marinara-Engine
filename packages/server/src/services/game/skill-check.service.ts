// ──────────────────────────────────────────────
// Service: Skill Check Resolution
//
// Resolves d20-based skill checks using player
// stats. Supports advantage/disadvantage, crits,
// and attribute-linked modifiers.
// ──────────────────────────────────────────────

import type { RPGAttributes } from "@marinara-engine/shared";


export interface SkillCheckResult {
  skill: string;
  dc: number;
  /** The raw d20 roll(s) — 2 if advantage/disadvantage, 1 otherwise. */
  rolls: number[];
  /** The die value that was used (1-20), not an index into rolls. */
  usedRoll: number;
  /** Total modifier applied (skill + attribute). */
  modifier: number;
  /** Final total: usedRoll + modifier. */
  total: number;
  /** Whether the check passed. */
  success: boolean;
  /** Natural 20 on the used roll. */
  criticalSuccess: boolean;
  /** Natural 1 on the used roll. */
  criticalFailure: boolean;
  /** Roll mode used by the resolver. */
  rollMode: "advantage" | "disadvantage" | "normal";
  /** Built-in checks add the used die and modifiers. */
  resolution: "sum";
  /** Notation for the dice actually thrown (e.g. "1d20", "2d20" with advantage). */
  dice: string;
}


/**
 * Compute a D&D-style attribute modifier: floor((score - 10) / 2).
 */
export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}


/**
 * Map character-sheet attribute names (free-form, e.g. "STR", "Strength",
 * "Dexterity") to the strict {str,dex,...} RPGAttributes shape used for skill
 * resolution. Case-insensitive; unrecognised names are dropped.
 */
const ATTRIBUTE_NAME_MAP: Record<string, keyof RPGAttributes> = {
  str: "str",
  strength: "str",
  dex: "dex",
  dexterity: "dex",
  con: "con",
  constitution: "con",
  int: "int",
  intelligence: "int",
  wis: "wis",
  wisdom: "wis",
  cha: "cha",
  charisma: "cha",
};

/**
 * Read one free-form attribute name as a strict `RPGAttributes` key, or `null` when it
 * names no attribute. Exported so a caller that resolves a single name — the dice
 * placeholder's `+STR` term — folds the same way the sheet mapper does rather than
 * carrying a second spelling of the same table.
 */
function mapSheetAttributeName(name: string): keyof RPGAttributes | null {
  if (typeof name !== "string") return null;
  return ATTRIBUTE_NAME_MAP[name.trim().toLowerCase()] ?? null;
}

export function mapSheetAttributesToRPG(
  attrs: ReadonlyArray<{ name: string; value: number }> | null | undefined,
): Partial<RPGAttributes> {
  if (!Array.isArray(attrs)) return {};
  const out: Partial<RPGAttributes> = {};
  for (const attr of attrs) {
    if (!attr || typeof attr.name !== "string") continue;
    const key = mapSheetAttributeName(attr.name);
    if (!key) continue;
    const value = Number(attr.value);
    if (!Number.isFinite(value)) continue;
    out[key] = value;
  }
  return out;
}
