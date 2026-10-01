/**
 * Pure helpers for the omnibar aside answer: a small LRU+TTL cache so retyping
 * the same query does not pay for another call, and a light markdown strip
 * for the screen-reader announcement of an answer.
 */

/**
 * Default idle delay before the aside calls a model.
 *
 * A knob, not a constant (R23): too short spends a call on an ordinary typing
 * pause, too long makes the feature feel absent, and the right value depends on
 * how fast the user types and how slow their model is. The omnibar settings
 * offer these choices.
 */
export const OMNIBAR_ASIDE_DELAY_MS = 3_000;
export const OMNIBAR_ASIDE_DELAY_CHOICES_MS = [1_000, 2_000, 3_000, 5_000] as const;

export interface OmnibarAsideCacheEntry {
  answer: string;
  tier: "local" | "remote";
}

const DEFAULT_MAX_ENTRIES = 20;
const DEFAULT_TTL_MS = 5 * 60_000;

interface StoredEntry extends OmnibarAsideCacheEntry {
  expiresAt: number;
}

export class OmnibarAsideAnswerCache {
  private readonly entries = new Map<string, StoredEntry>();

  constructor(
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
    private readonly ttlMs = DEFAULT_TTL_MS,
  ) {}

  private key(connectionId: string | null | undefined, query: string): string {
    return `${connectionId ?? ""}\u0000${query}`;
  }

  get(connectionId: string | null | undefined, query: string): OmnibarAsideCacheEntry | undefined {
    const key = this.key(connectionId, query);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert to mark it most-recently-used; Map iteration order is insertion order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { answer: entry.answer, tier: entry.tier };
  }

  set(connectionId: string | null | undefined, query: string, value: OmnibarAsideCacheEntry): void {
    const key = this.key(connectionId, query);
    this.entries.delete(key);
    this.entries.set(key, { ...value, expiresAt: Date.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}

/** Shared across the app's one omnibar instance; small and short-lived by design. */
export const omnibarAsideAnswerCache = new OmnibarAsideAnswerCache();

/** Undoes the common markdown an answer should not have used (R plain-text instruction). */
export function stripStrayMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
}

/** What escalating to Mari carries: the answer, or the whole exchange once a follow-up was asked. */
export function omnibarAsideHandoffAnswer(
  answer: string,
  followUp?: { question: string; previousAnswer: string },
): string {
  return followUp
    ? `${followUp.previousAnswer.trim()}\n\nFollow-up: ${followUp.question.trim()}\n${answer.trim()}`
    : answer;
}
