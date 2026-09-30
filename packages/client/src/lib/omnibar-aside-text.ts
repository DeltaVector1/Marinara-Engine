/**
 * Pure helpers for the omnibar aside answer: a small LRU+TTL cache so retyping
 * the same query does not pay for another call, and a light markdown strip
 * for the rare answer that ignores the plain-text instruction.
 */

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
