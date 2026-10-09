import { currentRoomGeneration, roomToolAllowed } from "../multiplayer/generation-policy.js";
// ──────────────────────────────────────────────
// Tool Executor — Handles built-in + custom function calls
// ──────────────────────────────────────────────
import type { LLMToolCall } from "../llm/base-provider.js";
import { Worker } from "node:worker_threads";
import {
  getCustomToolTimeoutMs,
  isCustomToolScriptEnabled,
  isWebhookLocalUrlsEnabled,
} from "../../config/runtime-config.js";
import { safeFetch } from "../../utils/security.js";
import {
  createToolArgumentsAjv,
  createToolArgumentsValidator,
  type ToolArgumentsValidator,
} from "./tool-arguments-validator.js";
import {
  executeCapabilityTool,
  isCapabilityTool,
  validateCapabilityToolArguments,
} from "../capability-packages/capability-tool-registry.service.js";
import { logger } from "../../lib/logger.js";
import {
  appendChatSummaryEntryToMetadata,
  BUILT_IN_TOOLS,
  isJsonRecord,
  isWithinDiceLimits,
  MAX_DICE_COUNT,
  MAX_DICE_SIDES,
  parseDiceNotation,
  rollParsedDice,
} from "@marinara-engine/shared";

type ToolExecutionOutcome =
  { result: unknown; success: true; httpStatus?: never } | { result: unknown; success: false; httpStatus?: number };
export type { ToolArgumentsValidator };

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  result: string;
  success: boolean;
  httpStatus?: number;
}

export function formatToolExecutionResultForModel(
  result: Pick<ToolExecutionResult, "result" | "success" | "httpStatus">,
): string {
  if (result.success) return result.result;

  let response: unknown = result.result;
  try {
    response = JSON.parse(result.result);
  } catch {
    // Preserve non-JSON tool output as text inside the failure envelope.
  }

  const error =
    isJsonRecord(response) && typeof response.error === "string"
      ? response.error
      : result.httpStatus !== undefined
        ? `Tool request failed with HTTP status ${result.httpStatus}`
        : "Tool execution failed";

  return JSON.stringify({
    error,
    success: false,
    ...(result.httpStatus !== undefined ? { httpStatus: result.httpStatus } : {}),
    response,
  });
}

/** A custom tool loaded from DB at execution time. */
export interface CustomToolDef {
  name: string;
  executionType: string;
  webhookUrl: string | null;
  staticResult: string | null;
  scriptBody: string | null;
  includeHiddenContext?: boolean;
  validateArguments: ToolArgumentsValidator;
}

export type CustomToolHiddenContext = Record<string, unknown>;

export function createCustomToolArgumentsValidator(parametersSchema: Record<string, unknown>): ToolArgumentsValidator {
  return createToolArgumentsValidator(parametersSchema);
}

/** Lorebook search function injected from the route layer. */
export type LorebookSearchFn = (
  query: string,
  category?: string | null,
) => Promise<Array<{ name: string; content: string; tag: string; keys: string[] }>>;

/** Lorebook writer function injected from the route layer. */
export type SaveLorebookEntryFn = (entry: {
  name: string;
  content: string;
  description?: string;
  keys: string[];
  tag?: string;
  mode: "create" | "replace" | "append";
}) => Promise<Record<string, unknown>>;

/** Message replacement function injected from the route layer. */
export type ReplaceChatMessageContentFn = (input: {
  messageId: string;
  content: string;
  reason?: string;
}) => Promise<Record<string, unknown>>;

export type MetadataPatch = Record<string, unknown>;
export type MetadataUpdater = (current: MetadataPatch) => MetadataPatch | Promise<MetadataPatch>;
export type MetadataPatchInput = MetadataPatch | MetadataUpdater;

