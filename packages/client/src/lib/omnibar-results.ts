/**
 * The omnibar's result producers. Each function is pure given an explicit input
 * object: no hooks, no store access, no data fetching. The component keeps its
 * `useMemo` wrappers so the memoisation boundaries — and therefore when each
 * list recomputes — are unchanged.
 *
 * `preview` stays a thunk everywhere: it is only invoked for the focused row.
 */
import {
  normalizeTextForMatch,
  type Chat,
  type GlobalChatSearchResult,
  type Lorebook,
  type LorebookEntry,
  type MariWorkspacePendingApproval,
  type Persona,
} from "@marinara-engine/shared";
import type { AgentConfigRow } from "../hooks/use-agents";
import type { HomeFaqItem } from "../components/chat/HomeFaq";
import { CHOICE_SCORE_PENALTY, buildChoiceOptionResults, readChoiceOptionId } from "./omnibar-choice-rows";
import { readNamedRow } from "./omnibar-row-readers";
import { parseChatMetadata } from "./chat-display";
import { deriveActiveLorebookViews, getChatActiveLorebookIds, getChatExcludedLorebookIds } from "./chat-lorebooks";
import { getChatCharacterIds } from "./chat-macros";
import { isLanguageGenerationConnection, type ConnectionProviderLike } from "./connection-filters";
import type { DocsCommandSearchPassage } from "./docs-command-search";
import type { OmnibarNamedRow, OmnibarTranslate } from "./omnibar-entity-rows";
import {
  getUnambiguousOmnibarResult,
  isOmnibarAddIntent,
  isOmnibarRefinableVerb,
  isOmnibarRemovalIntent,
  parseOmnibarIntent,
  searchOmnibar,
  type OmnibarCategory,
  type OmnibarContext,
  type OmnibarContextReason,
  type OmnibarResult,
  type OmnibarSearchData,
  type OmnibarSurface,
} from "./omnibar-search";
import { getOmnibarSettingsDestinations } from "./omnibar-settings";
import type { ChatResourceDragKind } from "./chat-resource-drag";
import { getSlashCompletions } from "./slash-commands";
import { inferProfessorMariCommandCenterCapability } from "./professor-mari-command-center-context";

/** Below this a message search matches most of the transcript. */
export const MIN_MESSAGE_SEARCH_LENGTH = 3;
const MAX_MESSAGE_SEARCH_RESULTS = 6;
const MAX_GLOBAL_MESSAGE_SEARCH_RESULTS = 6;
/**
 * The context group answers "what am I on?", not "what is in this chat?" — past
 * this many rows it buries recents and create actions. Applied by the idle list
 * rather than the builder, because "remove" reads the same rows and must see
 * every attached thing, not the first eight.
 */
export const CHAT_CONTEXT_MAX_RESULTS = 8;
const MAX_SLASH_RESULTS = 8;
/**
 * Slash commands worth offering before anything is typed while a chat is open.
 * Everything else stays discoverable by typing "/".
 */
