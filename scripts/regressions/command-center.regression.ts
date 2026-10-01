import assert from "node:assert/strict";
import {
  COMMAND_CENTER_MAX_RESULTS,
  isOmnibarShortcut,
  normalizeCommandCenterSessionState,
  normalizeCommandRankingState,
  presentCommandCenterResults,
  rankCommandResults,
  readCommandRankingState,
  recordCommandUse,
  setCommandPinned,
  writeCommandRankingState,
  type CommandDefinition,
  type CommandCenterPresentableResult,
} from "../../packages/client/src/lib/command-center.js";
import { createSystemCommandDefinitions } from "../../packages/client/src/lib/command-center-system-commands.js";
import {
  formatShortcutKey,
  isShortcutsHelpKey,
  isTypingTarget,
} from "../../packages/client/src/lib/keyboard-shortcuts.js";
import {
  createOmnibarContext,
  filterOmnibarFuzzyFallback,
  getOmnibarActiveChatContextResultIds,
  getUnambiguousOmnibarResult,
  isDirectActiveChatAction,
  parseOmnibarIntent,
  searchOmnibar,
} from "../../packages/client/src/lib/omnibar-search.js";
import { getOmnibarSettingsDestinations } from "../../packages/client/src/lib/omnibar-settings.js";
import { isMariInstruction, parseOmnibarScope } from "../../packages/client/src/lib/omnibar-scope.js";
import {
  buildOmnibarContextResults,
  buildOmnibarIntentShortcuts,
  buildOmnibarSearchResults,
  findMentionedResults,
  matchesAtWordStart,
} from "../../packages/client/src/lib/omnibar-results.js";
import {
  SETTINGS_SEARCHABLE_CONTROLS,
  SETTINGS_SECTIONS,
  SETTINGS_TABS,
} from "../../packages/client/src/lib/settings-registry.js";
import {
  getCharacterDisplayIdentity,
  parseCharacterDisplayData,
} from "../../packages/client/src/lib/character-display.js";
import { reconcileActiveResultId, resolveOmnibarRowState } from "../../packages/client/src/lib/omnibar-row-state.js";
import {
  buildProfessorMariCommandCenterContext,
  inferProfessorMariCommandCenterCapability,
} from "../../packages/client/src/lib/professor-mari-command-center-context.js";
import {
  OMNIBAR_ASIDE_DELAY_CHOICES_MS,
  OMNIBAR_ASIDE_DELAY_MS,
  OmnibarAsideAnswerCache,
  omnibarAsideHandoffAnswer,
  stripStrayMarkdown,
} from "../../packages/client/src/lib/omnibar-aside-text.js";
import {
  assignReviewsToTurns,
  professorMariContextFacets,
  summarizeDeleteReview,
} from "../../packages/client/src/lib/professor-mari-presentation.js";
import {
  formatDocumentationGroundingExcerpts,
  type DocumentationSearchResult,
} from "../../packages/server/src/services/professor-mari/documentation-tools.js";
import { fieldChangeStyle, trackListChange, trackProseChange } from "../../packages/client/src/lib/mari-edit-diff.js";
import { pastTenseStepTitle } from "../../packages/client/src/lib/mari-work-timeline.js";
import {
  createPullRecognizer,
  pullCircleTarget,
  pullOpenThreshold,
  pullSheetBase,
  pullSheetPath,
  pullTarget,
} from "../../packages/client/src/lib/pull-to-open.js";
import { QUICK_ANSWER_SETTINGS_LABELS } from "../../packages/server/src/services/professor-mari/quick-answer-settings-labels.js";

const commands: CommandDefinition[] = [
  { id: "home", title: "Home", kind: "navigation", icon: "home", target: { kind: "home" } },
  { id: "settings", title: "Settings", kind: "settings", icon: "settings" },
];
const malformed = normalizeCommandRankingState({
  pinnedIds: ["home", "home", 42, ""],
  recent: [
    { id: "home", lastUsedAt: 10, useCount: 2 },
    { id: "home", lastUsedAt: 20, useCount: 3 },
    { id: "settings", lastUsedAt: "bad", useCount: 1 },
  ],
});
assert.deepEqual(malformed, { pinnedIds: ["home"], recent: [{ id: "home", lastUsedAt: 20, useCount: 3 }] });

const used = recordCommandUse(malformed, "settings", 30);
const ranked = rankCommandResults(
  commands.map((command) => ({ command, score: command.id === "settings" ? 300 : 1 })),
  setCommandPinned(used, "home", true),
  30,
);
assert.equal(ranked[0]?.result.command.id, "home");
assert.equal(ranked[0]?.pinned, true);

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => void values.set(key, value),
};
assert.equal(writeCommandRankingState(used, storage), true);
assert.deepEqual(readCommandRankingState(storage), used);
assert.deepEqual(readCommandRankingState({ getItem: () => "{", setItem: () => undefined }), {
  pinnedIds: [],
  recent: [],
});

const systemCommands = createSystemCommandDefinitions({});
assert.deepEqual(systemCommands.find((command) => command.id === "spotify-settings")?.availability, {
  status: "requires-capability",
  capability: "spotify",
  setupTarget: true,
});
assert.equal(systemCommands.find((command) => command.id === "spotify-settings")?.action.kind, "navigate");
assert.equal(systemCommands.find((command) => command.id === "tts-settings")?.action.kind, "navigate");

const presentationResults: CommandCenterPresentableResult[] = [
  { id: "chat:pinned", category: "chat", metadata: [{ label: "rank", value: "first" }] },
  { id: "chat:recent", category: "chat" },
  { id: "control:theme", category: "settings", control: {} },
  { id: "characters", category: "navigation" },
  { id: "chat:pinned", category: "chat" },
];
const emptyPresentation = presentCommandCenterResults(presentationResults, {
  query: "",
  rankingState: {
    pinnedIds: ["chat:pinned"],
    recent: [
      { id: "chat:pinned", lastUsedAt: 20, useCount: 2 },
      { id: "chat:recent", lastUsedAt: 10, useCount: 1 },
    ],
  },
});
assert.deepEqual(
  emptyPresentation.groups.map((group) => [group.id, group.results.map((result) => result.id)]),
  [
    ["pinned", ["chat:pinned"]],
    ["recent", ["chat:recent"]],
    ["quick-controls", ["control:theme"]],
    ["create-navigation", ["characters"]],
  ],
);
const contextualPresentation = presentCommandCenterResults(
  [
    { id: "context:chat:one", category: "chat", group: "current-work" },
    { id: "ask-professor-mari", category: "professor", group: "continue" },
    { id: "create-character", category: "navigation" },
  ],
  { query: "" },
);
assert.deepEqual(
  contextualPresentation.groups.map((group) => [group.id, group.results.map((result) => result.id)]),
  [
    ["current-work", ["context:chat:one"]],
    ["continue", ["ask-professor-mari"]],
    ["create-navigation", ["create-character"]],
  ],
);
assert.deepEqual(
  contextualPresentation.results.map((result) => result.id),
  ["context:chat:one", "ask-professor-mari", "create-character"],
);
assert.equal(contextualPresentation.results[0]?.id, contextualPresentation.groups[0]?.results[0]?.id);
assert.equal(
  reconcileActiveResultId(
    null,
    contextualPresentation.results.map((result) => result.id),
  ),
  "context:chat:one",
);
assert.deepEqual(
  presentCommandCenterResults(
    [
      { id: "chat:recent", category: "chat" },
      { id: "chat:current", category: "chat", group: "current-work" },
      { id: "control:theme", category: "settings", control: {} },
    ],
    {
      query: "",
      rankingState: { pinnedIds: [], recent: [{ id: "chat:recent", lastUsedAt: 1, useCount: 1 }] },
    },
  ).results.map((result) => result.id),
  ["chat:current", "chat:recent", "control:theme"],
);
assert.deepEqual(
  buildProfessorMariCommandCenterContext(
    "compare these presets",
    { id: "preset:one", title: "One", category: "preset" },
    [
      { id: "preset:two", title: "Two", category: "preset" },
      { id: "preset:three", title: "Three", category: "preset" },
    ],
  ),
  {
    source: "command-center",
    capability: "recommend",
    query: "compare these presets",
    commandCenterResultId: "preset:one",
    resource: { kind: "preset", id: "one", label: "One" },
    relatedResources: [
      { kind: "preset", id: "two", label: "Two" },
      { kind: "preset", id: "three", label: "Three" },
    ],
    action: "Selected Command Center result: One",
  },
);
assert.equal(emptyPresentation.results.length, 4);
assert.equal(emptyPresentation.results[0]?.metadata?.[0]?.value, "first");
assert.equal(emptyPresentation.categoryAvailability.all, 4);
assert.equal(emptyPresentation.categoryAvailability.chats, 2);

