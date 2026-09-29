// What Professor Mari looked at during a run, so her reply can show it as cards (a character's avatar
// and name, a lorebook, a persona) instead of leaving you with "Reading character" steps only.

export type MariReferencedResourceKind = "character" | "lorebook" | "persona";

export interface MariReferencedResource {
  kind: MariReferencedResourceKind;
  id: string;
  /** From the tool output when the client has no preview of the record yet. */
  name: string | null;
  /** Came from a list or search, not a direct read: show it only if her answer names it. */
  fromList: boolean;
}

interface MariToolCallLike {
  name: string;
  status: string;
  input?: unknown;
  output: string | null;
}

const READ_ACTION = /^(character|lorebook|persona)\.(get|list|search)$/u;
/** A list of 200 characters is not an answer; the cards are for what she picked out. */
const MAX_REFERENCES = 4;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function recordName(record: Record<string, unknown>): string | null {
  const name = record.name ?? asRecord(record.data)?.name ?? record.title;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** Tool output is a report ("Command: ...", "stdout:", JSON); the JSON is the stdout part. */
function stdoutOf(output: string | null): string {
  if (!output) return "";
  const start = output.indexOf("stdout:\n");
  const body = start >= 0 ? output.slice(start + "stdout:\n".length) : output;
  const end = body.search(/\n\s*stderr:\n/u);
  return end >= 0 ? body.slice(0, end) : body;
}

function parseOutput(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    // Long results come back cut off and are no longer JSON; callers fall back to a pattern scan.
    return null;
  }
}

const ID_NAME_PAIR = /"id"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"((?:[^"\\]|\\.){1,80})"/gu;

/** The first array in a list/search result: the result itself, or a field such as `items`. */
function listRecords(parsed: unknown): Record<string, unknown>[] {
  const list = Array.isArray(parsed) ? parsed : Object.values(asRecord(parsed) ?? {}).find(Array.isArray);
  return (list ?? []).map(asRecord).filter((record): record is Record<string, unknown> => record !== null);
}

export function collectMariReferencedResources(tools: readonly MariToolCallLike[]): MariReferencedResource[] {
  const seen = new Map<string, MariReferencedResource>();
  const add = (kind: MariReferencedResourceKind, id: unknown, name: string | null, fromList: boolean) => {
    if (typeof id !== "string" || !id.trim()) return;
    const key = `${kind}:${id}`;
    const existing = seen.get(key);
    // A direct read beats a list mention of the same record.
    if (existing && (fromList || !existing.fromList)) return;
    seen.set(key, { kind, id, name: name ?? existing?.name ?? null, fromList });
  };
  for (const tool of tools) {
    if (tool.status !== "done" || !/app[ _-]?data/iu.test(tool.name)) continue;
    const input = asRecord(tool.input);
    const match = typeof input?.action === "string" ? READ_ACTION.exec(input.action) : null;
    if (!match) continue;
    const kind = match[1] as MariReferencedResourceKind;
    const stdout = stdoutOf(tool.output);
    const parsed = parseOutput(stdout);
    if (match[2] === "get") {
      const record = asRecord(parsed);
      const outputName =
        (record && recordName(record)) ?? stdout.match(/"(?:name|title)"\s*:\s*"((?:[^"\\]|\\.){1,80})"/u)?.[1];
      add(kind, input?.id ?? input?.[`${kind}Id`] ?? record?.id, outputName ?? null, false);
      continue;
    }
    const records = listRecords(parsed);
    if (records.length > 0) {
      for (const record of records) add(kind, record.id, recordName(record), true);
    } else {
      for (const [, id, name] of stdout.matchAll(ID_NAME_PAIR)) add(kind, id, name.replace(/\\(.)/gu, "$1"), true);
    }
  }
  return [...seen.values()];
}

/**
 * The cards worth showing for one reply, in the order her answer brings them up ("Thunder is the
 * coolest" puts Thunder first): what she read directly, plus the list results her answer names. Names
 * she set in bold count first, so a passing mention does not crowd out the ones she is answering with.
 */
export function selectMariReplyReferences(
  resources: readonly MariReferencedResource[],
  replyText: string,
): MariReferencedResource[] {
  const text = replyText.toLocaleLowerCase();
  const bold = [...text.matchAll(/\*\*(.+?)\*\*/gu)].map((match) => match[1].trim());
  const position = (resource: MariReferencedResource) => {
    const name = resource.name?.toLocaleLowerCase();
    if (!name) return -1;
    const boldIndex = bold.indexOf(name);
    return boldIndex >= 0 ? boldIndex : text.includes(name) ? bold.length + text.indexOf(name) : -1;
  };
  return resources
    .map((resource) => ({ resource, at: position(resource) }))
    .filter(({ resource, at }) => at >= 0 || !resource.fromList)
    .sort((a, b) => (a.at < 0 ? Infinity : a.at) - (b.at < 0 ? Infinity : b.at))
    .slice(0, MAX_REFERENCES)
    .map(({ resource }) => resource);
}
