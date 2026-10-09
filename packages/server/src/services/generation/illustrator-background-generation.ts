import { findImageStyleProfile, type ImageStyleProfileSettings } from "@marinara-engine/shared";
import type { DB } from "../../db/connection.js";
import type { ResolvedAgent } from "../agents/agent-pipeline.js";
import {
  buildIllustratorCharacterPromptInstruction,
  resolveNovelAiCharacterPromptLimit,
  supportsNovelAiCharacterPrompts,
} from "../image/character-prompts.js";
import { resolveConnectionImageDefaults } from "../image/image-generation-defaults.js";
import { loadImageGenerationUserSettings } from "../image/image-generation-settings.js";
import { createConnectionsStorage } from "../storage/connections.storage.js";

type ConnectionsStorage = ReturnType<typeof createConnectionsStorage>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveIllustratorImageConnectionId(
  chatMetadata: Record<string, unknown>,
  agentImageConnectionId: unknown,
): string {
  return readTrimmedString(chatMetadata.illustratorImageConnectionId) || readTrimmedString(agentImageConnectionId);
}

/** Resolve the shared Illustrator style precedence used by manual illustrations and scene backgrounds. */
function resolveIllustratorStyleProfile(
  setupConfig: Record<string, unknown>,
  chatMetadata: Record<string, unknown>,
  connectionStyleProfileId: unknown,
  styleProfiles: ImageStyleProfileSettings,
): { styleProfileId: string | null; styleInstruction: string } {
  const styleProfileId =
    readTrimmedString(setupConfig.imageStyleProfileId) ||
    readTrimmedString(chatMetadata.imageStyleProfileId) ||
    readTrimmedString(connectionStyleProfileId) ||
    styleProfiles.defaultProfileId ||
    null;
  return {
    styleProfileId,
    styleInstruction: findImageStyleProfile(styleProfiles, styleProfileId).styleText.trim(),
  };
}

export async function resolveIllustratorPromptStyle(args: {
  db: DB;
  connections?: ConnectionsStorage;
  illustratorAgent: ResolvedAgent;
  chatMode: unknown;
  chatMetadata: Record<string, unknown>;
}): Promise<{ styleProfileId: string | null; styleInstruction: string }> {
  const connections = args.connections ?? createConnectionsStorage(args.db);
  const configuredImageConnectionId = resolveIllustratorImageConnectionId(
    args.chatMetadata,
    args.illustratorAgent.settings.imageConnectionId,
  );
  const imageConnection =
    (configuredImageConnectionId ? await connections.getWithKey(configuredImageConnectionId) : null) ??
    (await connections.getDefaultForImageGeneration());
  const imageDefaults = imageConnection ? resolveConnectionImageDefaults(imageConnection) : null;
  const imageSettings = await loadImageGenerationUserSettings(args.db);
  const setupConfig = isRecord(args.chatMetadata.gameSetupConfig) ? args.chatMetadata.gameSetupConfig : {};
  return resolveIllustratorStyleProfile(
    setupConfig,
    args.chatMetadata,
    imageDefaults?.styleProfileId,
    imageSettings.styleProfiles,
  );
}

/**
 * Resolve the native NovelAI character-caption instruction for the Illustrator's
 * prompt writer. Empty unless the image connection this chat will render with is
 * NovelAI's own host on a V4+ model; the limit follows the model generation.
 */
export async function resolveIllustratorCharacterPromptInstruction(args: {
  connections: Pick<ConnectionsStorage, "getWithKey" | "getDefaultForImageGeneration">;
  illustratorAgent: ResolvedAgent;
  chatMode: unknown;
  chatMetadata: Record<string, unknown>;
}): Promise<{ instruction: string; limit: number }> {
  const configuredImageConnectionId = resolveIllustratorImageConnectionId(
    args.chatMetadata,
    args.illustratorAgent.settings.imageConnectionId,
  );
  const imageConnection =
    (configuredImageConnectionId ? await args.connections.getWithKey(configuredImageConnectionId) : null) ??
    (await args.connections.getDefaultForImageGeneration());
  if (!imageConnection || !supportsNovelAiCharacterPrompts(imageConnection)) return { instruction: "", limit: 0 };
  const limit = resolveNovelAiCharacterPromptLimit(String(imageConnection.model ?? ""));
  return { instruction: buildIllustratorCharacterPromptInstruction(limit), limit };
}