const MAX_APPEND_BYTES = 16 * 1024;
const MAX_LOREBOOK_ENTRY_DESCRIPTION_BYTES = 4 * 1024;
const MAX_LOREBOOK_ENTRY_NAME_LENGTH = 160;
const MAX_LOREBOOK_ENTRY_KEYS = 24;
const MAX_CHAT_VARIABLE_KEY_LENGTH = 128;
const MAX_CHAT_VARIABLE_VALUE_BYTES = 64 * 1024;
const MAX_CHAT_VARIABLES = 256;
const WEB_SEARCH_MAX_QUERY_LENGTH = 400;
const WEB_SEARCH_DEFAULT_LIMIT = 5;
const WEB_SEARCH_MAX_LIMIT = 8;
const WEB_SEARCH_RESPONSE_MAX_BYTES = 512 * 1024;
const builtInToolArgumentsAjv = createToolArgumentsAjv();
const BUILT_IN_TOOL_VALIDATORS = new Map(
  BUILT_IN_TOOLS.map((tool) => [
    tool.name,
    createToolArgumentsValidator(tool.parameters as unknown as Record<string, unknown>, builtInToolArgumentsAjv),
  ]),
);

export interface ToolExecutionContext {
  /** The chat this call belongs to, so a package tool knows which world it is answering about. */
  chatId?: string;
  /** Apply the active chat's character attributes before the shared dice service rolls. */
  prepareDiceRoll?: (args: Record<string, unknown>) => Record<string, unknown>;
  gameState?: Record<string, unknown>;
  /** Returns a stored patch, or an explicit pending patch until the turn is saved. */
  applyGameStateUpdate?: (update: { type: string; value: string }) => Promise<Record<string, unknown>>;
  chatMeta?: Record<string, unknown>;
  hiddenContext?: CustomToolHiddenContext;
  /** The character whose turn invoked the tool (Conversation mode; used by update_about_me). */
  callingCharacterId?: string | null;
  onUpdateMetadata?: (patch: MetadataPatchInput) => Promise<MetadataPatch>;
  customTools?: CustomToolDef[];
  searchLorebook?: LorebookSearchFn;
  saveLorebookEntry?: SaveLorebookEntryFn;
  replaceChatMessageContent?: ReplaceChatMessageContentFn;
}

/**
 * Execute a batch of tool calls, returning results for each.
 * Supports built-in tools and user-defined custom tools.
 */