const searchPresentation = presentCommandCenterResults(
  [
    { id: "docs:guide", category: "docs" },
    { id: "persona:one", category: "persona" },
    { id: "chat:one", category: "chat" },
    { id: "ask-professor-mari", category: "professor" },
    { id: "character:one", category: "character" },
  ],
  { query: "one" },
);
assert.deepEqual(
  searchPresentation.groups.map((group) => group.id),
  ["chats", "characters", "personas", "docs", "professor-fallback"],
);

const resourceBeforeMessage = presentCommandCenterResults(
  [
    { id: "message:one:1", category: "chat", group: "messages" },
    { id: "chat:mira", category: "chat" },
    { id: "character:mira", category: "character" },
  ],
  { query: "mira" },
);
assert.deepEqual(
  resourceBeforeMessage.results.map((result) => result.id),
  ["chat:mira", "character:mira", "message:one:1"],
);

// Top hit: the best strong match leads, even when its category renders later.
const themeSearch = presentCommandCenterResults(
  [
    { id: "settings-control:theme", category: "settings", score: 305, title: "Theme" },
    { id: "chat:theme-park", category: "chat", score: 210, title: "Theme park" },
    { id: "docs:themes", category: "docs", score: 320, title: "Themes" },
  ],
  { query: "theme" },
);
assert.deepEqual(
  themeSearch.groups.map((group) => group.id),
  ["top-hit", "chats", "docs"],
  "an exact setting beats the chat that only starts with the word",
);
assert.equal(themeSearch.results[0]?.id, "settings-control:theme");
// Docs arrive late, so they never become the Top hit, however well they score.
assert.equal(
  themeSearch.groups[0]?.results.some((result) => result.id === "docs:themes"),
  false,
);
// A weak match is not a Top hit, and a best match already on top is left alone.
assert.deepEqual(
  presentCommandCenterResults(
    [
      { id: "settings-control:theme", category: "settings", score: 120, title: "Theme" },
      { id: "chat:theme-park", category: "chat", score: 110, title: "Theme park" },
    ],
    { query: "them" },
  ).groups.map((group) => group.id),
  ["chats", "settings"],
);
assert.deepEqual(
  presentCommandCenterResults(
    [
      { id: "chat:eliza", category: "chat", score: 310, title: "Eliza" },
      { id: "character:eliza", category: "character", score: 305, title: "Eliza" },
    ],
    { query: "eliza" },
  ).groups.map((group) => group.id),
  ["chats", "characters"],
);

// A title that starts with the text beats a stronger row where only a later word does.
assert.equal(
  presentCommandCenterResults(
    [
      {
        id: "settings-control:persona-pickers",
        category: "settings",
        score: 310,
        title: "Show Characters in Persona Pickers",
      },
      { id: "chat:persona-notes", category: "chat", score: 150, title: "Notes about personas" },
      { id: "navigation:persona-library", category: "navigation", score: 207, title: "Persona library" },
    ],
    { query: "persona" },
  ).groups[0]?.results[0]?.id,
  "navigation:persona-library",
);

// An alias match ranks, but it is never the Top hit: the typed text must lead the visible title.
assert.deepEqual(
  presentCommandCenterResults(
    [
      { id: "settings-control:accent", category: "settings", score: 305, title: "Accent Color" },
      { id: "chat:theme-park", category: "chat", score: 210, title: "Theme park" },
    ],
    { query: "theme" },
  ).groups.map((group) => group.id),
  ["chats", "settings"],
);

const fuzzyFallbackResults = searchOmnibar("mira", {
  commands: [],
  chats: [{ id: "mira", name: "Mira" }],
  resources: [{ id: "archive", kind: "character", name: "My interesting roleplay archive" }],
  connections: [],
});
assert.deepEqual(
  filterOmnibarFuzzyFallback(fuzzyFallbackResults).map((result) => result.id),
  ["chat:mira", "ask-professor-mari"],
);
const typoFallbackResults = searchOmnibar("mra", {
  commands: [],
  chats: [{ id: "mira", name: "Mira" }],
  resources: [],
  connections: [],
});
assert.equal(
  filterOmnibarFuzzyFallback(typoFallbackResults)[0]?.id,
  "chat:mira",
  "a fuzzy match remains when no literal result exists",
);

const summaryMatchResults = searchOmnibar("sarcastic vampire", {
  commands: [],
  chats: [],
  resources: [
    {
      id: "eliza",
      kind: "character",
      name: "Eliza",
      description: "A dry-witted immortal with a guarded heart.",
      searchText: ["A sarcastic vampire who owns a midnight bookshop.", "gothic", "SpicyMarinara"],
    },
    { id: "sarcastic-vampire", kind: "character", name: "Sarcastic Vampire" },
  ],
  connections: [],
});
assert.deepEqual(
  summaryMatchResults.slice(0, 2).map((result) => result.id),
  ["character:sarcastic-vampire", "character:eliza"],
  "character names outrank summary metadata while summaries remain searchable",
);
assert.equal(
  summaryMatchResults.find((result) => result.id === "character:eliza")?.description,
  "A dry-witted immortal with a guarded heart.",
  "summary-backed preview text survives search result construction",
);

const filteredPresentation = presentCommandCenterResults(searchPresentation.results, {
  query: "one",
  filter: "characters",
});
assert.equal(filteredPresentation.filter, "characters");
assert.deepEqual(
  filteredPresentation.results.map((result) => result.id),
  ["character:one"],
);
assert.equal(filteredPresentation.categoryAvailability.chats, 1);
assert.equal(filteredPresentation.categoryAvailability.characters, 1);