const IDLE_CHAT_SLASH_COMMANDS = ["continue", "impersonate", "scene", "goto"] as const;
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the query starts the text or one of its words: "eli" matches "Eliza", not "reliable". */
export function matchesAtWordStart(text: string, query: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(query.trim())}`, "iu").test(text);
}

/** Shorter names ("Theme", "Tea") turn up in ordinary prose, so only distinctive ones count. */
const MIN_MENTIONED_NAME_LENGTH = 6;

/**
 * The rows a quick answer names, in the order it names them, so the answer can
 * lead somewhere: "turn on Streaming speed" offers the Streaming speed setting.
 * Deterministic and local; the model is never asked for ids. Rows with an inline
 * control are skipped, since choosing them does nothing on its own.
 */
export function findMentionedResults<T extends Pick<OmnibarResult, "id" | "title" | "control">>(
  answer: string,
  rows: readonly T[],
  max = 3,
): T[] {
  const text = answer.normalize("NFKC");
  const seenNames = new Set<string>();
  const found: { row: T; at: number }[] = [];
  for (const row of rows) {
    const name = row.title.trim();
    const key = name.toLocaleLowerCase();
    if (row.control || name.length < MIN_MENTIONED_NAME_LENGTH || seenNames.has(key)) continue;
    const match = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "iu").exec(text);
    if (!match) continue;
    seenNames.add(key);
    found.push({ row, at: match.index });
  }
  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, max)
    .map((item) => item.row);
}

/** A one-line excerpt centred on the match, so the row shows why it matched. */
function getMessageSearchSnippet(content: string, query: string): string {
  const text = content.replace(/\s+/gu, " ").trim();
  if (text.length <= 120) return text;
  const matchIndex = normalizeTextForMatch(text).indexOf(normalizeTextForMatch(query));
  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, start + 120);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

export type OmnibarUserStatus = "active" | "idle" | "dnd" | "invisible";

/** The UI-store setters the settings rows drive, passed in rather than imported. */
export type OmnibarControlSetters = {
  setTheme: (value: "dark" | "light") => void;
  setUserStatusManual: (value: OmnibarUserStatus) => void;
  setCommandCenterMariEnabled: (value: boolean) => void;
  setOmnibarSuggestionsEnabled: (value: boolean) => void;
  setReduceAmbientEffects: (value: boolean) => void;
  setMusicPlayerEnabled: (value: boolean) => void;
  setSpeechToTextEnabled: (value: boolean) => void;
  setNotificationSoundsOnlyWhenUnfocused: (value: boolean) => void;
  setShowTimestamps: (value: boolean) => void;
  setShowModelName: (value: boolean) => void;
  setShowTokenUsage: (value: boolean) => void;
};

export type OmnibarControlResultsInput = {
  /** Localizes the settings registry's English copy, as the Settings panel search does. */
  localize: (englishText: string) => string;
  mariEnabled: boolean;
  musicPlayerEnabled: boolean;
  notificationSoundsOnlyWhenUnfocused: boolean;
  omnibarSuggestionsEnabled: boolean;
  reduceAmbientEffects: boolean;
  setters: OmnibarControlSetters;
  showModelName: boolean;
  showTimestamps: boolean;
  showTokenUsage: boolean;
  speechToTextEnabled: boolean;
  t: OmnibarTranslate;
  theme: string;
  userStatus: OmnibarUserStatus;
};

export type OmnibarChatControlResultsInput = {
  activeChat: Chat | null | undefined;
  activeChatId: string | null | undefined;
  connections: readonly (ConnectionProviderLike & { id: string; name: string })[];
  patchChat: (input: {
    id: string;
    connectionId?: string | null;
    promptPresetId?: string | null;
    personaId?: string | null;
  }) => unknown;
  patchChatMetadata: (input: { id: string; enableAgents: boolean }) => unknown;
  resources: readonly { kind: string; id: string; name: string }[];
  t: OmnibarTranslate;
};

export type OmnibarSearchResultsInput = {
  chatControls: readonly OmnibarResult[];
  contextLabels: Partial<Record<OmnibarContextReason, string>>;
  controls: readonly OmnibarResult[];
  data: OmnibarSearchData;
  deferredQuery: string;
  docsResults: readonly DocsCommandSearchPassage[];
  faqItems: readonly HomeFaqItem[];
  /** Passed in so this module never pulls the FAQ component into its graph. */
  getFaqSearchText: (item: HomeFaqItem, localize: (englishText: string) => string) => string;
  localize: (englishText: string) => string;
  mariEnabled: boolean;
  omnibarContext: OmnibarContext;
  t: OmnibarTranslate;
};

export type OmnibarMariChatResultsInput = {
  deferredQuery: string;
  mariChats: readonly { id: string; name?: string | null }[];
  t: OmnibarTranslate;
};

export type OmnibarMessageResultsInput = {
  activeChatId: string | null | undefined;
  messageSearchIndex: readonly { message: { content: string }; haystack: string | null }[];
  messageSearchQuery: string;
  t: OmnibarTranslate;
};

export type OmnibarGlobalMessageResultsInput = {
  activeChatId: string | null;
  hits: readonly GlobalChatSearchResult[];
  /** The server has more hits than this page. */
  hasMore: boolean;
  messageSearchQuery: string;
  t: OmnibarTranslate;
};

export type OmnibarSlashResultsInput = {
  activeChatId: string | null | undefined;
  deferredQuery: string;
  slashAvailability: Parameters<typeof getSlashCompletions>[1];
  surface: OmnibarSurface;
};

export type OmnibarContextResultsInput = {
  activeChat: Chat | null | undefined;
  activeChatId: string | null | undefined;
  activeEditorField: { label: string } | null | undefined;
  agents: readonly AgentConfigRow[] | undefined;
  allLocalResults: readonly OmnibarResult[];
  characterNameById: ReadonlyMap<string, string>;
  connectionById: ReadonlyMap<string, OmnibarNamedRow>;
  lastAppError: { message: string; action?: string; retry?: { id: string } | null } | null | undefined;
  lorebooks: Lorebook[] | undefined;
  mariEnabled: boolean;
  omnibarSuggestionsEnabled: boolean;
  openAgentId: string | null | undefined;
  openCharacterId: string | null | undefined;
  openConnectionId: string | null | undefined;
  openLorebookId: string | null | undefined;
  openPersonaId: string | null | undefined;
  openPresetId: string | null | undefined;
  personaById: ReadonlyMap<string, Persona>;
  personas: readonly unknown[] | undefined;
  presets: readonly unknown[] | undefined;
  surface: OmnibarSurface;
  t: OmnibarTranslate;
};

export type OmnibarVerbSuggestionsInput = {
  /** Every locally known row, used to answer "enable" and "create" directly. */
  allLocalResults: readonly OmnibarResult[];
  deferredQuery: string;
};

export type OmnibarAddSuggestionsInput = {
  activeChat: Chat | null | undefined;
  /** Result ids already attached to the open chat, so nothing is offered twice. */
  attachedResultIds: ReadonlySet<string>;
  deferredQuery: string;
  omnibarSuggestionsEnabled: boolean;
  searchResults: readonly OmnibarResult[];
  t: OmnibarTranslate;
};

export type OmnibarRemovalSuggestionsInput = {
  activeChat: Chat | null | undefined;
  /** Result ids currently attached to the open chat. */
  attachedResultIds: ReadonlySet<string>;
  /** The already-derived rows for the open chat, which is where the names come from. */
  contextResults: readonly OmnibarResult[];
  deferredQuery: string;
  omnibarSuggestionsEnabled: boolean;
  t: OmnibarTranslate;
};

export type OmnibarContinueResultInput = {
  mariEnabled: boolean;
  t: OmnibarTranslate;
  workspaceStatus: { active?: boolean; pendingApprovals: readonly unknown[] } | undefined;
  /** A task the user handed to Mari that she has since finished. */
  mariFinished?: boolean;
};

export function buildOmnibarControlResults({
  localize,
  mariEnabled,
  musicPlayerEnabled,
  notificationSoundsOnlyWhenUnfocused,
  omnibarSuggestionsEnabled,
  reduceAmbientEffects,
  setters,
  showModelName,
  showTimestamps,
  showTokenUsage,
  speechToTextEnabled,
  t,
  theme,
  userStatus,
}: OmnibarControlResultsInput): OmnibarResult[] {
  const toggleRows = [
    [
      "commandCenterMariEnabled",
      "commandCenter.controls.mariAssist",
      "Mari assistance",
      mariEnabled,
      setters.setCommandCenterMariEnabled,
    ],
    [
      "omnibarSuggestionsEnabled",
      "commandCenter.controls.omnibarSuggestions",
      "Omnibar suggestions",
      omnibarSuggestionsEnabled,
      setters.setOmnibarSuggestionsEnabled,
    ],
    [
      "reduceAmbientEffects",
      "commandCenter.controls.reducedEffects",
      "Reduced effects",
      reduceAmbientEffects,
      setters.setReduceAmbientEffects,
    ],
    [
      "musicPlayerEnabled",
      "commandCenter.controls.musicPlayer",
      "Music player",
      musicPlayerEnabled,
      setters.setMusicPlayerEnabled,
    ],
    [
      "speechToTextEnabled",
      "commandCenter.controls.speechToText",
      "Speech to text",
      speechToTextEnabled,
      setters.setSpeechToTextEnabled,
    ],
    [
      "notificationSoundsOnlyWhenUnfocused",
      "commandCenter.controls.unfocusedSounds",
      "Sounds only when unfocused",
      notificationSoundsOnlyWhenUnfocused,
      setters.setNotificationSoundsOnlyWhenUnfocused,
    ],
    ["showTimestamps", "commandCenter.controls.timestamps", "Timestamps", showTimestamps, setters.setShowTimestamps],
    ["showModelName", "commandCenter.controls.modelName", "Model name", showModelName, setters.setShowModelName],
    ["showTokenUsage", "commandCenter.controls.tokenUsage", "Token usage", showTokenUsage, setters.setShowTokenUsage],
  ] as const;
  const settingsDestinations = getOmnibarSettingsDestinations().map((setting) => ({
    id: setting.id,
    title: localize(setting.title),
    category: "settings" as const,
    // A named control outranks the section and tab rows that contain it.
    score: setting.controlId ? 165 : setting.sectionId ? 160 : 155,
    aliases: setting.aliases.map(localize),
    target: {
      kind: "settings" as const,
      tab: setting.tab,
      controlId: setting.controlId,
      sectionId: setting.sectionId,
    },
    description: `${localize(setting.sectionLabel)} · ${localize(setting.description)}`,
    kind: "settings" as const,
    icon: "settings" as const,
  }));
  return [
    ...settingsDestinations,
    {
      id: "control:theme",
      title: t("commandCenter.controls.theme", "Theme"),
      category: "settings",
      score: 180,
      control: {
        type: "choice",
        label: t("commandCenter.controls.theme", "Theme"),
        value: theme,
        options: [
          {
            value: "dark",
            label: t("commandCenter.values.dark", "Dark"),
            aliases: ["dark mode", "dark theme", "night mode"],
          },
          {
            value: "light",
            label: t("commandCenter.values.light", "Light"),
            aliases: ["light mode", "light theme", "day mode"],
          },
        ],
        onChange: (value) => setters.setTheme(String(value) as "dark" | "light"),
      },
    },
    {
      id: "control:presence",
      title: t("commandCenter.controls.presence", "Presence"),
      category: "settings",
      score: 175,
      control: {
        type: "choice",
        label: t("commandCenter.controls.presence", "Presence"),
        value: userStatus,
        options: (["active", "idle", "dnd", "invisible"] as const).map((value) => ({
          value,
          label: t(`commandCenter.presence.${value}`, value),
        })),
        onChange: (value) => setters.setUserStatusManual(String(value) as typeof userStatus),
      },
    },
    ...toggleRows.map(([id, key, fallback, value, onChange]) => ({
      id: `control:${id}`,
      title: t(key, fallback),
      category: "settings" as const,
      score: 170,
      control: {
        type: "toggle" as const,
        label: t(key, fallback),
        value,
        onChange: (nextValue: string | boolean) => onChange(nextValue === true),
      },
    })),
  ];
}

export function buildOmnibarChatControlResults({
  activeChat,
  activeChatId,
  connections,
  patchChat,
  patchChatMetadata,
  resources,
  t,
}: OmnibarChatControlResultsInput): OmnibarResult[] {
  if (!activeChat || activeChat.id !== activeChatId) return [];
  const chatId = activeChat.id;
  // ponytail: the segmented control renders every option as a pill, so a long
  // list would overflow the row. Cap it, and keep the current value visible.
  // Swap in a searchable picker if users hit the cap often.
  const capped = <T extends { id: string }>(items: readonly T[], activeId: string | null | undefined) => {
    const head = items.slice(0, 6);
    const active = activeId ? items.find((item) => item.id === activeId) : undefined;
    return active && !head.includes(active) ? [...head, active] : head;
  };
  const noneOption = { value: "", label: t("commandCenter.values.none", "None") };
  const chatMetadata = parseChatMetadata(activeChat.metadata);
  const languageConnections = connections.filter(isLanguageGenerationConnection);
  const resourcesOfKind = (kind: OmnibarCategory) =>
    resources.filter((resource) => resource.kind === kind).map(({ id, name }) => ({ id, name }));
  const chatPresets = resourcesOfKind("preset");
  const chatPersonas = resourcesOfKind("persona");
  const rows: OmnibarResult[] = [];
  if (languageConnections.length > 1) {
    rows.push({
      id: "control:chat-connection",
      title: t("commandCenter.controls.chatModel", "Model for this chat"),
      category: "connection",
      score: 190,
      aliases: ["model", "connection", "switch model", "provider"],
      group: "current-work",
      icon: "connection",
      control: {
        type: "choice",
        label: t("commandCenter.controls.chatModel", "Model for this chat"),
        value: activeChat.connectionId ?? "",
        options: capped(languageConnections, activeChat.connectionId).map((connection) => ({
          value: connection.id,
          label: connection.name,
        })),
        onChange: (value) => void patchChat({ id: chatId, connectionId: String(value) || null }),
      },
    });
  }
  if (chatPresets.length > 0) {
    rows.push({
      id: "control:chat-preset",
      title: t("commandCenter.controls.chatPreset", "Preset for this chat"),
      category: "preset",
      score: 189,
      aliases: ["preset", "prompt preset", "switch preset"],
      group: "current-work",
      icon: "preset",
      control: {
        type: "choice",
        label: t("commandCenter.controls.chatPreset", "Preset for this chat"),
        value: activeChat.promptPresetId ?? "",
        options: [
          noneOption,
          ...capped(chatPresets, activeChat.promptPresetId).map((preset) => ({
            value: preset.id,
            label: preset.name,
          })),
        ],
        onChange: (value) => void patchChat({ id: chatId, promptPresetId: String(value) || null }),
      },
    });
  }
  if (chatPersonas.length > 0) {
    rows.push({
      id: "control:chat-persona",
      title: t("commandCenter.controls.chatPersona", "Persona for this chat"),
      category: "persona",
      score: 188,
      aliases: ["persona", "swap persona", "who am i"],
      group: "current-work",
      icon: "persona",
      control: {
        type: "choice",
        label: t("commandCenter.controls.chatPersona", "Persona for this chat"),
        value: activeChat.personaId ?? "",
        options: [
          noneOption,
          ...capped(chatPersonas, activeChat.personaId).map((persona) => ({
            value: persona.id,
            label: persona.name,
          })),
        ],
        onChange: (value) => void patchChat({ id: chatId, personaId: String(value) || null }),
      },
    });
  }
  rows.push({
    id: "control:chat-agents",
    title: t("commandCenter.controls.chatAgents", "Agents in this chat"),
    category: "agent",
    score: 187,
    aliases: ["agents", "tools", "enable agents"],
    group: "current-work",
    icon: "agent",
    control: {
      type: "toggle",
      label: t("commandCenter.controls.chatAgents", "Agents in this chat"),
      value: chatMetadata.enableAgents === true,
      onChange: (value) => void patchChatMetadata({ id: chatId, enableAgents: value === true }),
    },
  });
  return rows;
}

export function buildOmnibarSearchResults({
  chatControls,
  contextLabels,
  controls,
  data,
  deferredQuery,
  docsResults,
  faqItems,
  getFaqSearchText,
  localize,
  mariEnabled,
  omnibarContext,
  t,
}: OmnibarSearchResultsInput): OmnibarResult[] {
  const query = deferredQuery;
  const normalizedQuery = query.trim().toLowerCase();
  // Matched at the start of a word: a bare substring let "eli" find every FAQ
  // whose answer says "reliable", which buried the character the user typed.
  const faqResults =
    normalizedQuery.length < 2
      ? []
      : faqItems.flatMap((item) => {
          const searchText = getFaqSearchText(item, localize);
          if (!matchesAtWordStart(searchText, normalizedQuery)) return [];
          const question = `${item.question} ${localize(item.question)}`.toLowerCase();
          const score = matchesAtWordStart(question, normalizedQuery) ? 230 : 130;
          return [
            {
              id: `faq:${item.id}`,
              title: localize(item.question),
              category: "docs" as const,
              action: { kind: "open-faq", itemId: item.id } as const,
              score,
              description: localize(item.answer),
              preview: () => ({
                kind: "docs" as const,
                title: localize(item.question),
                categoryLabel: t("omnibar.faq", "FAQ"),
                description: localize(item.answer),
                facts: (item.bullets ?? []).slice(0, 6).map((bullet) => ({
                  label: t("omnibar.faq.step", "Useful step"),
                  value: localize(bullet),
                })),
              }),
              kind: "resource" as const,
              icon: "documentation" as const,
            } satisfies OmnibarResult,
          ];
        });
  // Professor Mari blur: the fallback row speaks the query's intent, and is
  // promoted above search hits when the query reads like a question or nothing
  // matched well. Its preview "peeks" what Mari will do before you commit.
  const trimmedQuery = query.trim();
  const capability = inferProfessorMariCommandCenterCapability(trimmedQuery);
  const intent = parseOmnibarIntent(trimmedQuery);
  const askPeeks: Partial<Record<typeof capability, string>> = {
    repair: t("omnibar.askMari.peek.repair", "Mari will help troubleshoot and fix this."),
    recommend: t("omnibar.askMari.peek.recommend", "Mari will compare the options and recommend one."),
    create: t("omnibar.askMari.peek.create", "Mari will help you create this."),
    edit: t("omnibar.askMari.peek.change", "Mari will help you change this."),
  };
  // The row names what it will send (R8); the line under it says what she will do.
  const askTitle = trimmedQuery
    ? t("omnibar.askMari.withQuery", "Ask Mari: “{{query}}”", { query: trimmedQuery })
    : t("omnibar.askProfessorMari", "Ask Professor Mari");
  const askPeek =
    askPeeks[capability] ?? t("omnibar.askMari.peek.explain", "Mari will explain this and guide your next step.");
  // R40: with a query typed, a choice control's options join the searchable set,
  // so "gpt" reaches "Use GPT-4 for this chat" without finding the Model row and
  // drilling into it. They stay out of the idle deck, which would otherwise gain
  // six rows per control before the user has asked for anything.
  const controlChoices = trimmedQuery
    ? [...controls, ...chatControls].flatMap((control) => buildChoiceOptionResults(control))
    : [];
  const baseResults = searchOmnibar(query, {
    ...data,
    controls: [...controls, ...chatControls, ...controlChoices],
    context: omnibarContext,
    contextLabels,
  })
    .filter((result) => mariEnabled || result.id !== "ask-professor-mari")
    // A control's values were never part of the set this ranking was tuned on.
    // Damp them so they surface on a deliberate "gpt" and never crowd a real hit.
    .map((result) =>
      readChoiceOptionId(result.id) ? { ...result, score: result.score - CHOICE_SCORE_PENALTY } : result,
    )
    .sort((a, b) => b.score - a.score);
  const bestMatchScore = baseResults.reduce(
    (best, result) => (result.id === "ask-professor-mari" ? best : Math.max(best, result.score)),
    -1,
  );
  const directResult = getUnambiguousOmnibarResult(baseResults);
  const directIntent = intent?.kind === "navigate" || intent?.kind === "action" || intent?.kind === "create";
  const directSetup =
    intent?.kind === "repair" &&
    directResult?.availability &&
    typeof directResult.availability === "object" &&
    directResult.availability.setupTarget;
  const clearDirect = Boolean(directResult && directResult.score >= 250 && (directIntent || directSetup));
  const promoteMari =
    !clearDirect &&
    (intent?.kind === "explain" ||
      intent?.kind === "recommend" ||
      intent?.kind === "repair" ||
      /\?\s*$|^\s*(?:who|what|where|which|when|can|could|should|would|is|are|do|does|did|help|tell)\b/i.test(
        trimmedQuery,
      ) ||
      bestMatchScore < 150);
  const askResults = baseResults.map((result) =>
    result.id === "ask-professor-mari"
      ? {
          ...result,
          title: askTitle,
          description: askPeek,
          group: promoteMari ? ("professor-suggested" as const) : result.group,
          score: promoteMari ? 500 : result.score,
          preview: () => ({
            kind: "docs" as const,
            title: askTitle,
            categoryLabel: t("omnibar.askProfessorMari", "Ask Professor Mari"),
            description: askPeek,
            facts: trimmedQuery
              ? [{ label: t("omnibar.askMari.peek.searchLabel", "Your search"), value: trimmedQuery }]
              : [],
          }),
        }
      : result,
  );
  return [
    ...askResults,
    ...faqResults,
    ...docsResults
      // A short single word matches inside other words ("eli" in "reliable"), so
      // it needs a word start in the passage; longer queries keep the search's own ranking.
      .filter(
        (result) =>
          normalizedQuery.length >= 5 ||
          /\s/.test(normalizedQuery) ||
          matchesAtWordStart(`${result.title} ${result.snippet}`, normalizedQuery),
      )
      .map((result) => ({
        ...result,
        category: "docs" as const,
        action: { kind: "open-docs", path: result.path } as const,
        preview: () => ({
          kind: "docs" as const,
          title: result.title,
          categoryLabel: result.source,
          description: result.snippet,
          facts: [
            ...(result.source
              ? [{ label: t("commandCenter.preview.category", "Category"), value: result.source }]
              : []),
            ...(result.path ? [{ label: t("commandCenter.preview.source", "Source"), value: result.path }] : []),
            ...(result.line ? [{ label: t("commandCenter.preview.line", "Line"), value: result.line }] : []),
            ...(result.snippet ? [{ label: t("commandCenter.preview.match", "Match"), value: result.snippet }] : []),
          ],
        }),
        target: { kind: "window", window: "documentation" } as const,
        kind: "resource" as const,
        icon: "documentation" as const,
      })),
  ];
}

export function buildOmnibarMariChatResults({
  deferredQuery,
  mariChats,
  t,
}: OmnibarMariChatResultsInput): OmnibarResult[] {
  const normalized = normalizeTextForMatch(deferredQuery.trim());
  if (!normalized) return [];
  return mariChats
    .filter((chat) => normalizeTextForMatch(chat.name ?? "").includes(normalized))
    .slice(0, 5)
    .map((chat) => ({
      id: `mari-chat:${chat.id}`,
      action: { kind: "open-mari-chat", chatId: chat.id } as const,
      title: chat.name || t("omnibar.categories.professor", "Professor Mari"),
      description: t("commandCenter.mariChat", "Professor Mari conversation"),
      category: "chat" as const,
      group: "chats" as const,
      score: 120,
      kind: "action" as const,
      icon: "professor" as const,
    }));
}

export function buildOmnibarMessageResults({
  activeChatId,
  messageSearchIndex,
  messageSearchQuery,
  t,
}: OmnibarMessageResultsInput): OmnibarResult[] {
  const normalized = normalizeTextForMatch(messageSearchQuery);
  if (!activeChatId || normalized.length < MIN_MESSAGE_SEARCH_LENGTH) return [];
  const out: OmnibarResult[] = [];
  for (let index = 0; index < messageSearchIndex.length; index += 1) {
    if (out.length >= MAX_MESSAGE_SEARCH_RESULTS) break;
    const { message, haystack } = messageSearchIndex[index]!;
    if (haystack === null || !haystack.includes(normalized)) continue;
    out.push({
      id: `message:${activeChatId}:${index + 1}`,
      action: { kind: "goto-message", chatId: activeChatId, messageNumber: index + 1 },
      title: getMessageSearchSnippet(message.content, messageSearchQuery),
      description: t("commandCenter.messages.position", "Message {{number}}", { number: index + 1 }),
      category: "chat",
      group: "messages",
      score: 300 - out.length,
      kind: "action",
      icon: "chats",
    });
  }
  return out;
}

/**
 * The same rows as {@link buildOmnibarMessageResults}, but for every other chat.
 * Ids match the active-chat shape on purpose: when both lists cover the same
 * message the omnibar's id de-duplication keeps one row.
 */
export function buildOmnibarGlobalMessageResults({
  activeChatId,
  hits,
  hasMore,
  messageSearchQuery,
  t,
}: OmnibarGlobalMessageResultsInput): OmnibarResult[] {
  const query = messageSearchQuery.trim();
  if (query.length < MIN_MESSAGE_SEARCH_LENGTH) return [];
  const otherChats = hits.filter((hit) => hit.chatId !== activeChatId);
  const rows: OmnibarResult[] = otherChats.slice(0, MAX_GLOBAL_MESSAGE_SEARCH_RESULTS).map((hit, index) => ({
    id: `message:${hit.chatId}:${hit.messageNumber}`,
    action: { kind: "goto-message" as const, chatId: hit.chatId, messageNumber: hit.messageNumber },
    title: hit.snippet,
    description: t("commandCenter.messages.inChat", "{{chat}} · message {{number}}", {
      chat: hit.chatName,
      number: hit.messageNumber,
    }),
    category: "chat" as const,
    group: "messages" as const,
    score: 280 - index,
    kind: "action" as const,
    icon: "chats" as const,
  }));
  // The rows above are a sample; the full list, with filters, is Search All Chats.
  if (rows.length > 0 && (hasMore || otherChats.length > rows.length)) {
    rows.push({
      id: "global-search:see-all",
      action: { kind: "open-global-search", query },
      title: t("commandCenter.messages.seeAll", "See all results for “{{query}}”", { query }),
      description: t("commandCenter.messages.seeAllDescription", "Opens Search All Chats, with filters."),
      category: "chat",
      group: "messages",
      score: 280 - rows.length,
      kind: "action",
      icon: "chats",
    });
  }
  return rows;
}

/**
 * Lorebook entries whose name, keys or content contain the query: the lore
 * itself, not only the books. A server read, so these rows come last.
 */
export function buildOmnibarLorebookEntryResults({
  entries,
  lorebookNameById,
  query,
  t,
}: {
  entries: readonly LorebookEntry[];
  lorebookNameById: ReadonlyMap<string, string>;
  query: string;
  t: OmnibarTranslate;
}): OmnibarResult[] {
  if (query.trim().length < MIN_MESSAGE_SEARCH_LENGTH) return [];
  return entries.map((entry, index) => {
    const book = lorebookNameById.get(entry.lorebookId) ?? t("commandCenter.entries.unknownBook", "Lorebook");
    return {
      id: `lorebook-entry:${entry.lorebookId}:${entry.id}`,
      action: { kind: "open-lorebook-entry" as const, lorebookId: entry.lorebookId, entryId: entry.id },
      title: entry.name.trim() || entry.keys.join(", ") || t("commandCenter.entries.untitled", "Untitled entry"),
      description: `${book} · ${getMessageSearchSnippet(entry.content, query) || entry.keys.join(", ")}`,
      category: "lorebook" as const,
      group: "lorebook-entries" as const,
      score: 270 - index,
      kind: "resource" as const,
      icon: "lorebook" as const,
    };
  });
}

const CREATE_NAMED_PATTERN =
  /^\s*(?:create|new|make)\s+(?:an?\s+)?(character|card|persona|lorebook|world\s*book|preset)\s+(?:named\s+|called\s+)?(.+?)\s*$/i;
const CREATE_NAMED_MODAL: Record<string, "create-character" | "create-persona" | "create-lorebook" | "create-preset"> =
  {
    character: "create-character",
    card: "create-character",
    persona: "create-persona",
    lorebook: "create-lorebook",
    worldbook: "create-lorebook",
    preset: "create-preset",
  };
const START_CHAT_PATTERN =
  /^\s*(?:(?:start|new|open)\s+(?:an?\s+)?chat\s+(?:with\s+)?|chat\s+with\s+|talk\s+(?:to|with)\s+|roleplay\s+with\s+)(.+?)\s*$/i;
const MAX_START_CHAT_ROWS = 3;

/**
 * Rows for two everyday sentences the name search cannot answer: "new character
 * Bob" opens the create window with Bob filled in (casing kept), and "chat with
 * Shrek" / "new chat Dottore" starts a chat with a matching character. Both use
 * the app's existing windows; nothing is created from here.
 */
export function buildOmnibarIntentShortcuts({
  query,
  characters,
  t,
}: {
  query: string;
  characters: readonly { id: string; name: string }[];
  t: OmnibarTranslate;
}): OmnibarResult[] {
  const created = CREATE_NAMED_PATTERN.exec(query);
  if (created) {
    const kind = created[1]!.toLowerCase().replace(/\s+/g, "");
    const modal = CREATE_NAMED_MODAL[kind];
    const name = created[2]!.trim();
    if (!modal || !name) return [];
    const kindWord = modal.replace("create-", "");
    const kindLabel = t(`commandCenter.shortcuts.kind.${kindWord}`, kindWord);
    return [
      {
        id: `shortcut:${modal}`,
        action: { kind: "create-named", modal, name },
        title: t("commandCenter.shortcuts.createNamed", "Create {{kind}} “{{name}}”", { kind: kindLabel, name }),
        description: t(
          "commandCenter.shortcuts.createNamedDescription",
          "Opens the create window with the name filled in.",
        ),
        category: "navigation",
        group: "current-work",
        score: 600,
        kind: "action",
        icon:
          modal === "create-lorebook"
            ? "lorebook"
            : modal === "create-persona"
              ? "persona"
              : modal === "create-preset"
                ? "preset"
                : "character",
      },
    ];
  }
  const chat = START_CHAT_PATTERN.exec(query);
  const target = chat?.[1]?.trim();
  if (!target || target.length < 2) return [];
  return characters
    .filter((character) => matchesAtWordStart(character.name, target))
    .slice(0, MAX_START_CHAT_ROWS)
    .map((character, index) => ({
      id: `shortcut:start-chat:${character.id}`,
      action: { kind: "start-character-chat" as const, characterId: character.id, characterName: character.name },
      title: t("commandCenter.shortcuts.startChat", "Start a chat with {{name}}", { name: character.name }),
      description: t("commandCenter.shortcuts.startChatDescription", "Choose the mode, then the chat opens."),
      category: "chat" as const,
      group: "current-work" as const,
      score: 600 - index,
      kind: "action" as const,
      icon: "chats" as const,
    }));
}

export function buildOmnibarSlashResults({
  activeChatId,
  deferredQuery,
  slashAvailability,
  surface,
}: OmnibarSlashResultsInput): OmnibarResult[] {
  if (!activeChatId || surface !== "chat") return [];
  const typed = deferredQuery.trim();
  const commands = typed.startsWith("/")
    ? getSlashCompletions(typed, slashAvailability)
    : typed
      ? []
      : getSlashCompletions("/", slashAvailability).filter((command) =>
          (IDLE_CHAT_SLASH_COMMANDS as readonly string[]).includes(command.name),
        );
  return commands.slice(0, MAX_SLASH_RESULTS).map((command, index) => ({
    id: `slash:${command.name}`,
    action: { kind: "slash", command: command.name } as const,
    title: command.usage,
    description: command.description,
    category: "chat" as const,
    group: "messages" as const,
    score: 320 - index,
    kind: "action" as const,
    icon: "command" as const,
  }));
}

export function buildOmnibarContextResults({
  activeChat,
  activeChatId,
  activeEditorField,
  agents,
  allLocalResults,
  characterNameById,
  connectionById,
  lastAppError,
  lorebooks,
  mariEnabled,
  omnibarSuggestionsEnabled,
  openAgentId,
  openCharacterId,
  openConnectionId,
  openLorebookId,
  openPersonaId,
  openPresetId,
  personaById,
  personas,
  presets,
  surface,
  t,
}: OmnibarContextResultsInput): OmnibarResult[] {
  const out: OmnibarResult[] = [];
  const push = (result: OmnibarResult) => {
    if (!out.some((item) => item.id === result.id)) out.push(result);
  };
  const nameOf = (map: ReadonlyMap<string, unknown>, id: string) => readNamedRow(map.get(id))?.name;
  const listName = (list: readonly unknown[] | undefined, id: string) =>
    readNamedRow((list ?? []).find((item) => readNamedRow(item)?.id === id))?.name;
  const canonicalById = new Map(allLocalResults.map((result) => [result.id, result]));
  const pushCanonical = (id: string, fallback: OmnibarResult) => {
    const result = canonicalById.get(id);
    push({ ...fallback, ...(result ?? {}), title: fallback.title, group: "current-work", score: 0 });
  };

  const isActiveChat = activeChat?.id === activeChatId;
  const isActiveChatSurface = surface === "chat" && isActiveChat;
  // A visible failure is the most useful next step, so it leads the group. The
  // id must stay the real connection id so the existing connection branch in
  // choose() opens the right editor (and still honours the dirty-editor guard).
  if (lastAppError?.retry) {
    pushCanonical(`connection:${lastAppError.retry.id}`, {
      id: `connection:${lastAppError.retry.id}`,
      title: lastAppError.action
        ? t("commandCenter.context.fixFailed", "Fix: {{action}} failed", { action: lastAppError.action })
        : t("commandCenter.context.fixError", "Fix the last error"),
      description: lastAppError.message,
      category: "connection",
      score: 0,
      icon: "connection",
    });
  }

  if (!isActiveChatSurface) {
    if (omnibarSuggestionsEnabled && mariEnabled && activeEditorField) {
      push({
        id: "suggestion:edit-focused-field",
        title: t("commandCenter.suggestions.editFocusedField", "Improve {{field}} with Mari", {
          field: activeEditorField.label,
        }),
        description: t(
          "commandCenter.suggestions.editFocusedFieldDescription",
          "Ask Mari to suggest a useful change for the selected field.",
        ),
        category: "professor",
        score: 460,
        group: "professor-suggested",
        kind: "action",
        icon: "professor",
      });
    }
    if (openCharacterId) {
      const name = characterNameById.get(openCharacterId);
      if (name)
        pushCanonical(`character:${openCharacterId}`, {
          id: `character:${openCharacterId}`,
          title: t("commandCenter.context.editing", "Editing {{name}}", { name }),
          category: "character",
          target: { kind: "resource", resource: "character", id: openCharacterId },
          score: 0,
          icon: "character",
        });
    }
    for (const [id, kind, list, icon] of [
      [openPersonaId, "persona", personas, "persona"],
      [openLorebookId, "lorebook", lorebooks, "lorebook"],
      [openPresetId, "preset", presets, "preset"],
      [openAgentId, "agent", agents, "agent"],
    ] as const) {
      if (!id) continue;
      const name = listName(list, id);
      if (!name) continue;
      pushCanonical(`${kind}:${id}`, {
        id: `${kind}:${id}`,
        title: t("commandCenter.context.editing", "Editing {{name}}", { name }),
        category: kind,
        target: { kind: "resource", resource: kind, id },
        score: 0,
        icon,
      });
    }
    if (openConnectionId) {
      const name = connectionById.get(openConnectionId)?.name;
      if (name)
        pushCanonical(`connection:${openConnectionId}`, {
          id: `connection:${openConnectionId}`,
          title: t("commandCenter.context.editing", "Editing {{name}}", { name }),
          category: "connection",
          score: 0,
          icon: "connection",
        });
    }
  }
  if (isActiveChat && activeChat) {
    pushCanonical(`chat:${activeChat.id}`, {
      id: `chat:${activeChat.id}`,
      title: t("commandCenter.context.currentChat", "Current chat: {{name}}", { name: activeChat.name }),
      category: "chat",
      target: { kind: "chat", chatId: activeChat.id },
      score: 0,
      icon: "chats",
    });
    for (const characterId of getChatCharacterIds(activeChat)) {
      const name = characterNameById.get(characterId);
      if (!name) continue;
      pushCanonical(`character:${characterId}`, {
        id: `character:${characterId}`,
        title: name,
        category: "character",
        target: { kind: "resource", resource: "character", id: characterId },
        score: 0,
        icon: "character",
      });
    }
    if (activeChat.personaId) {
      const name = nameOf(personaById, activeChat.personaId);
      if (name)
        pushCanonical(`persona:${activeChat.personaId}`, {
          id: `persona:${activeChat.personaId}`,
          title: name,
          category: "persona",
          target: { kind: "resource", resource: "persona", id: activeChat.personaId },
          score: 0,
          icon: "persona",
        });
    }
    if (activeChat.promptPresetId) {
      const name = listName(presets, activeChat.promptPresetId);
      if (name)
        pushCanonical(`preset:${activeChat.promptPresetId}`, {
          id: `preset:${activeChat.promptPresetId}`,
          title: name,
          category: "preset",
          target: { kind: "resource", resource: "preset", id: activeChat.promptPresetId },
          score: 0,
          icon: "preset",
        });
    }
    if (activeChat.connectionId) {
      const name = connectionById.get(activeChat.connectionId)?.name;
      if (name)
        pushCanonical(`connection:${activeChat.connectionId}`, {
          id: `connection:${activeChat.connectionId}`,
          title: name,
          category: "connection",
          score: 0,
          icon: "connection",
        });
    }
    const activeLorebooks = deriveActiveLorebookViews({
      activeLorebookIds: getChatActiveLorebookIds(activeChat),
      excludedLorebookIds: getChatExcludedLorebookIds(activeChat),
      dropExcluded: true,
      chat: activeChat,
      lorebooks: lorebooks ?? [],
    });
    for (const lorebook of activeLorebooks) {
      pushCanonical(`lorebook:${lorebook.id}`, {
        id: `lorebook:${lorebook.id}`,
        title: lorebook.name,
        category: "lorebook",
        target: { kind: "resource", resource: "lorebook", id: lorebook.id },
        score: 0,
        icon: "lorebook",
      });
    }
    const chatMetadata = parseChatMetadata(activeChat.metadata);
    if (chatMetadata.enableAgents === true) {
      const activeAgentIds = Array.isArray(chatMetadata.activeAgentIds)
        ? chatMetadata.activeAgentIds.filter((id): id is string => typeof id === "string")
        : [];
      for (const agentId of activeAgentIds) {
        const agent = agents?.find((item) => item.id === agentId || item.type === agentId);
        if (!agent) continue;
        pushCanonical(`agent:${agent.type}`, {
          id: `agent:${agent.type}`,
          title: agent.name,
          category: "agent",
          target: { kind: "resource", resource: "agent", id: agent.type },
          score: 0,
          icon: "agent",
        });
      }
    }
  }
  return out;
}

/** Which omnibar categories map onto a chat-attachable resource kind. */
const ADD_RESOURCE_KINDS: Partial<Record<OmnibarCategory, ChatResourceDragKind>> = {
  character: "character",
  persona: "persona",
  lorebook: "lorebook",
  preset: "preset",
  connection: "connection",
  agent: "agent",
};
const MAX_ADD_SUGGESTIONS = 5;
/**
 * Browsing a kind ("add character ") is a picker, not a guess, so every row
 * should be attachable — a list where the first five attach and the rest open
 * the editor reads as broken.
 */
const MAX_ADD_SUGGESTIONS_BROWSING = 40;
/**
 * Above the plain entity rows for the same names, so the explicit
 * "Add X to this chat" row is what Enter lands on.
 */
const ADD_SUGGESTION_SCORE = 470;

/**
 * Turns "add Eliza" into a real, labelled row instead of relying on the ranked
 * character row secretly doing an attach. Reads the already-ranked search
 * results rather than re-deriving entities, so it inherits their media, icons
 * and matching.
 */
/** Below `ADD_SUGGESTION_SCORE`, so concrete "Add Eliza" rows lead and the kind rows follow as the fallback. */
const VERB_SUGGESTION_SCORE = 460;
const MAX_REMOVAL_SUGGESTIONS = 8;
/** Matches the add rows, so both verbs put their concrete options in the same place. */
const REMOVAL_SUGGESTION_SCORE = 470;

/**
 * Answers a bare verb — "add", "open", "enable" — with what can follow it.
 *
 * Two shapes, chosen by how many objects the verb can take. An unbounded verb
 * ("add" can attach any of hundreds of characters) offers the object *kinds*,
 * and choosing one refines the query rather than acting, so the next keystroke
 * narrows instead of restarting. A bounded verb ("enable" has ten toggles,
 * "create" has six kinds) lists the objects themselves and acts on Enter.
 *
 * "remove" is bounded too, but `buildOmnibarRemovalSuggestions` already lists
 * the attached characters for a bare verb, so it is deliberately not repeated
 * here.
 */
export function buildOmnibarVerbSuggestions({
  allLocalResults,
  deferredQuery,
}: OmnibarVerbSuggestionsInput): OmnibarResult[] {
  const intent = isOmnibarRefinableVerb(deferredQuery);
  if (!intent) return [];
  const bounded = (rows: readonly OmnibarResult[]) =>
    rows.slice(0, 10).map((result, index) => ({
      ...result,
      score: VERB_SUGGESTION_SCORE - index,
      group: "current-work" as const,
    }));
  const createRows = () => allLocalResults.filter((result) => /^(?:create|import)-/.test(result.id));
  // "open"/"show" is answered by the ranked entity rows themselves.
  if (["open", "show", "go to"].includes(intent.verb)) return [];
  // Bounded verbs: list the objects themselves, because they all fit. "remove"
  // is bounded too, but `buildOmnibarRemovalSuggestions` already owns it.
  if (["create", "new", "import"].includes(intent.verb)) return bounded(createRows());
  if (["enable", "disable", "turn on", "turn off"].includes(intent.verb))
    return bounded(allLocalResults.filter((result) => result.control?.type === "toggle"));
  return [];
}

export function buildOmnibarAddSuggestions({
  activeChat,
  attachedResultIds,
  deferredQuery,
  omnibarSuggestionsEnabled,
  searchResults,
  t,
}: OmnibarAddSuggestionsInput): OmnibarResult[] {
  if (!omnibarSuggestionsEnabled || !activeChat || !isOmnibarAddIntent(deferredQuery)) return [];
  const browsingKind = Boolean(parseOmnibarIntent(deferredQuery)?.objectCategory);
  const limit = browsingKind ? MAX_ADD_SUGGESTIONS_BROWSING : MAX_ADD_SUGGESTIONS;
  const out: OmnibarResult[] = [];
  for (const result of searchResults) {
    if (out.length >= limit) break;
    const resource = ADD_RESOURCE_KINDS[result.category];
    if (!resource || attachedResultIds.has(result.id)) continue;
    // Entity rows are `<category>:<id>`. Control and command rows are not, and
    // must never be offered as something to attach.
    if (!result.id.startsWith(`${result.category}:`)) continue;
    const resourceId = result.id.slice(result.category.length + 1);
    if (!resourceId) continue;
    out.push({
      id: `action:add-to-chat:${result.id}`,
      action: { kind: "add-to-chat", resource, resourceId, label: result.title } as const,
      title: t("commandCenter.actions.addToChat", "Add {{name}} to this chat", { name: result.title }),
      description: t("commandCenter.actions.addToChatDescription", "Attach it to {{chat}} now.", {
        chat: activeChat.name,
      }),
      category: result.category,
      media: result.media,
      score: ADD_SUGGESTION_SCORE - out.length,
      kind: "action" as const,
      icon: result.icon,
      group: "current-work" as const,
    });
  }
  return out;
}

/**
 * Answers "remove" with everything currently attached to the open chat —
 * characters, persona, preset, connection, lorebooks, agents — not just
 * characters. The list is read from the chat context rows, which are already
 * derived from live chat state, so it never drifts from what is actually on.
 *
 * A bare "remove" lists all of it; "remove eliza" narrows by name.
 */
export function buildOmnibarRemovalSuggestions({
  activeChat,
  attachedResultIds,
  contextResults,
  deferredQuery,
  omnibarSuggestionsEnabled,
  t,
}: OmnibarRemovalSuggestionsInput): OmnibarResult[] {
  if (!omnibarSuggestionsEnabled || !activeChat || !isOmnibarRemovalIntent(deferredQuery)) return [];
  const target = normalizeTextForMatch(parseOmnibarIntent(deferredQuery)?.targetQuery ?? "");
  const out: OmnibarResult[] = [];
  for (const result of contextResults) {
    if (out.length >= MAX_REMOVAL_SUGGESTIONS) break;
    const resource = ADD_RESOURCE_KINDS[result.category];
    if (!resource || !attachedResultIds.has(result.id)) continue;
    if (!result.id.startsWith(`${result.category}:`)) continue;
    if (target && !normalizeTextForMatch(result.title).includes(target)) continue;
    out.push({
      id: `action:detach-from-chat:${result.id}`,
      action: {
        kind: "detach-from-chat",
        resource,
        resourceId: result.id.slice(result.category.length + 1),
        label: result.title,
      } as const,
      title: t("commandCenter.actions.removeFromChat", "Remove {{name}} from this chat", { name: result.title }),
      description: t("commandCenter.actions.removeFromChatDescription", "Detach it from {{chat}}.", {
        chat: activeChat.name,
      }),
      category: result.category,
      media: result.media,
      score: REMOVAL_SUGGESTION_SCORE - out.length,
      kind: "action" as const,
      icon: result.icon,
      group: "current-work" as const,
    });
  }
  return out;
}

export type OmnibarApprovalDecision = "keep" | "restore";

export type OmnibarApprovalResultsInput = {
  approvals: readonly MariWorkspacePendingApproval[] | undefined;
  t: OmnibarTranslate;
  pendingId: string | null;
  onDecide: (id: string, decision: OmnibarApprovalDecision) => void;
  /** When set, only approvals whose title or aliases contain it are returned. */
  query?: string;
};

/**
 * One row per approval Mari is waiting on.
 *
 * A database approval is already applied, so keeping or restoring it are both
 * reversible and both happen in place, on the ordinary `choice` control every
 * other in-place row uses. The words match the Work pane's cards on purpose.
 *
 * A dependency install or a sensitive file write has *not* run yet: approving
 * one installs a package or writes the file. Those rows carry no control and
 * open the Work pane instead, where the card shows the integrity hash or the
 * file diff before anything executes.
 */
export function buildOmnibarApprovalResults({
  approvals,
  t,
  pendingId,
  onDecide,
  query,
}: OmnibarApprovalResultsInput): OmnibarResult[] {
  if (!approvals?.length) return [];
  const needle = normalizeTextForMatch(query ?? "");
  const rows = approvals.map((approval) => {
    const reason = approval.reason?.trim() || undefined;
    let title: string;
    let description: string | undefined;
    let facts: { label: string; value: string }[];
    let keepLabel: string;
    let restoreLabel: string;
    let terms: string[];

    if (approval.kind === "dependency_install") {
      const packageLabel = `${approval.packageName}@${approval.version}`;
      title = t("commandCenter.approval.dependencyTitle", "Mari wants to install {{package}}", {
        package: packageLabel,
      });
      description =
        reason ??
        t(
          "commandCenter.approval.dependencyDescription",
          "An exact public npm package, installed without lifecycle scripts.",
        );
      facts = [
        { label: t("commandCenter.approval.package", "Package"), value: packageLabel },
        { label: t("commandCenter.approval.target", "Target"), value: approval.target },
        { label: t("commandCenter.approval.dependencyType", "Type"), value: approval.dependencyType },
      ];
      keepLabel = t("commandCenter.approval.install", "Install");
      restoreLabel = t("commandCenter.approval.notNow", "Not now");
      terms = [approval.packageName, packageLabel, approval.target];
    } else if (approval.kind === "sensitive_file") {
      title = t("commandCenter.approval.fileTitle", "Mari wants to write {{path}}", { path: approval.path });
      description = reason ?? approval.preview.slice(0, 160);
      facts = [
        { label: t("commandCenter.approval.path", "Path"), value: approval.path },
        { label: t("commandCenter.approval.changeType", "Change"), value: approval.changeType },
      ];
      keepLabel = t("commandCenter.approval.apply", "Apply");
      restoreLabel = t("commandCenter.approval.discard", "Discard");
      terms = [approval.path, approval.changeType];
    } else {
      const tables = Object.keys(approval.affectedTables).join(", ");
      title = tables
        ? t("commandCenter.approval.databaseTitle", "Mari changed {{tables}}", { tables })
        : t("commandCenter.approval.databaseTitleGeneric", "Mari changed your app data");
      description =
        reason ??
        t(
          "commandCenter.approval.databaseDescription",
          "Mari already applied this. Keep it, or restore the previous snapshot.",
        );
      facts = [
        ...(tables ? [{ label: t("commandCenter.approval.tables", "Tables"), value: tables }] : []),
        { label: t("commandCenter.approval.rows", "Rows"), value: String(approval.affectedRows) },
        ...(approval.command
          ? [{ label: t("commandCenter.approval.command", "Command"), value: approval.command }]
          : []),
      ];
      keepLabel = t("commandCenter.approval.keep", "Keep");
      restoreLabel = t("commandCenter.approval.restore", "Restore");
      terms = Object.keys(approval.affectedTables);
    }

    // Approving these two executes; the row is a door to the card, not a switch.
    const decidesInPane = approval.kind === "dependency_install" || approval.kind === "sensitive_file";
    return {
      id: `mari-approval:${approval.id}`,
      title,
      description,
      // So a waiting decision is still reachable once the user has typed.
      aliases: [
        t("commandCenter.approval.alias", "pending approval"),
        t("commandCenter.approval.aliasMari", "mari waiting"),
        ...terms,
      ],
      category: "professor" as const,
      // Above the "Mari is working" row: a decision she is blocked on outranks a
      // report of what she is doing.
      score: 480,
      group: "continue" as const,
      kind: "action" as const,
      icon: "professor" as const,
      ...(decidesInPane
        ? {}
        : {
            control: {
              type: "choice" as const,
              label: t("commandCenter.approval.decide", "Mari is waiting on you"),
              // No option is selected yet: the row is the question, not a setting.
              value: pendingId === approval.id ? "pending" : "",
              options: [
                { value: "keep", label: keepLabel },
                { value: "restore", label: restoreLabel },
              ],
              onChange: (value: string | boolean) => {
                if (value === "keep" || value === "restore") onDecide(approval.id, value);
              },
            },
          }),
      preview: () => ({
        kind: "docs" as const,
        title,
        categoryLabel: t("commandCenter.approval.categoryLabel", "Waiting for you"),
        description,
        facts: decidesInPane
          ? [
              ...facts,
              {
                label: t("commandCenter.approval.decideIn", "Decide in"),
                value: t("commandCenter.approval.workPane", "Mari's Work pane"),
              },
            ]
          : facts,
      }),
    };
  });
  if (!needle) return rows;
  return rows.filter((row) =>
    [row.title, ...(row.aliases ?? [])].some((value) => normalizeTextForMatch(value).includes(needle)),
  );
}

export function buildOmnibarContinueResult({
  mariEnabled,
  t,
  workspaceStatus,
  mariFinished,
}: OmnibarContinueResultInput): OmnibarResult | null {
  if (!mariEnabled) return null;
  const status = workspaceStatus;
  const hasPendingApprovals = (status?.pendingApprovals.length ?? 0) > 0;
  if (!hasPendingApprovals && !status?.active && !mariFinished) return null;
  const title = status?.active
    ? t("commandCenter.continueMariActive", "Mari is working")
    : mariFinished
      ? t("commandCenter.continueMariFinished", "Mari finished your task")
      : hasPendingApprovals
        ? t("commandCenter.continueMariReview", "Review Mari's pending work")
        : t("commandCenter.continueMari", "Continue with Professor Mari");
  const description = status?.active
    ? t("commandCenter.continueMariActiveDescription", "Return to the active Mari workspace.")
    : mariFinished
      ? t("commandCenter.continueMariFinishedDescription", "Open the Work pane to see what she did.")
      : hasPendingApprovals
        ? t("commandCenter.continueMariReviewDescription", "Mari is waiting for your review.")
        : t("commandCenter.continueMariDescription", "Open Mari with the current work attached.");
  return {
    id: "ask-professor-mari",
    title,
    category: "professor",
    description,
    score: 140,
    group: "continue",
    kind: "action",
    icon: "professor",
  };
}