export async function executeToolCalls(
  toolCalls: LLMToolCall[],
  context?: ToolExecutionContext,
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const call of toolCalls) {
    try {
      const room = currentRoomGeneration();
      if (!roomToolAllowed(call.function.name) || (room && context?.chatId !== room.chatId)) {
        throw new Error(`Tool not available in this shared room: ${call.function.name}`);
      }
      let parsedArguments: unknown;
      try {
        parsedArguments = JSON.parse(call.function.arguments);
      } catch {
        throw new Error(`Invalid arguments for ${call.function.name}: expected valid JSON`);
      }

      if (!isJsonRecord(parsedArguments)) {
        throw new Error(`Invalid arguments for ${call.function.name}: expected a JSON object`);
      }

      const builtInValidator = BUILT_IN_TOOL_VALIDATORS.get(call.function.name);
      let outcome: ToolExecutionOutcome;
      if (builtInValidator) {
        const validationError = builtInValidator(parsedArguments);
        if (validationError) {
          throw new Error(`Invalid arguments for ${call.function.name}: ${validationError}`);
        }
        outcome = classifyToolExecution(await executeBuiltInTool(call.function.name, parsedArguments, context));
      } else {
        // Built-in, then custom, then package — the same order tool resolution uses when it decides
        // which definition the model is shown. A package must lose a name a custom tool already
        // owns, or the model would be offered the custom tool's schema while the package's handler
        // quietly ran the call.
        const customTool = context?.customTools?.find((tool) => tool.name === call.function.name);
        if (customTool) {
          const validationError = customTool.validateArguments(parsedArguments);
          if (validationError) {
            throw new Error(`Invalid arguments for ${call.function.name}: ${validationError}`);
          }
          outcome = await executeCustomTool(customTool, parsedArguments, context);
        } else if (isCapabilityTool(call.function.name)) {
          // Validated with the same Ajv the built-ins use, so a model that invents an enum member
          // is told which ones exist and can correct itself next round.
          const validationError = validateCapabilityToolArguments(call.function.name, parsedArguments);
          if (validationError) {
            throw new Error(`Invalid arguments for ${call.function.name}: ${validationError}`);
          }
          outcome = classifyToolExecution(
            await executeCapabilityTool(call.function.name, parsedArguments, context?.chatId ?? ""),
          );
        } else {
          outcome = {
            result: {
              error: `Unknown tool: ${call.function.name}`,
              available: [...BUILT_IN_TOOL_VALIDATORS.keys()],
            },
            success: false,
          };
        }
      }
      results.push({
        toolCallId: call.id,
        name: call.function.name,
        result: typeof outcome.result === "string" ? outcome.result : JSON.stringify(outcome.result),
        success: outcome.success,
        ...(outcome.httpStatus !== undefined ? { httpStatus: outcome.httpStatus } : {}),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool execution failed";
      results.push({
        toolCallId: call.id,
        name: call.function.name,
        result: JSON.stringify({ error: message }),
        success: false,
      });
    }
  }

  return results;
}

export async function executeToolCallForModel(toolCall: LLMToolCall, context?: ToolExecutionContext): Promise<string> {
  const [result] = await executeToolCalls([toolCall], context);
  return result ? formatToolExecutionResultForModel(result) : "Tool execution failed";
}

function classifyToolExecution(result: unknown): ToolExecutionOutcome {
  const failed = isJsonRecord(result) && typeof result.error === "string";
  return failed ? { result, success: false } : { result, success: true };
}

async function executeBuiltInTool(
  name: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<unknown> {
  switch (name) {
    case "roll_dice":
      return rollDice(context?.prepareDiceRoll ? context.prepareDiceRoll(args) : args);
    case "update_game_state":
      return updateGameState(args, context?.applyGameStateUpdate);
    case "set_expression":
      return setExpression(args);
    case "trigger_event":
      return triggerEvent(args);
    case "search_lorebook":
      return searchLorebook(args, context?.searchLorebook);
    case "web_search":
      return webSearch(args);
    case "save_lorebook_entry":
      return saveLorebookEntry(args, context?.saveLorebookEntry);
    case "edit_chat_message":
      return editChatMessage(args, context?.replaceChatMessageContent);
    case "read_chat_summary":
      return readChatSummary(context?.chatMeta);
    case "append_chat_summary":
      return appendChatSummary(args, context);
    case "read_chat_variable":
      return readChatVariable(args, context?.chatMeta);
    case "write_chat_variable":
      return writeChatVariable(args, context);
    case "update_about_me":
      return updateAboutMe(args, context);
    default: {
      return {
        error: `Unknown tool: ${name}`,
        available: [...BUILT_IN_TOOL_VALIDATORS.keys()],
      };
    }
  }
}

// ── Custom Tool Execution ──

function getCustomToolHiddenContext(
  tool: CustomToolDef,
  context?: ToolExecutionContext,
): CustomToolHiddenContext | undefined {
  if (tool.includeHiddenContext !== true) return undefined;
  return context?.hiddenContext ?? {};
}

function executeCustomToolScript(
  scriptBody: string,
  args: Record<string, unknown>,
  hiddenContext: CustomToolHiddenContext | undefined,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const workerUrl = new URL(
      import.meta.url.endsWith(".ts") ? "./custom-tool-script.worker.ts" : "./custom-tool-script.worker.js",
      import.meta.url,
    );
    const worker = new Worker(workerUrl, {
      workerData: {
        scriptBody,
        argsJson: JSON.stringify(args ?? {}),
        contextJson: JSON.stringify(hiddenContext ?? null),
        timeoutMs,
      },
      resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8, stackSizeMb: 2 },
    });
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      callback();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error(`Script exceeded ${timeoutMs}ms timeout`))),
      timeoutMs,
    );
    worker.once("message", (message: unknown) => {
      finish(() => {
        if (isJsonRecord(message) && message.ok === true) resolve(message.value);
        else
          reject(
            new Error(isJsonRecord(message) && typeof message.error === "string" ? message.error : "Script failed"),
          );
      });
    });
    worker.once("error", (error) => finish(() => reject(error)));
    worker.once("exit", (code) => {
      if (code !== 0) finish(() => reject(new Error(`Script worker exited with code ${code}`)));
    });
  });
}

