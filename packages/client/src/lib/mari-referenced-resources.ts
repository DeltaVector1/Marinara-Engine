import type { ProfessorMariNavigationTarget } from "./professor-mari-navigation";
import type { OmnibarSettingsDestination } from "./omnibar-settings";

// What Professor Mari looked at during a run, so her reply can show it as cards (a character's avatar
// and name, a lorebook, an agent and whether it is on, a chat, a lorebook entry, a setting) instead of
// leaving you with "Reading character" steps only.

export type MariReferencedResourceKind =
  "character" | "lorebook" | "persona" | "agent" | "chat" | "lorebookEntry" | "setting";

export interface MariReferencedResource {
  kind: MariReferencedResourceKind;
  /** An agent's type (its editor opens by type), an entry's id, a setting's destination id. */
  id: string;
  /** From the tool output when the client has no preview of the record yet. */
  name: string | null;
  /** Came from a list or search, not a direct read: show it only if her answer names it. */
  fromList: boolean;
  /** An entry's lorebook, so the card opens the lorebook at that entry. */
  parentId?: string;
  /** An agent as she read it: on, off, or its last run failed. */
  state?: "on" | "off" | "failed";
  /** One line about it from the tool output (an agent's or entry's description). */
  detail?: string;
}

interface MariToolCallLike {
  name: string;
  status: string;
  input?: unknown;
  output: string | null;
}

const READ_ACTION = /^(character|lorebook|persona|agent|chat)\.(get|list|search|runs|entries|getEntry)$/u;
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

function recordDetail(record: Record<string, unknown>): string | undefined {
  const text = record.description;
  return typeof text === "string" && text.trim() ? text.trim() : undefined;
}

/** `enabled` is a boolean in merged agent rows and "true"/"false" in raw config rows. */
function agentState(record: Record<string, unknown>): MariReferencedResource["state"] {
  if (record.enabled === undefined) return undefined;
  return record.enabled === true || record.enabled === "true" ? "on" : "off";
}

export function collectMariReferencedResources(tools: readonly MariToolCallLike[]): MariReferencedResource[] {
  const seen = new Map<string, MariReferencedResource>();
  const add = (
    kind: MariReferencedResourceKind,
    id: unknown,
    name: string | null,
    fromList: boolean,
    extra: Pick<MariReferencedResource, "parentId" | "state" | "detail"> = {},
  ) => {
    if (typeof id !== "string" || !id.trim()) return;
    const key = `${kind}:${id}`;
    const existing = seen.get(key);
    seen.set(key, {
      kind,
      id,
      // A direct read's name beats a list's.
      name: (fromList ? (existing?.name ?? name) : (name ?? existing?.name)) ?? null,
      fromList: fromList && (existing?.fromList ?? true),
      parentId: extra.parentId ?? existing?.parentId,
      detail: extra.detail ?? existing?.detail,
      // A failed run is the news about an agent, whatever an earlier read said about it.
      state: existing?.state === "failed" ? "failed" : (extra.state ?? existing?.state),
    });
  };
  for (const tool of tools) {
    if (tool.status !== "done" || !/app[ _-]?data/iu.test(tool.name)) continue;
    const input = asRecord(tool.input);
    const match = typeof input?.action === "string" ? READ_ACTION.exec(input.action) : null;
    if (!match) continue;
    const resource = match[1]!;
    const verb = match[2]!;
    const stdout = stdoutOf(tool.output);
    const parsed = parseOutput(stdout);
    if (resource === "agent") {
      // Built-in agents open by type, and so do custom ones (the editor matches either).
      if (verb === "runs") {
        const runs = listRecords(parsed);
        add("agent", input?.type ?? input?.agentType, null, false, {
          state: runs[0]?.success === false ? "failed" : undefined,
        });
      } else if (verb === "get") {
        const record = asRecord(parsed);
        add("agent", record?.type ?? input?.type ?? input?.agentType, record ? recordName(record) : null, false, {
          state: record ? agentState(record) : undefined,
          detail: record ? recordDetail(record) : undefined,
        });
      } else {
        for (const record of listRecords(parsed)) {
          add("agent", record.type, recordName(record), true, {
            state: agentState(record),
            detail: recordDetail(record),
          });
        }
      }
      continue;
    }
    if (resource === "lorebook" && (verb === "entries" || verb === "getEntry")) {
      const records = verb === "entries" ? listRecords(parsed) : [asRecord(parsed)].filter((r) => r !== null);
      for (const record of records) {
        const parentId = record.lorebookId ?? input?.lorebookId ?? input?.id;
        add("lorebookEntry", record.id ?? input?.entryId, recordName(record), verb === "entries", {
          parentId: typeof parentId === "string" ? parentId : undefined,
          detail: recordDetail(record),
        });
      }
      continue;
    }
    if (verb === "runs" || verb === "entries" || verb === "getEntry") continue;
    const kind = resource as MariReferencedResourceKind;
    if (verb === "get") {
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
 * Settings she names in bold, by their exact label ("turn on **Hide chat Help button**"), as cards that
 * open that setting. Only bold names count, so a passing word such as "language" never becomes a card.
 */
export function findMariSettingReferences(
  replyText: string,
  settings: readonly { id: string; title: string }[],
): MariReferencedResource[] {
  const byLabel = new Map(settings.map((setting) => [setting.title.toLocaleLowerCase(), setting]));
  const found = new Map<string, MariReferencedResource>();
  for (const [, bold] of replyText.matchAll(/\*\*(.+?)\*\*/gu)) {
    const setting = byLabel.get(bold!.trim().toLocaleLowerCase());
    if (setting && !found.has(setting.id)) {
      found.set(setting.id, { kind: "setting", id: setting.id, name: setting.title, fromList: true });
    }
  }
  return [...found.values()];
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

/** Where a card goes when you open it; null when it cannot go anywhere (an entry without its lorebook). */
export function mariReferenceTarget(
  resource: MariReferencedResource,
  settings: readonly OmnibarSettingsDestination[],
): ProfessorMariNavigationTarget | null {
  switch (resource.kind) {
    case "chat":
      return { kind: "chat", chatId: resource.id };
    case "lorebookEntry":
      return resource.parentId
        ? { kind: "resource", resource: "lorebook", id: resource.parentId, entryId: resource.id }
        : null;
    case "setting": {
      const setting = settings.find((candidate) => candidate.id === resource.id);
      return setting
        ? { kind: "settings", tab: setting.tab, controlId: setting.controlId, sectionId: setting.sectionId }
        : null;
    }
    default:
      return { kind: "resource", resource: resource.kind, id: resource.id };
  }
}
