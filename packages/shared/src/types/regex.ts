// ──────────────────────────────────────────────
// Regex Script Types (SillyTavern-compatible)
// ──────────────────────────────────────────────

/** Where a regex script is applied. */
export type RegexPlacement = "ai_output" | "user_input";

/** Which runtime contexts a regex script applies to. */
export type RegexApplyMode = "prompt" | "display" | "both";

/** How character-scoped scripts affect displayed messages. */
export type ScopedRegexMode = "disabled" | "exclusive" | "chat";