async function executeCustomTool(
  tool: CustomToolDef,
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<ToolExecutionOutcome> {
  logger.info("[custom-tools] Executing %s custom tool %s", tool.executionType, tool.name);
  const customToolTimeoutMs = getCustomToolTimeoutMs();
  const hiddenContext = getCustomToolHiddenContext(tool, context);
  switch (tool.executionType) {
    case "static":
      return classifyToolExecution({ result: tool.staticResult ?? "OK", tool: tool.name, args });

    case "webhook": {
      if (!tool.webhookUrl) return { result: { error: "No webhook URL configured" }, success: false };
      try {
        const allowLocal = isWebhookLocalUrlsEnabled();
        const res = await safeFetch(tool.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: tool.name,
            arguments: args,
            ...(hiddenContext !== undefined ? { context: hiddenContext } : {}),
          }),
          signal: AbortSignal.timeout(customToolTimeoutMs),
          policy: {
            allowLocal,
            allowedProtocols: allowLocal ? ["https:", "http:"] : ["https:"],
            flagName: "WEBHOOK_LOCAL_URLS_ENABLED",
          },
          maxResponseBytes: 512 * 1024,
        });
        const text = await res.text();
        let response: unknown;
        try {
          response = JSON.parse(text);
        } catch {
          response = { result: text };
        }
        const outcome = classifyToolExecution(response);
        return res.ok ? outcome : { result: outcome.result, success: false, httpStatus: res.status };
      } catch (err) {
        return {
          result: { error: `Webhook call failed: ${err instanceof Error ? err.message : "unknown"}` },
          success: false,
        };
      }
    }

    case "script": {
      if (!isCustomToolScriptEnabled()) {
        return {
          result: {
            error:
              "Script custom tools are disabled. Set CUSTOM_TOOL_SCRIPT_ENABLED=true to enable trusted isolated script tools.",
          },
          success: false,
        };
      }
      if (!tool.scriptBody) return { result: { error: "No script body configured" }, success: false };
      try {
        const result = await executeCustomToolScript(tool.scriptBody, args, hiddenContext, customToolTimeoutMs);
        return classifyToolExecution(result ?? { result: "OK" });
      } catch (err) {
        return {
          result: { error: `Script error: ${err instanceof Error ? err.message : "unknown"}` },
          success: false,
        };
      }
    }

    default:
      return { result: { error: `Unknown execution type: ${tool.executionType}` }, success: false };
  }
}

// ── Built-in Tool Implementations ──