const cappedPresentation = presentCommandCenterResults(
  Array.from({ length: COMMAND_CENTER_MAX_RESULTS + 10 }, (_, index) => ({
    id: `chat:${index}`,
    category: "chat" as const,
  })),
  { query: "chat" },
);
assert.equal(cappedPresentation.results.length, COMMAND_CENTER_MAX_RESULTS);
assert.equal(cappedPresentation.categoryAvailability.chats, COMMAND_CENTER_MAX_RESULTS + 10);

const localizedConnectionPreview = {
  kind: "connection" as const,
  facts: [{ label: "Localized model", value: "example-model" }],
};
const connectionResults = searchOmnibar("primary", {
  commands: [],
  chats: [],
  resources: [],
  connections: [{ id: "primary", name: "Primary", preview: localizedConnectionPreview }],
  askProfessorTitle: "Ask",
});
assert.equal(
  connectionResults.find((result) => result.id === "connection:primary")?.preview,
  localizedConnectionPreview,
);
assert.deepEqual(
  presentCommandCenterResults(connectionResults, { query: "primary" }).groups.map((group) => group.id),
  ["connections", "professor-fallback"],
);

const categorizedCommands = searchOmnibar("command", {
  commands: [
    { id: "custom-settings-command", title: "Command settings", kind: "settings", icon: "settings" },
    { id: "settings-looking-navigation", title: "Command navigation", kind: "navigation", icon: "home" },
  ],
  chats: [],
  resources: [],
  connections: [],
});
assert.equal(categorizedCommands.find((result) => result.id === "custom-settings-command")?.category, "settings");
assert.equal(categorizedCommands.find((result) => result.id === "settings-looking-navigation")?.category, "navigation");

const naturalRequestResults = searchOmnibar("make Luna warmer", {
  commands: [],
  chats: [],
  resources: [
    { kind: "character", id: "luna", name: "Luna" },
    { kind: "character", id: "mara", name: "Mara" },
  ],
  connections: [],
  context: createOmnibarContext({
    surface: "editor",
    openResource: { kind: "character", id: "luna", resultId: "character:luna" },
  }),
});
assert.equal(naturalRequestResults[0]?.id, "character:luna");
assert.equal(naturalRequestResults[0]?.score, 234);

const contextRankedResults = searchOmnibar("Luna", {
  commands: [],
  chats: [],
  resources: [
    { kind: "character", id: "other-luna", name: "Luna" },
    { kind: "character", id: "current-luna", name: "Luna" },
  ],
  connections: [],
  context: createOmnibarContext({
    surface: "chat",
    activeChat: { id: "chat-one", resultIds: ["character:current-luna"] },
  }),
});
assert.equal(contextRankedResults[0]?.id, "character:current-luna");
assert.equal(contextRankedResults[0]?.score, 359);
const exactBeforePinnedPrefix = searchOmnibar("Luna", {
  commands: [],
  chats: [],
  resources: [
    { kind: "character", id: "exact", name: "Luna" },
    { kind: "character", id: "pinned-prefix", name: "Luna Park" },
  ],
  connections: [],
  context: createOmnibarContext({ surface: "home", pinnedResultIds: ["character:pinned-prefix"] }),
});
assert.deepEqual(
  exactBeforePinnedPrefix.slice(0, 2).map((result) => result.id),
  ["character:exact", "character:pinned-prefix"],
);
assert.deepEqual(parseOmnibarIntent("Go to the Moonlight preset"), {
  kind: "navigate",
  verb: "go to",
  targetQuery: "moonlight preset",
});
assert.deepEqual(parseOmnibarIntent("add Luna to this chat"), {
  kind: "action",
  verb: "add",
  targetQuery: "luna",
});
assert.equal(parseOmnibarIntent("new character")?.kind, "create");
assert.equal(parseOmnibarIntent("how do presets work")?.kind, "explain");
assert.equal(parseOmnibarIntent("recommend a preset")?.kind, "recommend");
assert.equal(parseOmnibarIntent("image generation failed")?.kind, "repair");
assert.equal(parseOmnibarIntent("add Luna to this chat")?.kind, "action");
assert.equal(parseOmnibarIntent("profile Luna"), null);

const directOpenResults = searchOmnibar("open Luna", {
  commands: [],
  chats: [],
  resources: [
    { kind: "character", id: "luna", name: "Luna" },
    { kind: "character", id: "lunar", name: "Lunar" },
  ],
  connections: [],
});
assert.equal(directOpenResults[0]?.id, "character:luna");
assert.ok(directOpenResults[0]!.score > directOpenResults.at(-1)!.score);
assert.equal(getUnambiguousOmnibarResult(directOpenResults)?.id, "character:luna");

const ambiguousResults = searchOmnibar("open Luna", {
  commands: [],
  chats: [],
  resources: [
    { kind: "character", id: "luna-one", name: "Luna" },
    { kind: "character", id: "luna-two", name: "Luna" },
  ],
  connections: [],
});
assert.equal(getUnambiguousOmnibarResult(ambiguousResults), null);
assert.equal(isDirectActiveChatAction("add Luna", directOpenResults[0]!, directOpenResults), true);
assert.equal(isDirectActiveChatAction("use Luna", directOpenResults[0]!, directOpenResults), false);
assert.equal(isDirectActiveChatAction("add Luna", ambiguousResults[0]!, ambiguousResults), false);
assert.equal(isDirectActiveChatAction("use Luna in this chat", ambiguousResults[0]!, ambiguousResults), false);
assert.equal(isDirectActiveChatAction("use Luna in this chat", directOpenResults[0]!, directOpenResults), true);

const repairResults = searchOmnibar("fix speech error", {
  commands: [
    {
      id: "tts-settings",
      title: "Text to speech",
      kind: "settings",
      availability: { status: "requires-capability", capability: "tts", setupTarget: true },
    },
    { id: "diagnostics", title: "Support diagnostics", kind: "settings" },
  ],
  chats: [],
  resources: [],
  connections: [],
  context: createOmnibarContext({
    surface: "settings",
    setupResultIds: ["tts-settings"],
    error: { resultIds: ["diagnostics"], message: "Connection failed" },
  }),
});
assert.equal(repairResults[0]?.id, "tts-settings");
assert.ok(repairResults.some((result) => result.id === "diagnostics"));

const boundedContext = createOmnibarContext({
  surface: "home",
  surfaceResultIds: Array.from({ length: 40 }, (_, index) => `result:${index}`),
  openResource: { kind: "character", id: "x".repeat(300), resultId: "character:" + "x".repeat(300) },
  error: { resultIds: [], message: "x".repeat(200) },
});
assert.equal(boundedContext.surfaceResultIds.length, 32);
assert.equal(boundedContext.openResource?.id.length, 256);
assert.equal(boundedContext.openResource?.resultId.length, 256);
assert.equal(boundedContext.error?.message?.length, 160);
assert.deepEqual(
  [
    ...getOmnibarActiveChatContextResultIds("chat-one", {
      id: "chat-one",
      characterIds: ["luna"],
      personaId: "hero",
      promptPresetId: "moonlight",
      connectionId: "primary",
      lorebookIds: ["world"],
      enableAgents: true,
      activeAgentIds: ["world-state"],
    }),
  ].sort(),
  [
    "agent:world-state",
    "character:luna",
    "chat:chat-one",
    "connection:primary",
    "lorebook:world",
    "persona:hero",
    "preset:moonlight",
  ],
);
assert.deepEqual([...getOmnibarActiveChatContextResultIds("chat-two", { id: "chat-one", characterIds: ["luna"] })], []);
assert.equal(
  getOmnibarActiveChatContextResultIds("chat-one", {
    id: "chat-one",
    enableAgents: false,
    activeAgentIds: ["world-state"],
  }).has("agent:world-state"),
  false,
);

