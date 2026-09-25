// What Professor Mari looked at during a run, so her reply can show it as cards (a character's avatar
// and name, a lorebook, a persona) instead of leaving you with "Reading character" steps only.

export type MariReferencedResourceKind = "character" | "lorebook" | "persona";

export interface MariReferencedResource {
  kind: MariReferencedResourceKind;
  id: string;
  /** From the tool output when the client has no preview of the record yet. */
  name: string | null;
}

interface MariToolCallLike {
  name: string;
  status: string;
  input?: unknown;
  output: string | null;
}

const READ_ACTION = /^(character|lorebook|persona)\.(get|list|search)$/u;
/** A list of 200 characters is not an answer; the cards are for what she picked out. */
const MAX_REFERENCES = 12;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function recordName(record: Record<string, unknown>): string | null {
  const name = record.name ?? asRecord(record.data)?.name ?? record.title;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function parseOutput(output: string | null): unknown {
  if (!output) return null;
  try {
    return JSON.parse(output);
  } catch {
    // Oversized reads come back elided and are no longer JSON; the single-read path below still works.
    return null;
  }
}

/** The first array in a list/search result: the result itself, or a field such as `items`. */
function listRecords(parsed: unknown): Record<string, unknown>[] {
  const list = Array.isArray(parsed) ? parsed : Object.values(asRecord(parsed) ?? {}).find(Array.isArray);
  return (list ?? []).map(asRecord).filter((record): record is Record<string, unknown> => record !== null);
}

export function collectMariReferencedResources(tools: readonly MariToolCallLike[]): MariReferencedResource[] {
  const seen = new Map<string, MariReferencedResource>();
  const add = (kind: MariReferencedResourceKind, id: unknown, name: string | null) => {
    if (typeof id !== "string" || !id.trim() || seen.size >= MAX_REFERENCES) return;
    const key = `${kind}:${id}`;
    if (!seen.has(key)) seen.set(key, { kind, id, name });
  };
  for (const tool of tools) {
    if (tool.status !== "done" || !/app[ _-]?data/iu.test(tool.name)) continue;
    const input = asRecord(tool.input);
    const match = typeof input?.action === "string" ? READ_ACTION.exec(input.action) : null;
    if (!match) continue;
    const kind = match[1] as MariReferencedResourceKind;
    const parsed = parseOutput(tool.output);
    if (match[2] === "get") {
      const record = asRecord(parsed);
      const outputName =
        (record && recordName(record)) ?? tool.output?.match(/"(?:name|title)"\s*:\s*"((?:[^"\\]|\\.){1,80})"/u)?.[1];
      add(kind, input?.id ?? input?.[`${kind}Id`] ?? record?.id, outputName ?? null);
      continue;
    }
    for (const record of listRecords(parsed)) add(kind, record.id, recordName(record));
  }
  return [...seen.values()];
}