function rollDice(args: Record<string, unknown>): Record<string, unknown> {
  const notation = String(args.notation ?? "1d6");
  const reason = String(args.reason ?? "");

  let parsed = parseDiceNotation(notation);
  if (!parsed) {
    return { error: `Invalid dice notation: ${notation}`, hint: "Use format like 2d6, d20+5, 3d8-2" };
  }

  // Arguments were schema-validated before Roleplay added the assigned attribute bonus.
  const situationalModifier = args.modifier as number | undefined;
  const dc = args.dc as number | undefined;
  if (situationalModifier) {
    const combined = parsed.modifier + situationalModifier;
    parsed = parseDiceNotation(`${parsed.dice}${combined > 0 ? "+" : ""}${combined || ""}`);
    if (!parsed) return { error: "The adjusted roll exceeds the supported numeric range." };
  }

  // Refuse rather than clamp. A result that quietly rolled 100 dice for a model
  // that asked for 500 is a lie the model has no way to notice.
  if (!isWithinDiceLimits(parsed) || parsed.sides < 2) {
    return { error: `Dice values out of range (1-${MAX_DICE_COUNT} dice, 2-${MAX_DICE_SIDES} sides)` };
  }

  const { rolls, modifier, total } = rollParsedDice(parsed);
  // Sum the dice directly rather than re-deriving it as total - modifier. The
  // two agree now that the grammar refuses any notation whose range of totals
  // could leave the exact integers, so this is not a workaround for drift — it
  // is what the field means, and it keeps meaning it without leaning on that
  // guarantee holding forever.
  const sum = rolls.reduce((a, b) => a + b, 0);

  return {
    notation: parsed.notation,
    rolls,
    sum,
    modifier,
    total,
    reason,
    ...(dc !== undefined ? { dc, success: total >= dc } : {}),
    display: `🎲 ${parsed.notation}${reason ? ` (${reason})` : ""}: [${rolls.join(", ")}]${modifier ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""} = **${total}**${dc !== undefined ? ` (DC ${dc})` : ""}`,
  };
}

// The only two update types the generation route writes back to the game state.
// Everything else this tool used to accept was answered with `applied: true` and
// then silently dropped. The manifest enum is what the model is actually held to —
// argument validation rejects a dead type before the executor runs — so the guard
// below is defence in depth for any caller that reaches it without that schema.
export const PERSISTED_GAME_STATE_UPDATE_TYPES = ["location_change", "time_advance"] as const;

async function updateGameState(
  args: Record<string, unknown>,
  applyUpdate?: ToolExecutionContext["applyGameStateUpdate"],
): Promise<Record<string, unknown>> {
  const type = String(args.type ?? "");
  if (!(PERSISTED_GAME_STATE_UPDATE_TYPES as readonly string[]).includes(type)) {
    return {
      error: `update_game_state cannot apply "${type}".`,
      hint: "Only location_change and time_advance are stored. Describe stat, inventory and quest changes in the narration instead.",
      supportedTypes: [...PERSISTED_GAME_STATE_UPDATE_TYPES],
    };
  }

  const value = typeof args.value === "string" ? args.value.trim() : "";
  if (!value) throw new Error("A non-empty location or time value is required.");
  if (!applyUpdate) throw new Error("Game-state writes are not available in this context.");
  const stored = await applyUpdate({ type, value });
  const field = type === "location_change" ? "location" : "time";
  if (stored[field] !== value) throw new Error("The requested game-state value was not stored.");
  return {
    applied: stored.pending !== true,
    ...(stored.pending === true
      ? { pending: true, note: "Queued for this turn. The change is not applied until this response is saved." }
      : {}),
    update: {
      type: args.type,
      value,
      description: args.description ?? "",
    },
    display: `📊 ${type} → ${value}`,
  };
}

function setExpression(args: Record<string, unknown>): Record<string, unknown> {
  return {
    applied: true,
    characterName: args.characterName,
    expression: args.expression,
    display: `🎭 ${args.characterName}: expression → ${args.expression}`,
  };
}

function readChatSummary(chatMeta?: Record<string, unknown>): Record<string, unknown> {
  const summary = typeof chatMeta?.summary === "string" ? chatMeta.summary : "";
  return { summary };
}

function normalizeChatVariableKey(args: Record<string, unknown>): { key: string } | { error: string } {
  if (typeof args.key !== "string") {
    return { error: "chat variable key must be a non-empty string" };
  }
  const key = args.key.trim();
  if (!key) {
    return { error: "chat variable key must be a non-empty string" };
  }
  if (key.length > MAX_CHAT_VARIABLE_KEY_LENGTH) {
    return { error: `chat variable key must be ${MAX_CHAT_VARIABLE_KEY_LENGTH} characters or fewer` };
  }
  return { key };
}

function normalizeAgentVariables(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const variables: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!key || typeof rawValue !== "string") continue;
    variables[key] = rawValue;
  }
  return variables;
}