assert.equal(
  getCharacterDisplayIdentity({ data: JSON.stringify({ name: "Card Name" }), comment: "Database label" }),
  "Card Name",
);
assert.equal(parseCharacterDisplayData({ data: "not-json" }).name, "Unknown");
assert.deepEqual(
  resolveOmnibarRowState({ resource: "character", id: "luna", activeChat: { characterIds: ["luna"] } }),
  { inActiveChat: true, globallyActive: false, canAddToChat: false, globalAction: null },
);
assert.deepEqual(
  resolveOmnibarRowState({ resource: "persona", id: "hero", activeChat: { personaId: "other" }, globallyActive: true }),
  { inActiveChat: false, globallyActive: true, canAddToChat: true, globalAction: null },
);
assert.deepEqual(resolveOmnibarRowState({ resource: "persona", id: "hero", activeChat: { personaId: "hero" } }), {
  inActiveChat: true,
  globallyActive: false,
  canAddToChat: false,
  globalAction: "activate-persona",
});
assert.deepEqual(
  resolveOmnibarRowState({ resource: "preset", id: "moonlight", activeChat: { promptPresetId: "moonlight" } }),
  { inActiveChat: true, globallyActive: false, canAddToChat: false, globalAction: "set-default-preset" },
);
assert.deepEqual(
  resolveOmnibarRowState({ resource: "connection", id: "primary", activeChat: { connectionId: "other" } }),
  { inActiveChat: false, globallyActive: false, canAddToChat: true, globalAction: null },
);

const settingsDestinations = getOmnibarSettingsDestinations();
const streamingSetting = settingsDestinations.find((setting) => setting.controlId === "streaming-speed");
assert.deepEqual(streamingSetting && { tab: streamingSetting.tab, controlId: streamingSetting.controlId }, {
  tab: "general",
  controlId: "streaming-speed",
});
assert.equal(settingsDestinations.find((setting) => setting.controlId === "font-family")?.sectionLabel, "Text & Scale");
// Tab rows open the tab and nothing else. They used to scroll to a hand-picked
// "representative" control; the 32 real section rows do that job properly now.
const appearanceTabRow = settingsDestinations.find((setting) => setting.id === "settings-section:appearance");
assert.ok(appearanceTabRow, "the appearance tab row exists");
// A tab row names neither a control nor a section: it just opens the tab.
assert.equal(appearanceTabRow.controlId, undefined);
assert.equal(appearanceTabRow.sectionId, undefined);
const textScaleRow = settingsDestinations.find((setting) => setting.id === "settings-section-detail:text-scale");
assert.ok(textScaleRow, "the text-scale section row exists");
assert.equal(textScaleRow.sectionId, "text-scale");
assert.equal(textScaleRow.controlId, undefined);
assert.equal(textScaleRow.tab, "appearance");
// Derived from the registry, so every settings control is reachable, not the 22
// that the old hand-written list happened to name. Comparing against the
// registry rather than a fixed number keeps this true as settings are added.
assert.equal(
  new Set(settingsDestinations.map((setting) => setting.id)).size,
  settingsDestinations.length,
  "destination ids are unique",
);
// Identity, not just counts: every registered tab, section and control has
// exactly one row, so a rename cannot be masked by a coincidental total.
assert.deepEqual(
  new Set(settingsDestinations.flatMap((setting) => (setting.controlId ? [setting.controlId] : []))),
  new Set(SETTINGS_SEARCHABLE_CONTROLS.map((control) => control.id)),
);
assert.deepEqual(
  new Set(settingsDestinations.flatMap((setting) => (setting.sectionId ? [setting.sectionId] : []))),
  new Set(SETTINGS_SECTIONS.map((section) => section.id)),
);
for (const tab of SETTINGS_TABS) {
  assert.ok(
    settingsDestinations.some((setting) => setting.id === `settings-section:${tab.id}`),
    `tab ${tab.id} has a row`,
  );
}
assert.equal(
  settingsDestinations.length,
  SETTINGS_TABS.length + SETTINGS_SECTIONS.length + SETTINGS_SEARCHABLE_CONTROLS.length,
);

assert.equal(inferProfessorMariCommandCenterCapability("make Luna's greeting shorter"), "edit");
assert.equal(inferProfessorMariCommandCenterCapability("make a new character"), "create");
assert.equal(inferProfessorMariCommandCenterCapability("which preset is best"), "recommend");
assert.equal(inferProfessorMariCommandCenterCapability("why did image generation fail"), "repair");
assert.deepEqual(
  buildProfessorMariCommandCenterContext("make Luna warmer", {
    id: "character:luna-id",
    title: "Luna",
    category: "character",
  }),
  {
    source: "command-center",
    capability: "edit",
    query: "make Luna warmer",
    commandCenterResultId: "character:luna-id",
    resource: { kind: "character", id: "luna-id", label: "Luna" },
    action: "Selected Command Center result: Luna",
  },
);
assert.deepEqual(
  buildProfessorMariCommandCenterContext("explain this", {
    id: "settings-control:theme-mode",
    title: "Color scheme",
    category: "settings",
  }).resource,
  { kind: "setting", id: "theme-mode", label: "Color scheme" },
);
assert.equal(buildProfessorMariCommandCenterContext("explain this", undefined)?.commandCenterResultId, undefined);
assert.deepEqual(
  buildProfessorMariCommandCenterContext("explain this", undefined, [], undefined, {
    activeChat: { id: "chat-one", label: "Moonlit room", mode: "roleplay" },
    settingsLocation: { tab: "appearance", controlId: "theme-mode" },
  }),
  {
    source: "command-center",
    capability: "explain",
    query: "explain this",
    resource: undefined,
    action: undefined,
    activeChat: { id: "chat-one", label: "Moonlit room", mode: "roleplay" },
    settingsLocation: { tab: "appearance", controlId: "theme-mode" },
  },
);
// C1: escalating a live omnibar aside answer into Mari carries it along.
assert.deepEqual(
  buildProfessorMariCommandCenterContext("what does temperature do", undefined, [], undefined, {
    asideAnswer: { query: "what does temperature do", answer: "It controls randomness.", tier: "local" },
  }).asideAnswer,
  { query: "what does temperature do", answer: "It controls randomness.", tier: "local" },
);
// C2: the chip lists every facet a context carries, not just the first one found.
assert.deepEqual(
  professorMariContextFacets({
    source: "command-center",
    capability: "explain",
    resource: { kind: "character", id: "luna-id", label: "Luna" },
    activeChat: { id: "chat-one", label: "Moonlit room" },
    field: "Greeting",
    settingsLocation: { tab: "appearance" },
    error: { message: "Generation failed" },
    asideAnswer: { query: "q", answer: "Answer text", tier: "remote" },
  }),
  [
    { kind: "resource", text: "Luna" },
    { kind: "chat", text: "Moonlit room" },
    { kind: "field", text: "Greeting" },
    { kind: "settings", text: "Appearance" },
    { kind: "error", text: "Generation failed" },
    { kind: "asideAnswer", text: "Answer text" },
  ],
);
assert.deepEqual(professorMariContextFacets(null), []);

