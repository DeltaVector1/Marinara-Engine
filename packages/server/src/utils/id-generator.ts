// ──────────────────────────────────────────────
// Utility: ID Generation
// ──────────────────────────────────────────────
import { nanoid } from "nanoid";

/** Generate a unique ID (21-char nanoid). */
export function newId(): string {
  return nanoid();
}

/** Get the current ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}