function readChatVariable(args: Record<string, unknown>, chatMeta?: Record<string, unknown>): Record<string, unknown> {
  const keyResult = normalizeChatVariableKey(args);
  if ("error" in keyResult) return { error: keyResult.error };
  const variables = normalizeAgentVariables(chatMeta?.agentVariables);
  const exists = Object.prototype.hasOwnProperty.call(variables, keyResult.key);
  return { key: keyResult.key, value: variables[keyResult.key] ?? "", exists };
}

function sanitizePersistedSummaryText(text: string): string {
  return text
    .replace(/&(amp|lt|gt);/g, (_match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        default:
          return _match;
      }
    })
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function trimToUtf8Bytes(text: string, maxBytes: number, fromStart = false): string {
  if (maxBytes <= 0) return "";
  if (utf8ByteLength(text) <= maxBytes) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = fromStart ? text.slice(text.length - mid) : text.slice(0, mid);
    if (utf8ByteLength(candidate) <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const trimmed = fromStart ? text.slice(text.length - low) : text.slice(0, low);
  return fromStart ? trimmed.replace(/^[\uDC00-\uDFFF]/, "") : trimmed.replace(/[\uD800-\uDBFF]$/, "");
}

async function appendChatSummary(
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<Record<string, unknown>> {
  if (typeof args.text !== "string") {
    return { error: "append_chat_summary requires non-empty text" };
  }
  const text = args.text.trim();
  if (!text) {
    return { error: "append_chat_summary requires non-empty text" };
  }
  const sanitizedText = trimToUtf8Bytes(sanitizePersistedSummaryText(text), MAX_APPEND_BYTES).trim();
  if (!sanitizedText) {
    return { error: "append_chat_summary exceeds per-append size limit" };
  }
  if (!context?.onUpdateMetadata) {
    return { error: "Chat metadata updates are not available in this context" };
  }

  const updated = await context.onUpdateMetadata((currentMeta) => {
    const existingSummary =
      typeof currentMeta.summary === "string" ? sanitizePersistedSummaryText(currentMeta.summary.trim()) : null;
    const result = appendChatSummaryEntryToMetadata(
      { ...currentMeta, summary: existingSummary },
      {
        kind: "rolling",
        origin: "automated",
        sourceMode: "agent",
        content: sanitizedText,
        enabled: true,
      },
    );
    return { summary: result.summary, summaryEntries: result.entries };
  });
  return { summary: typeof updated.summary === "string" ? updated.summary : sanitizedText };
}

async function writeChatVariable(
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<Record<string, unknown>> {
  const keyResult = normalizeChatVariableKey(args);
  if ("error" in keyResult) return { error: keyResult.error };
  if (typeof args.value !== "string") {
    return { error: "write_chat_variable requires a string value" };
  }
  if (!context?.onUpdateMetadata) {
    return { error: "Chat metadata updates are not available in this context" };
  }

  const value = trimToUtf8Bytes(args.value, MAX_CHAT_VARIABLE_VALUE_BYTES);
  let existed = false;
  let limitReached = false;
  const updated = await context.onUpdateMetadata((currentMeta) => {
    const variables = normalizeAgentVariables(currentMeta.agentVariables);
    existed = Object.prototype.hasOwnProperty.call(variables, keyResult.key);
    if (!existed && Object.keys(variables).length >= MAX_CHAT_VARIABLES) {
      limitReached = true;
      return {};
    }
    return { agentVariables: { ...variables, [keyResult.key]: value } };
  });
  if (limitReached) {
    return { error: `chat variable limit reached (${MAX_CHAT_VARIABLES})` };
  }
  const variables = normalizeAgentVariables(updated.agentVariables);
  return {
    key: keyResult.key,
    value: variables[keyResult.key] ?? value,
    replaced: existed,
    truncated: value !== args.value,
    bytes: utf8ByteLength(value),
  };
}

async function updateAboutMe(
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<Record<string, unknown>> {
  const scope = args.scope === "public" ? "public" : args.scope === "chat" ? "chat" : null;
  if (!scope) return { error: 'update_about_me requires scope "public" or "chat"' };
  if (typeof args.content !== "string") return { error: "update_about_me requires a string content" };
  const characterId = context?.callingCharacterId;
  if (!characterId) return { error: "update_about_me could not resolve the calling character" };
  const content = args.content;

  if (scope === "chat") {
    if (!context?.onUpdateMetadata) {
      return { error: "Chat metadata updates are not available in this context" };
    }
    await context.onUpdateMetadata((currentMeta) => {
      const overrides = {
        ...((currentMeta.conversationAboutMeOverrides as Record<string, string> | undefined) ?? {}),
      };
      if (content.trim()) overrides[characterId] = content;
      else delete overrides[characterId];
      return { conversationAboutMeOverrides: overrides };
    });
    return { scope: "chat", applied: true, characterId };
  }

  // Public edits are proposed for user approval — the route detects this result
  // and emits a character_card_update event (it can compute the exact oldText).
  return { scope: "public", proposedCardUpdate: { characterId, newText: content }, applied: false };
}

function triggerEvent(args: Record<string, unknown>): Record<string, unknown> {
  return {
    applied: true,
    eventType: args.eventType,
    description: args.description,
    involvedCharacters: args.involvedCharacters ?? [],
    display: `⚡ Event (${args.eventType}): ${args.description}`,
  };
}

async function searchLorebook(
  args: Record<string, unknown>,
  searchFn?: LorebookSearchFn,
): Promise<Record<string, unknown>> {
  const query = String(args.query ?? "");
  const category = args.category ? String(args.category) : null;

  if (!searchFn) {
    return {
      query,
      category,
      results: [],
      note: "Lorebook search is not available in this context.",
    };
  }

  const results = await searchFn(query, category);
  return {
    query,
    category,
    results,
    count: results.length,
  };
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      return String.fromCodePoint(codePoint);
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function textFromHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function resolveDuckDuckGoResultUrl(href: string): string | null {
  try {
    const absolute = href.startsWith("//") ? `https:${href}` : new URL(href, "https://duckduckgo.com").toString();
    const parsed = new URL(decodeHtmlEntities(absolute));
    const redirectTarget =
      parsed.hostname.endsWith("duckduckgo.com") && parsed.pathname === "/l/" ? parsed.searchParams.get("uddg") : null;
    const resolved = redirectTarget ? new URL(redirectTarget) : parsed;
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function parseDuckDuckGoLiteResults(html: string, limit: number) {
  const matches = [...html.matchAll(/<a\b(?=[^>]*class=(["'])result-link\1)([^>]*)>([\s\S]*?)<\/a>/gi)];
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const seenUrls = new Set<string>();

  for (let index = 0; index < matches.length && results.length < limit; index += 1) {
    const match = matches[index]!;
    const attrs = match[2] ?? "";
    const hrefMatch = attrs.match(/\bhref=(["'])(.*?)\1/i);
    const url = hrefMatch ? resolveDuckDuckGoResultUrl(hrefMatch[2] ?? "") : null;
    if (!url || seenUrls.has(url)) continue;
    const title = textFromHtml(match[3] ?? "");
    if (!title) continue;

    const nextIndex = matches[index + 1]?.index ?? html.length;
    const chunk = html.slice((match.index ?? 0) + match[0].length, nextIndex);
    const snippetMatch = chunk.match(/<td\b[^>]*class=(["'])result-snippet\1[^>]*>([\s\S]*?)<\/td>/i);
    const snippet = snippetMatch ? textFromHtml(snippetMatch[2] ?? "") : "";
    seenUrls.add(url);
    results.push({ title, url, snippet });
  }

  return results;
}

async function webSearch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const rawQuery = typeof args.query === "string" ? args.query.trim() : "";
  if (!rawQuery) return { error: "web_search requires a non-empty query", results: [] };
  const query = rawQuery.slice(0, WEB_SEARCH_MAX_QUERY_LENGTH);
  const limit = clampInteger(args.limit, WEB_SEARCH_DEFAULT_LIMIT, 1, WEB_SEARCH_MAX_LIMIT);
  const url = new URL("https://lite.duckduckgo.com/lite/");
  url.searchParams.set("q", query);

  try {
    const res = await safeFetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Marinara Engine web_search tool",
      },
      signal: AbortSignal.timeout(10_000),
      policy: { allowedProtocols: ["https:"], maxRedirects: 2 },
      allowedContentTypes: ["text/html", "application/xhtml+xml"],
      maxResponseBytes: WEB_SEARCH_RESPONSE_MAX_BYTES,
    });
    if (!res.ok) {
      return { query, results: [], count: 0, error: `Web search failed (${res.status})` };
    }
    const html = await res.text();
    const results = parseDuckDuckGoLiteResults(html, limit);
    return {
      query,
      source: "DuckDuckGo Lite",
      results,
      count: results.length,
      ...(results.length === 0 ? { note: "No web results were found." } : {}),
    };
  } catch (err) {
    return {
      query,
      results: [],
      count: 0,
      error: err instanceof Error ? err.message : "Web search failed.",
    };
  }
}

function normalizeLorebookEntryKeys(value: unknown, fallbackName: string): string[] {
  const raw = Array.isArray(value) ? value : [];
  const keys = Array.from(
    new Set(raw.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter((entry) => entry.length > 0)),
  ).slice(0, MAX_LOREBOOK_ENTRY_KEYS);
  if (keys.length > 0) return keys;
  return fallbackName ? [fallbackName] : [];
}

function normalizeLorebookWriteMode(value: unknown): "create" | "replace" | "append" | "invalid" {
  if (value === undefined || value === null || value === "") return "replace";
  return value === "create" || value === "append" || value === "replace" ? value : "invalid";
}

async function saveLorebookEntry(
  args: Record<string, unknown>,
  saveFn?: SaveLorebookEntryFn,
): Promise<Record<string, unknown>> {
  if (!saveFn) {
    return { error: "Lorebook writing is not available in this context." };
  }
  if (typeof args.name !== "string" || !args.name.trim()) {
    return { error: "save_lorebook_entry requires a non-empty name" };
  }
  if (typeof args.content !== "string" || !args.content.trim()) {
    return { error: "save_lorebook_entry requires non-empty content" };
  }

  const name = args.name.trim().slice(0, MAX_LOREBOOK_ENTRY_NAME_LENGTH);
  const content = args.content.trim();
  const description =
    typeof args.description === "string" && args.description.trim()
      ? trimToUtf8Bytes(args.description.trim(), MAX_LOREBOOK_ENTRY_DESCRIPTION_BYTES)
      : undefined;
  const tag = typeof args.tag === "string" && args.tag.trim() ? args.tag.trim().slice(0, 80) : undefined;
  const mode = normalizeLorebookWriteMode(args.mode);
  if (mode === "invalid") {
    return { error: "save_lorebook_entry mode must be one of create|replace|append" };
  }

  return saveFn({
    name,
    content,
    description,
    keys: normalizeLorebookEntryKeys(args.keys, name),
    tag,
    mode,
  });
}

async function editChatMessage(
  args: Record<string, unknown>,
  replaceFn?: ReplaceChatMessageContentFn,
): Promise<Record<string, unknown>> {
  if (!replaceFn) {
    return { error: "Message editing is not available in this context." };
  }
  if (typeof args.messageId !== "string" || !args.messageId.trim()) {
    return { error: "edit_chat_message requires a non-empty messageId" };
  }
  if (typeof args.content !== "string" || !args.content.trim()) {
    return { error: "edit_chat_message requires non-empty content" };
  }

  return replaceFn({
    messageId: args.messageId.trim(),
    content: args.content.trim(),
    reason: typeof args.reason === "string" ? args.reason.trim().slice(0, 240) : undefined,
  });
}