// A5: a typed scope prefix like "faq:" is omnibar search syntax, not message text
// — every door into Mari (including the Ask-Mari row's own query) must strip it
// with the same helper before it reaches the composer.
assert.equal(parseOmnibarScope("faq: import").query, "import");
assert.equal(parseOmnibarScope("plain question").query, "plain question");

// The list and Mari are the only panes. A session persisted with a removed one
// falls back to the list rather than resurrecting a surface that no longer exists.
assert.equal(normalizeCommandCenterSessionState({ pane: "mari" }).pane, "mari");
assert.equal(normalizeCommandCenterSessionState({ pane: "browse" }).pane, "results");
assert.equal(normalizeCommandCenterSessionState({ pane: "quick" }).pane, "results");
assert.equal(normalizeCommandCenterSessionState({ pane: "detail" }).pane, "results");
// `returnStack`, `mariDestination` and `mariDetailId` were persisted and
// normalized but never read: Escape steps back one level and the Mari pane owns
// its own destination. Unknown fields are dropped rather than carried forward.
const mariSession = normalizeCommandCenterSessionState({
  pane: "mari",
  mariDestination: "memories",
  mariDetailId: "memory-one",
  returnStack: [{ pane: "results", resultId: "character:luna" }],
});
assert.equal(mariSession.pane, "mari");
assert.ok(!("returnStack" in mariSession));
assert.ok(!("mariDestination" in mariSession));
assert.ok(!("mariDetailId" in mariSession));

{
  const key = (overrides: Partial<Parameters<typeof isOmnibarShortcut>[0]>) => ({
    key: "k",
    code: "KeyK",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  });
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true }), false), true);
  assert.equal(isOmnibarShortcut(key({ metaKey: true }), true), true);
  // Only the platform's own modifier: macOS keeps Ctrl+K for "delete to end of line".
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true }), true), false);
  assert.equal(isOmnibarShortcut(key({ metaKey: true }), false), false);
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true, shiftKey: true }), false), false);
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true, repeat: true }), false), false);
  // Non-Latin layouts report the local letter; the physical K key still counts.
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true, key: "л" }), false), true);
  // A Latin layout with a different letter on the K position does not.
  assert.equal(isOmnibarShortcut(key({ ctrlKey: true, key: "t" }), false), false);
}

console.info("Command Center regression checks passed.");

{
  const key = (overrides: Partial<Parameters<typeof isShortcutsHelpKey>[0]>) => ({
    key: "?",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...overrides,
  });
  assert.equal(isShortcutsHelpKey(key({})), true);
  assert.equal(isShortcutsHelpKey(key({ ctrlKey: true })), false);
  assert.equal(isShortcutsHelpKey(key({ repeat: true })), false);
  assert.equal(isShortcutsHelpKey(key({ key: "/" })), false);
  // "?" must reach text fields; buttons and checkboxes do not type it.
  const input = (type: string | null) => ({ tagName: "INPUT", getAttribute: () => type });
  assert.equal(isTypingTarget(input(null)), true);
  assert.equal(isTypingTarget(input("search")), true);
  assert.equal(isTypingTarget(input("checkbox")), false);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", closest: () => ({}) }), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON", closest: () => null }), false);
  assert.equal(formatShortcutKey("Mod", true), "⌘");
  assert.equal(formatShortcutKey("Mod", false), "Ctrl");
}

{
  // Handing typed text to Professor Mari sends it only when it asks for something.
  assert.equal(isMariInstruction("", "Eliza"), false, "nothing typed opens her with nothing to send");
  assert.equal(isMariInstruction("eliza", "Eliza"), false, "the row's own name is a search, not a request");
  assert.equal(isMariInstruction("char: Eli", "Eliza"), false, "a scope prefix is not part of the request");
  assert.equal(isMariInstruction("make eliza meaner", "Eliza"), true, "more than the name is a request");
  assert.equal(isMariInstruction("how do lorebooks work", null), true, "with no row, any text is a request");
}

{
  // FAQ and short docs matches need a word start, so a name search is not buried.
  assert.equal(matchesAtWordStart("Eliza Moreau", "eli"), true);
  assert.equal(matchesAtWordStart("One of the more reliable fixes", "eli"), false, "no match inside a word");
  assert.equal(matchesAtWordStart("Use the (beta) mode", "beta"), true, "after punctuation");
  assert.equal(matchesAtWordStart("a+b costs", "a+b"), true, "regex characters are literal");
  assert.equal(matchesAtWordStart("Éclair", "écl"), true, "letters beyond ASCII");
}

{
  // A quick answer offers the things it names, in the order it names them.
  const rows = [
    { id: "settings-control:streaming-speed", title: "Streaming speed" },
    { id: "character:eliza", title: "Eliza Moreau" },
    { id: "control:theme", title: "Theme", control: {} as never },
    { id: "chat:tea", title: "Tea" },
    { id: "settings-section:streaming-speed", title: "Streaming Speed" },
  ];
  assert.deepEqual(
    findMentionedResults("Ask Eliza Moreau, then lower Streaming speed in Settings.", rows).map((row) => row.id),
    ["character:eliza", "settings-control:streaming-speed"],
    "answer order; one row per name",
  );
  assert.deepEqual(
    findMentionedResults("Have some tea and change the theme.", rows),
    [],
    "short names and controls never count",
  );
  assert.deepEqual(
    findMentionedResults("Try streaming speedrun mode.", rows),
    [],
    "a name inside a longer word does not count",
  );
}

{
  // "new character Bob" and "chat with Shrek" become rows, with the typed casing kept.
  const t = ((key: string, fallback: string, values?: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values?.[name] ?? ""))) as never;
  const characters = [
    { id: "c1", name: "Shrek" },
    { id: "c2", name: "Dottore" },
    { id: "c3", name: "Donkey" },
  ];
  const created = buildOmnibarIntentShortcuts({ query: "new character Bob the Builder", characters, t });
  assert.deepEqual(created[0]?.action, { kind: "create-named", modal: "create-character", name: "Bob the Builder" });
  assert.equal(
    (
      buildOmnibarIntentShortcuts({ query: "create a lorebook called Silver Court", characters, t })[0]?.action as {
        name?: string;
      }
    )?.name,
    "Silver Court",
  );
  assert.deepEqual(
    buildOmnibarIntentShortcuts({ query: "chat with shrek", characters, t }).map((row) => row.id),
    ["shortcut:start-chat:c1"],
  );
  assert.deepEqual(
    buildOmnibarIntentShortcuts({ query: "new chat do", characters, t }).map((row) => row.id),
    ["shortcut:start-chat:c2", "shortcut:start-chat:c3"],
    "a partial name offers every character it starts",
  );
  assert.deepEqual(buildOmnibarIntentShortcuts({ query: "shrek", characters, t }), [], "a bare name is a search");
  assert.deepEqual(buildOmnibarIntentShortcuts({ query: "new character", characters, t }), [], "no name, no row");
}

