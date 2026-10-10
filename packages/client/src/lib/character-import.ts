import { api } from "./api-client";
import type { CharacterData } from "@marinara-engine/shared";

// The server takes a native .marinara.json as a JSON request up to 256 MiB (IMPORT_BODY_LIMIT_BYTES), less
// headroom for the fields sent with it. A bigger export, such as a character with a large gallery, is
// uploaded as a file instead; the server reads it in pieces.
const NATIVE_JSON_REQUEST_MAX_BYTES = 255 * 1024 * 1024;

/**
 * A JSON object too large to send as a JSON request. Only a Marinara export gets that big, and its "type" field may not
 * come first if another tool re-saved it, so any object goes to the upload route, which rejects a non-Marinara file.
 */
export async function isOversizedMarinaraJson(file: File): Promise<boolean> {
  if (file.size <= NATIVE_JSON_REQUEST_MAX_BYTES) return false;
  return /^\uFEFF?\s*\{/.test(await file.slice(0, 256).text());
}

export interface EmbeddedLorebookImportPreview {
  filename: string;
  success: boolean;
  name?: string;
  hasEmbeddedLorebook: boolean;
  embeddedLorebookEntries: number;
  error?: string;
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readCharacterCardData(raw: Record<string, unknown>): Record<string, unknown> {
  if (
    (raw.spec === "chara_card_v2" || raw.spec === "chara_card_v3") &&
    raw.data &&
    typeof raw.data === "object" &&
    !Array.isArray(raw.data)
  ) {
    return raw.data as Record<string, unknown>;
  }
  return raw;
}

const CHARACTER_CARD_STRING_FIELDS = [
  "description",
  "personality",
  "scenario",
  "first_mes",
  "mes_example",
  "creator_notes",
  "system_prompt",
  "post_history_instructions",
  "creator",
  "character_version",
] as const;

const LEGACY_CHARACTER_CARD_FIELDS: Partial<Record<(typeof CHARACTER_CARD_STRING_FIELDS)[number], readonly string[]>> =
  {
    description: ["char_persona"],
    scenario: ["world_scenario"],
    first_mes: ["char_greeting"],
    mes_example: ["example_dialogue"],
  } as const;

function firstPresentValue(source: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (Object.hasOwn(source, key)) return source[key];
  }
  return undefined;
}

/** Merge only fields explicitly carried by a replacement character-card image. */
export function mergeEmbeddedCharacterCardFields(
  current: CharacterData,
  raw: Record<string, unknown>,
): CharacterData | null {
  const data = readCharacterCardData(raw);
  const next: CharacterData = { ...current, extensions: { ...current.extensions } };
  let foundField = false;

  const name = firstPresentValue(data, ["name", "char_name"]);
  if (typeof name === "string" && name.trim()) {
    next.name = name;
    foundField = true;
  }

  for (const field of CHARACTER_CARD_STRING_FIELDS) {
    const value = firstPresentValue(data, [field, ...(LEGACY_CHARACTER_CARD_FIELDS[field] ?? [])]);
    if (typeof value !== "string") continue;
    next[field] = value;
    foundField = true;
  }

  if (Object.hasOwn(data, "tags") && Array.isArray(data.tags)) {
    next.tags = data.tags.filter((tag): tag is string => typeof tag === "string");
    foundField = true;
  }
  if (Object.hasOwn(data, "alternate_greetings") && Array.isArray(data.alternate_greetings)) {
    next.alternate_greetings = data.alternate_greetings.filter(
      (greeting): greeting is string => typeof greeting === "string",
    );
    foundField = true;
  }

  const extensions = optionalRecord(data.extensions);
  for (const field of ["backstory", "appearance", "world"] as const) {
    if (!Object.hasOwn(extensions ?? {}, field) || typeof extensions?.[field] !== "string") continue;
    next.extensions[field] = extensions[field];
    foundField = true;
  }
  const depthPrompt = optionalRecord(extensions?.depth_prompt);
  if (Object.hasOwn(extensions ?? {}, "depth_prompt") && depthPrompt) {
    next.extensions.depth_prompt = {
      ...current.extensions.depth_prompt,
      ...depthPrompt,
    } as CharacterData["extensions"]["depth_prompt"];
    foundField = true;
  }

  return foundField ? next : null;
}

export async function inspectCharacterFilesForEmbeddedLorebooks(
  files: File[],
): Promise<EmbeddedLorebookImportPreview[]> {
  if (files.length === 0) return [];

  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const result = await api.upload<{
    success: boolean;
    results: EmbeddedLorebookImportPreview[];
  }>("/import/st-character/inspect", form);

  return result.results.filter((item) => item.success && item.hasEmbeddedLorebook);
}