{
  // The omnibar aside's answer cache: an LRU with a short TTL, keyed by connection + query.
  const cache = new OmnibarAsideAnswerCache(2, 1_000);
  assert.equal(cache.get("conn-a", "how do i export"), undefined, "a miss returns undefined");
  cache.set("conn-a", "how do i export", { answer: "Settings > Export", tier: "remote" });
  assert.deepEqual(cache.get("conn-a", "how do i export"), { answer: "Settings > Export", tier: "remote" });
  assert.equal(
    cache.get("conn-b", "how do i export"),
    undefined,
    "the same query on a different connection is a different entry",
  );

  // Over capacity evicts the least-recently-used entry, not the newest.
  cache.set("conn-a", "second query", { answer: "second", tier: "remote" });
  cache.get("conn-a", "how do i export"); // touch the first entry so it is now most-recently-used
  cache.set("conn-a", "third query", { answer: "third", tier: "remote" });
  assert.equal(cache.get("conn-a", "second query"), undefined, "the untouched entry is evicted, not the touched one");
  assert.deepEqual(cache.get("conn-a", "how do i export"), { answer: "Settings > Export", tier: "remote" });
  assert.deepEqual(cache.get("conn-a", "third query"), { answer: "third", tier: "remote" });

  // TTL expiry.
  const ttlCache = new OmnibarAsideAnswerCache(10, 0);
  ttlCache.set("conn-a", "expires now", { answer: "gone", tier: "local" });
  assert.equal(ttlCache.get("conn-a", "expires now"), undefined, "an expired entry is treated as a miss");
}

{
  // The omnibar aside strips markdown the plain-text prompt instruction failed to prevent.
  assert.equal(stripStrayMarkdown("**Settings** has it."), "Settings has it.");
  assert.equal(stripStrayMarkdown("Go to *Settings* > *Export*."), "Go to Settings > Export.");
  assert.equal(stripStrayMarkdown("Use `docs_search` first."), "Use docs_search first.");
  assert.equal(stripStrayMarkdown("# Heading\nBody text"), "Heading\nBody text");
  assert.equal(stripStrayMarkdown("- one\n- two"), "one\ntwo");
  assert.equal(stripStrayMarkdown("1. first\n2. second"), "first\nsecond");
  assert.equal(stripStrayMarkdown("Plain sentence, nothing to strip."), "Plain sentence, nothing to strip.");
}

{
  // G4: escalating after the one follow-up carries the whole exchange, not only the last answer.
  assert.equal(omnibarAsideHandoffAnswer("It controls randomness."), "It controls randomness.");
  assert.equal(
    omnibarAsideHandoffAnswer("Lower it to 0.7.", {
      question: " what should I set it to? ",
      previousAnswer: "It controls randomness.\n",
    }),
    "It controls randomness.\n\nFollow-up: what should I set it to?\nLower it to 0.7.",
  );
  // G5: the idle delay is a user-facing knob (R23) whose default is one of its choices.
  assert.equal(OMNIBAR_ASIDE_DELAY_MS, 3_000);
  assert.ok((OMNIBAR_ASIDE_DELAY_CHOICES_MS as readonly number[]).includes(OMNIBAR_ASIDE_DELAY_MS));
}

{
  // B6: the unasked quick-answer aside grounds its prompt in the real docs corpus
  // and real Settings labels only. formatDocumentationGroundingExcerpts's only
  // input is a docs_search result (path/heading/excerpt from README.md or
  // docs/**.md) - structurally it has no way to see chat, character, or other
  // user data, so a call site that never hands it anything else cannot leak.
  const results: DocumentationSearchResult[] = [
    {
      path: "docs/CONFIGURATION.md",
      heading: "Logging Levels",
      excerpt: "Set LOG_LEVEL to control verbosity.",
      startLine: 10,
      score: 90,
    },
    {
      path: "docs/FAQ.md",
      heading: "Export a chat",
      excerpt: "Use Settings > Backup & Export.",
      startLine: 4,
      score: 80,
    },
    {
      path: "README.md",
      heading: "Install",
      excerpt: "Download the installer for your platform.",
      startLine: 1,
      score: 70,
    },
    {
      path: "docs/TROUBLESHOOTING.md",
      heading: "Connection errors",
      excerpt: "Check the connection's base URL.",
      startLine: 2,
      score: 60,
    },
  ];

  const top3 = formatDocumentationGroundingExcerpts(results);
  const lines = top3.split("\n");
  assert.equal(lines.length, 3, "grounding keeps only the top 3 excerpts, not the full result set");
  assert.ok(
    lines[0]!.includes("docs/CONFIGURATION.md") && lines[0]!.includes("Logging Levels"),
    "each line cites its source path and heading",
  );
  assert.ok(!top3.includes("TROUBLESHOOTING"), "the 4th-ranked result is dropped");

  // An excerpt with embedded newlines (a real multi-line markdown section) is
  // flattened to one line per result and capped, so the grounding block stays
  // small and bounded rather than growing into a full-document dump.
  const longExcerpt = `First line of the section.\n${"word ".repeat(100)}`.trim();
  const flattened = formatDocumentationGroundingExcerpts([
    { path: "docs/FAQ.md", heading: "Long section", excerpt: longExcerpt, startLine: 1, score: 1 },
  ]);
  assert.equal(flattened.split("\n").length, 1, "one docs result is always rendered as exactly one line");
  assert.ok(flattened.length < longExcerpt.length, "an oversized excerpt is truncated, not passed through whole");
  assert.ok(flattened.endsWith("…"), "a truncated excerpt is marked with an ellipsis");

  assert.deepEqual(
    formatDocumentationGroundingExcerpts([]),
    "",
    "no matches renders an empty block, not a placeholder line",
  );
}

{
  // The unasked aside's compact Settings label list is grouped by real tab
  // labels and lists real section labels - no ids, no descriptions, no aliases -
  // so it stays small and only ever names things the user can actually see.
  assert.ok(QUICK_ANSWER_SETTINGS_LABELS.includes("General:"), "a real tab label heads its group");
  assert.ok(QUICK_ANSWER_SETTINGS_LABELS.includes("Backup & Export"), "a real section label is present");
  assert.ok(
    !QUICK_ANSWER_SETTINGS_LABELS.includes("backup-export"),
    "the internal section id does not leak into the prompt",
  );
  assert.ok(
    QUICK_ANSWER_SETTINGS_LABELS.length < 2_000,
    "the settings-label hint stays compact enough for a quick-answer prompt",
  );
}

{
  // Slice 6: the expanded row shows FAQ steps as a short list and no doc fact that
  // repeats the description.
  const identity = (text: string) => text;
  const results = buildOmnibarSearchResults({
    chatControls: [],
    contextLabels: {},
    controls: [],
    data: { commands: [], chats: [], resources: [], connections: [], askProfessorTitle: "Ask" },
    deferredQuery: "backups",
    docsResults: [
      {
        id: "doc:backups",
        title: "Backups",
        source: "Guides",
        snippet: "How backups work",
        path: "docs/BACKUPS.md",
        line: 4,
      } as never,
    ],
    faqItems: [
      {
        id: "backups",
        category: "data",
        question: "How do backups work?",
        answer: "Automatic backups run daily.",
        bullets: ["One", "Two", "Three", "Four", "Five"],
      },
    ],
    getFaqSearchText: (item) => `${item.question} ${item.answer}`,
    localize: identity,
    mariEnabled: false,
    omnibarContext: {
      surface: "home",
      surfaceResultIds: [],
      editorDirty: false,
      pinnedResultIds: [],
      recentResultIds: [],
      setupResultIds: [],
    } as never,
    t: ((_key: string, fallback?: string) => fallback ?? _key) as never,
  });
  const faqPreview = results.find((result) => result.id === "faq:backups")?.preview?.();
  assert.deepEqual(faqPreview?.steps, ["One", "Two", "Three"], "FAQ steps are a short list");
  assert.equal(faqPreview?.facts, undefined, "FAQ steps are not facts");
  const docPreview = results.find((result) => result.id === "doc:backups")?.preview?.();
  assert.ok(docPreview, "the doc passage is a result");
  assert.deepEqual(
    docPreview.facts?.map((fact) => fact.label),
    ["Source", "Line"],
    "no Category or Match fact repeats the path or the description",
  );
}

// Slice 7b (I4): a finished step reads in the past tense; other titles stay as they are.
{
  assert.equal(pastTenseStepTitle("Reading character"), "Read character");
  assert.equal(pastTenseStepTitle("Searching lorebooks"), "Searched lorebooks");
  assert.equal(pastTenseStepTitle("Creating character"), "Created character");
  assert.equal(pastTenseStepTitle("Updating preset"), "Updated preset");
  assert.equal(pastTenseStepTitle("Running command"), "Ran command");
  assert.equal(pastTenseStepTitle("Planning changes"), "Planned changes");
  assert.equal(pastTenseStepTitle("Copying file"), "Copied file");
  assert.equal(pastTenseStepTitle("Adding entry"), "Added entry");
  assert.equal(pastTenseStepTitle("Setting theme"), "Set theme");
  assert.equal(pastTenseStepTitle("Writing file"), "Wrote file");
  assert.equal(pastTenseStepTitle("Making changes"), "Made changes");
  assert.equal(pastTenseStepTitle("Taking notes"), "Took notes");
  assert.equal(pastTenseStepTitle("String search"), "String search", "no vowel before -ing: not a verb");
  assert.equal(pastTenseStepTitle("docs_search"), "docs_search");
}

// Slice 7b (I2): tracked changes keep a small edit word by word, but strike a rewrite whole.
{
  const greeting = trackProseChange(
    "Zylo waves. Hello, traveler! Want to buy something?",
    "Zylo waves. Hello, traveler. Want to buy something?",
  );
  assert.ok(
    greeting.some((segment) => segment.type === "equal" && segment.value.includes("Want to buy")),
    "a tweak keeps the shared words",
  );
  const greetingRework = trackProseChange(
    "*Zylo waves.* Hello, traveler! Want to buy something?",
    "*Zylo slides a crate lid shut with his boot.* Hello, traveler. You didn't see that. Want to buy something, or sell me your silence?",
  );
  assert.ok(
    greetingRework.some((segment) => segment.type === "equal" && segment.value.includes("Want to buy")),
    "a greeting reworked around its old lines stays word by word",
  );
  const rewrite = trackProseChange(
    "Zylo is a merchant who sells things at the market.",
    "Zylo Vantrell runs contraband under the lantern boats of the floating market.",
  );
  assert.deepEqual(
    rewrite.map((segment) => segment.type),
    ["removed", "equal", "added"],
    "a rewrite is the old text struck whole, then the new text",
  );
  assert.deepEqual(trackProseChange("", "New"), [{ type: "added", value: "New" }]);
  assert.deepEqual(trackListChange("human, merchant", "human, smuggler"), [
    { type: "equal", value: "human" },
    { type: "removed", value: "merchant" },
    { type: "added", value: "smuggler" },
  ]);
}

// Slices 10 and 15: pull down on the phone top bar to open the omnibar or Mari.
{
  assert.equal(pullOpenThreshold(844), 253.2, "30% of a phone's height");
  assert.equal(pullOpenThreshold(1200), 280, "capped at 280 px");
  assert.equal(pullOpenThreshold(390), 160, "a phone in landscape still needs 160 px");

  // A finger down at (100, 20) at t=0, threshold 200; each point is [x, y, t].
  const pull = (releaseAt: number, ...points: Array<[number, number, number]>) => {
    const recognizer = createPullRecognizer(100, 20, 0, 200);
    const steps = points.map(([x, y, t]) => recognizer.move(x, y, t));
    return { steps, opens: recognizer.release(releaseAt) };
  };

  // Direction lock after 10 px; 45° down is enough, so a pull can aim diagonally at Mari.
  assert.deepEqual(pull(20, [103, 26, 10]).steps, ["pending"], "under 10 px nothing is decided");
  assert.deepEqual(pull(40, [112, 30, 20]).steps, ["rejected"], "a sideways swipe is never a pull");
  assert.deepEqual(pull(40, [100, 8, 20]).steps, ["rejected"], "an upward swipe is never a pull");
  assert.equal(pull(1000, [140, 50, 200], [100, 300, 800]).opens, false, "rejected stays rejected");
  assert.deepEqual(pull(60, [109, 31, 50]).steps, ["pulling"], "down by more than sideways locks");

  // Threshold.
  assert.equal(pull(1000, [100, 60, 400], [100, 210, 800]).opens, false, "a slow pull short of it does not open");
  const long = pull(1000, [100, 60, 400], [100, 230, 800]);
  assert.deepEqual(long.steps, ["pulling", "armed"]);
  assert.equal(long.opens, true, "releasing past the threshold opens, however slowly");

  // Flick.
  assert.equal(pull(70, [100, 40, 20], [100, 70, 60]).opens, true, "a fast flick after 40 px opens early");
  assert.equal(pull(50, [100, 40, 20], [100, 55, 40]).opens, false, "a flick under 40 px does not");
  assert.equal(pull(400, [100, 40, 20], [100, 70, 60]).opens, false, "stopping before release is not a flick");

  // Cancel, with room for a jitter: an armed pull holds down to 85% of the threshold.
  const jitter = pull(900, [100, 60, 200], [100, 230, 500], [100, 205, 700]);
  assert.deepEqual(jitter.steps, ["pulling", "armed", "armed"], "a small slip back stays armed");
  assert.equal(jitter.opens, true);
  const back = pull(900, [100, 60, 200], [100, 230, 500], [100, 180, 700]);
  assert.deepEqual(back.steps, ["pulling", "armed", "cancelled"], "pulling back under 85% cancels");
  assert.equal(back.opens, false);
  const again = pull(900, [100, 60, 200], [100, 230, 500], [100, 180, 700], [100, 300, 800]);
  assert.equal(again.opens, false, "a cancelled pull stays cancelled");

  // Target: left half search, right half Mari, a 28 px dead zone around the middle.
  assert.equal(pullTarget(null, 100, 390, true), "search");
  assert.equal(pullTarget(null, 300, 390, true), "mari");
  assert.equal(pullTarget("search", 215, 390, true), "search", "inside the dead zone the side holds");
  assert.equal(pullTarget("search", 224, 390, true), "mari", "past it the side switches");
  assert.equal(pullTarget("mari", 175, 390, true), "mari");
  assert.equal(pullTarget("mari", 166, 390, true), "search");
  assert.equal(pullTarget(null, 300, 390, false), "search", "without Mari the whole bar is search");

  // The circle sits above the fingertip and never above the bar edge.
  const early = pullCircleTarget(20, 0.1);
  assert.ok(early.centerY - early.radius >= -early.radius * 0.25, "early on it grows out of the bar edge");
  assert.equal(early.tag, 0, "no small bar before there is room for it");
  const full = pullCircleTarget(230, 1);
  assert.equal(full.radius, 40);
  assert.equal(full.tag, 1);
  assert.ok(full.centerY + full.radius + 8 + 30 <= 230 - 32, "the small bar ends 32 px above the touch point");
  assert.ok(pullSheetBase(40, 1, 390) > pullSheetBase(40, 0.3, 390), "the sheet widens with the pull");

  // The sheet: one symmetric outline from the bar edge to the circle, no bumps.
  const sheet = { cx: 195, cy: 120, rx: 40, ry: 40, base: 160, pinch: 0, sag: 0 };
  const { d } = pullSheetPath(sheet);
  assert.match(d, /^M35 -3L355 -3L355 0C.*A40 40 0 0 1 .*Z$/, "a stretch of the bar edge, two sides and the arc");
  const xs = [...d.replace(/A[\d.]+ [\d.]+ 0 0 1 /, "L").matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(
    xs.every((x) => x >= 35 && x <= 355),
    "nothing reaches past the sheet's base on the bar",
  );
  const mirrored = pullSheetPath({ ...sheet, cx: 200 }).d;
  assert.notEqual(mirrored, d);
  const pinched = pullSheetPath({ ...sheet, pinch: 1 });
  assert.ok(pinched.waistY > 0 && pinched.waistY < 120, "it lets go between the bar and the circle");
}

{
  // Slice 13: lists, switches and one-word values read as chips; names and prose as tracked text.
  const field = (path: string, before: string, after: string) =>
    ({ path, label: path, before, after, kind: "changed" }) as const;
  assert.equal(fieldChangeStyle(field("keys", "market", "market, bazaar")), "list");
  assert.equal(fieldChangeStyle(field("data.tags", "a", "b")), "list");
  assert.equal(fieldChangeStyle(field("caseSensitive", "off", "on")), "toggle");
  assert.equal(fieldChangeStyle(field("selectiveLogic", "and_any", "not_all")), "enum");
  assert.equal(fieldChangeStyle(field("probability", "100", "50")), "enum");
  assert.equal(fieldChangeStyle(field("name", "Zylo", "Zyla")), "text", "a rename is tracked text");
  assert.equal(fieldChangeStyle(field("content", "old", "new")), "text", "prose is never chips");
  assert.equal(fieldChangeStyle(field("position", "before char", "after")), "text", "spaces mean text");

  // A review belongs to the reply of the turn it was requested in, never the transcript's end.
  const at = (minute: number) => `2026-10-01T10:${String(minute).padStart(2, "0")}:00.000Z`;
  const messages = [
    { id: "u1", role: "user", createdAt: at(0) },
    { id: "a1", role: "assistant", createdAt: at(2) },
    { id: "u2", role: "user", createdAt: at(5) },
    { id: "a2", role: "assistant", createdAt: at(5) },
    { id: "u3", role: "user", createdAt: at(9) },
  ];
  const turns = assignReviewsToTurns(messages, [
    { id: "r1", requestedAt: at(1) },
    { id: "r2", requestedAt: at(6) },
    { id: "r3", requestedAt: at(10) },
    { id: "r4", requestedAt: "not a date" },
  ]);
  assert.deepEqual(
    turns.byMessageId.get("a1")?.map((review) => review.id),
    ["r1"],
  );
  assert.deepEqual(
    turns.byMessageId.get("a2")?.map((review) => review.id),
    ["r2"],
    "the reply may predate it",
  );
  assert.deepEqual(
    turns.unassigned.map((review) => review.id),
    ["r3", "r4"],
    "a turn with no reply, or an unreadable time, stays after the transcript",
  );
}

{
  // A 120-entry lorebook delete: the preview stops at 50 rows, the card still names the lorebook
  // and counts every entry.
  const lorebookDelete = summarizeDeleteReview({
    affectedRows: 121,
    diffPreview: [
      { table: "lorebooks", action: "delete" },
      ...Array.from({ length: 49 }, () => ({ table: "lorebook_entries", action: "delete" })),
    ],
  });
  assert.equal(lorebookDelete?.parent.table, "lorebooks");
  assert.deepEqual(
    [lorebookDelete?.selected.length, lorebookDelete?.count, lorebookDelete?.linkedCount],
    [1, 121, 120],
  );
  // A section delete also edits the preset first: the edit is not a deleted row.
  const sectionDelete = summarizeDeleteReview({
    affectedRows: 2,
    diffPreview: [
      { table: "prompt_presets", action: "update" },
      { table: "prompt_sections", action: "delete" },
    ],
  });
  assert.deepEqual(
    [sectionDelete?.parent.table, sectionDelete?.count, sectionDelete?.linkedCount],
    ["prompt_sections", 1, 0],
  );
  assert.equal(summarizeDeleteReview({ affectedRows: 1, diffPreview: [{ table: "x", action: "update" }] }), null);
}

{
  // K1: a failed generate reply feeds the same "fix this" context row as a
  // failed connection test, so ⌘K surfaces it and ⌘↵ can hand it to Mari.
  const t = ((key: string, fallback: string, values?: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values?.[name] ?? ""))) as never;
  const baseInput = {
    activeChat: null,
    activeChatId: null,
    activeEditorField: null,
    agents: undefined,
    allLocalResults: [],
    characterNameById: new Map<string, string>(),
    connectionById: new Map(),
    lorebooks: undefined,
    mariEnabled: false,
    omnibarSuggestionsEnabled: false,
    openAgentId: null,
    openCharacterId: null,
    openConnectionId: null,
    openLorebookId: null,
    openPersonaId: null,
    openPresetId: null,
    personaById: new Map(),
    personas: undefined,
    presets: undefined,
    surface: "home" as const,
    t,
  };
  const withoutError = buildOmnibarContextResults({ ...baseInput, lastAppError: null });
  assert.equal(
    withoutError.some((row) => row.id === "connection:conn-1"),
    false,
    "no failure, no fix-this row",
  );
  const withGenerateFailure = buildOmnibarContextResults({
    ...baseInput,
    lastAppError: {
      message: "The connection timed out.",
      action: "Generate reply",
      retry: { id: "conn-1" },
    },
  });
  const fixRow = withGenerateFailure[0];
  assert.equal(fixRow?.id, "connection:conn-1", "the error row leads, same as a failed connection test");
  assert.equal(fixRow?.title, "Fix: Generate reply failed");
  assert.equal(fixRow?.description, "The connection timed out.");
}
