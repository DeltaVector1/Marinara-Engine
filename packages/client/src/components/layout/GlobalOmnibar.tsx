import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type {
  Character,
  Chat,
  ChatMode,
  Message,
  ProfessorMariAskContext,
  ProfessorMariEntryPoint,
} from "@marinara-engine/shared";
import { chatIdForMariSession, matchOmnibarCapabilityAgentPackageIds } from "@marinara-engine/shared";
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Compass,
  Edit3,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserMinus,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { checkReply } from "../../lib/reply-checkup";
import { useAgentConfigs } from "../../hooks/use-agents";
import { useCharacter, useCharacters, usePersonas } from "../../hooks/use-characters";
import {
  chatKeys,
  useChats,
  useChatMessageCount,
  useChatMessagePeek,
  useChatMessageSearchSource,
  useProfessorMariChats,
  useUpdateChat,
  useUpdateChatMetadata,
} from "../../hooks/use-chats";
import { useGlobalChatSearch } from "../../hooks/use-chat-insights";
import { openGlobalSearch } from "../../lib/chat-insights";
import {
  requestChatLorebookEntriesOpen,
  requestChatReplyCheckup,
  requestChatRegenerate,
  requestChatRetryWithConnection,
  requestChatSearchOpen,
  requestChatSummaryOpen,
} from "../../lib/chat-floating-ui-events";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { useConnections } from "../../hooks/use-connections";
import { useStartNewChatMode } from "../../hooks/use-start-new-chat-mode";
import { useInstalledCapabilityPackages } from "../../hooks/use-capability-packages";
import { dispatchCardAssetInsert } from "../../lib/card-asset-links";
import { HOME_FAQ_ITEMS, getFaqSearchText } from "../chat/HomeFaq";
import { useDocsCommandSearchProvider } from "../../hooks/use-docs-command-search";
import {
  lorebookKeys,
  useLorebookEntrySearch,
  useLorebooks,
  useLorebookEntries,
  useUpdateLorebook,
  type ActiveLorebookScan,
} from "../../hooks/use-lorebooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildMariArrival,
  mariThreadContextFor,
  isMariReplyFailure,
  mariFallbackFocus,
  mariFixRowId,
  type MariArrivalAction,
} from "../../lib/mari-arrival";
import { getOmnibarSettingsDestinations } from "../../lib/omnibar-settings";
import { isOmnibarSettingsTarget } from "../../lib/settings-registry";
import { usePresets, useSetDefaultPreset } from "../../hooks/use-presets";
import { useProfessorMariWorkspaceStatus } from "../../hooks/use-professor-mari-workspace-status";
import { useOmnibarAside } from "../../hooks/use-omnibar-aside";
import { omnibarAsideHandoffAnswer } from "../../lib/omnibar-aside-text";
import { expandChoiceRows, readChoiceOptionId } from "../../lib/omnibar-choice-rows";
import {
  clearOmnibarFrecencyHistory,
  readOmnibarFrecencyEntries,
  recordOmnibarFrecencyUse,
  topFrecentResultIds,
  type OmnibarFrecencyEntry,
} from "../../lib/omnibar-frecency";
import { useMariApprovals } from "../../hooks/use-mari-approvals";
import { getCharacterDisplayIdentity } from "../../lib/character-display";
import { completeInline } from "../../lib/inline-completion";
import { parseChatMetadata } from "../../lib/chat-display";
import { isLanguageGenerationConnection } from "../../lib/connection-filters";
import { resolveChatResourceDropAction } from "../../lib/chat-resource-drop-capabilities";
import { chatResourceBlockedKey } from "../chat/ChatResourceDropOverlay";
import {
  deriveActiveLorebookViews,
  getChatActiveLorebookIds,
  getChatExcludedLorebookIds,
} from "../../lib/chat-lorebooks";
import { getChatCharacterIds } from "../../lib/chat-macros";
import {
  requestChatResourceAssignment,
  type ChatResourceDragKind,
  type ChatResourceDragPayload,
} from "../../lib/chat-resource-drag";
import {
  COMMAND_CENTER_CATEGORY_FILTERS,
  presentCommandCenterResults,
  rankCommandResults,
  readCommandCenterSessionState,
  readCommandRankingState,
  advanceMariHandoff,
  isApplePlatform,
  isAskMariShortcut,
  recordCommandUse,
  writeCommandRankingState,
  writeCommandCenterSessionState,
  type CommandCenterCategoryFilter,
  type CommandCenterSessionState,
  type CommandCenterResultGroupId,
  type CommandRankingState,
} from "../../lib/command-center";
import { createSystemCommandDefinitions } from "../../lib/command-center-system-commands";
import { chatResultType, getCommandIcon, RESULT_TYPE_ICONS, type ResultType } from "../../lib/command-icons";
import {
  createOmnibarContext,
  resolveOmnibarScreen,
  filterOmnibarFuzzyFallback,
  getOmnibarActiveChatContextResultIds,
  isDirectActiveChatAction,
  resultOpensDirectlyOnTap,
  parseOmnibarIntent,
  type OmnibarAction,
  type OmnibarCategory,
  type OmnibarResult,
} from "../../lib/omnibar-search";
import {
  MIN_MESSAGE_SEARCH_LENGTH,
  buildOmnibarChatControlResults,
  buildOmnibarContextResults,
  buildOmnibarApprovalResults,
  buildOmnibarContinueResult,
  buildOmnibarControlResults,
  buildOmnibarGlobalMessageResults,
  buildOmnibarLorebookEntryResults,
  findMentionedResults,
  buildOmnibarMariChatResults,
  buildOmnibarMessageResults,
  buildOmnibarAddSuggestions,
  buildOmnibarVerbSuggestions,
  buildOmnibarIntentShortcuts,
  buildOmnibarNewChatCommands,
  CHAT_CONTEXT_MAX_RESULTS,
  buildOmnibarRemovalSuggestions,
  buildOmnibarSearchResults,
  buildOmnibarSlashResults,
} from "../../lib/omnibar-results";
import { isMariInstruction, matchesOmnibarScope, omnibarScopePrefix, parseOmnibarScope } from "../../lib/omnibar-scope";
import {
  buildOmnibarAgentRows,
  buildOmnibarCharacterRows,
  buildOmnibarChatRows,
  buildOmnibarConnectionRows,
  buildOmnibarLorebookRows,
  buildOmnibarPersonaRows,
  buildOmnibarPresetRows,
} from "../../lib/omnibar-entity-rows";
import { reconcileActiveResultId, resolveOmnibarRowState } from "../../lib/omnibar-row-state";
import {
  activatePersonalExtensionCommand,
  usePersonalExtensionCommands,
} from "../../lib/personal-extension-contributions";
import { omnibarCompletionActions, type OmnibarCompletionAction } from "../../lib/omnibar-completion-actions";
import { buildProfessorMariCommandCenterContext } from "../../lib/professor-mari-command-center-context";
import {
  consumeProfessorMariOpenRequest,
  peekProfessorMariOpenRequest,
  PROFESSOR_MARI_OPEN_EVENT,
  type ProfessorMariOpenDetail,
} from "../../lib/professor-mari-open";
import type { ProfessorMariNavigationTarget } from "../../lib/professor-mari-navigation";
import { executeStateNavigation } from "../../lib/state-navigation";
import { isPullHandoffPending, takePullHandoff } from "../../lib/pull-to-open";
import { measureOmnibarFirstResultPaint } from "../../lib/omnibar-open-timing";
import { hasEditorLeaveHandler } from "../../lib/editor-leave";
import { cn } from "../../lib/utils";
import { useLocalizedUiText } from "../../localization/use-localized-ui-text";
import { useChatStore } from "../../stores/chat.store";
import { isMessageHiddenFromUser } from "../../lib/chat-message-visibility";
import { normalizeTextForMatch } from "@marinara-engine/shared";
import { useSidecarStore } from "../../stores/sidecar.store";
import { useUIStore } from "../../stores/ui.store";
import { useShallow } from "zustand/react/shallow";
import { OMNIBAR_SETTINGS_TOGGLE_BINDINGS } from "../../lib/omnibar-settings-toggle-bindings";
import { CommandCenterActionValue } from "../command-center/CommandCenterActionValue";
import { InlineGhostText } from "../ui/InlineGhostText";
import { CommandCenterResultRow } from "../command-center/CommandCenterResultRow";
import { useHomeFeed } from "../../hooks/use-home-feed";
import { ResultTypeIcon } from "../command-center/ResultTypeIcon";
import { CommandCenterSegmentedChoice } from "../command-center/CommandCenterSegmentedChoice";
import { CommandCenterToggle } from "../command-center/CommandCenterToggle";
import {
  getCommandCenterCategoryVisual,
  getCommandCenterChatModeVisual,
  type CommandCenterCategoryLabels,
  type CommandCenterChatModeLabels,
} from "../command-center/command-center-visuals";
import type { CommandCenterPreviewFact } from "../command-center/command-result-preview.types";
import { OmnibarSettingsButton, OmnibarSettingsSheet } from "./omnibar/OmnibarSettingsMenu";
import {
  getOmnibarResourceId,
  isRichResult,
  FILTER_CATEGORY,
  OMNIBAR_SCOPE_CHIP_FILTERS,
  readNamedRow,
  resultMetadata,
  type OmnibarPane,
  type RankedOmnibarResult,
} from "./omnibar/omnibar-result-view";
// Each pane only renders once the user opens it, so they stay out of the
// initial AppShell chunk.
const OmnibarDetailPane = lazy(() =>
  import("./omnibar/OmnibarDetailPane").then((m) => ({ default: m.OmnibarDetailPane })),
);
const OmnibarMariPane = lazy(() => import("./omnibar/OmnibarMariPane").then((m) => ({ default: m.OmnibarMariPane })));
const OmnibarAside = lazy(() => import("./omnibar/OmnibarAside").then((m) => ({ default: m.OmnibarAside })));

const PROFESSOR_MARI_DRAFT_KEY = "__home_professor_mari__";

/** Categories whose result rows open an editor rather than the thing itself. */
const EDITOR_CATEGORIES = new Set<OmnibarCategory>([
  "character",
  "persona",
  "lorebook",
  "preset",
  "connection",
  "agent",
]);
/** What Professor Mari can change, and so what a "Continue with Mari" action is offered on. */
/** Chats the empty omnibar offers to switch back to. */
const IDLE_RECENT_CHATS = 4;
const OMNIBAR_CATEGORY_RESULT_TYPE: Partial<Record<OmnibarCategory, ResultType>> = {
  character: "character",
  persona: "persona",
  lorebook: "lorebook",
  preset: "preset",
  connection: "connection",
  agent: "agent",
  settings: "setting",
  docs: "doc",
};
// F3 (O5): the idle frecent group only offers rows that *navigate* somewhere
// (open a chat/entity, or run a navigation command) - never a row that writes
// on Enter, like a settings toggle or a lorebook attach. An empty Ctrl+K must
// never let a reflexive Enter silently flip something just because it was used
// recently; "controls"/"chatControls" rows (settings toggles) all set `control`.
const NAVIGATION_OMNIBAR_ACTION_KINDS = new Set<OmnibarAction["kind"]>([
  "open-mari-chat",
  "goto-message",
  "open-docs",
  "open-faq",
  "open-global-search",
  "open-lorebook-entry",
  "start-character-chat",
  "start-chat",
]);
const isNavigationOmnibarResult = (result: Pick<OmnibarResult, "control" | "action">) =>
  !result.control && (!result.action || NAVIGATION_OMNIBAR_ACTION_KINDS.has(result.action.kind));
/**
 * K5's last flip, kept past the dialog's unmount so Mari's arrival in Settings can offer the same Undo
 * as the toast. ponytail: one slot, cleared by either Undo; a flip made in the Settings panel itself
 * is not tracked here.
 */
let lastSettingFlip: { label: string; undo: () => void } | null = null;
const MARI_EDITABLE_CATEGORIES = new Set<OmnibarCategory>(["chat", "character", "persona", "lorebook", "preset"]);
const MARI_APPROVAL_PREFIX = "mari-approval:";
// R9: this row carries a choice control (Keep/Restore) for quick action, but the row body
// itself must still navigate to that specific review on click/Enter instead of expanding a
// choice accordion like an ordinary settings picker does.
const isMariApprovalRow = (result: Pick<OmnibarResult, "id">) => result.id.startsWith(MARI_APPROVAL_PREFIX);

/**
 * Categories that can be attached to (or detached from) the open chat, mapped to
 * the drag payload kind that carries them. One table: every attach path — a row,
 * a preview action, a drop — has to agree on what is attachable.
 */
const CHAT_RESOURCE_KIND: Partial<Record<OmnibarCategory, ChatResourceDragKind>> = {
  character: "character",
  persona: "persona",
  lorebook: "lorebook",
  preset: "preset",
  connection: "connection",
  agent: "agent",
};
/**
 * Choosing one of these picks it for the active chat and is a complete
 * action, not a step in browsing, so it closes the omnibar like any other row
 * (O4 item 4) instead of leaving the user to press Esc.
 */
const CHAT_SCOPED_CHOICE_CONTROL_IDS = new Set([
  "control:chat-connection",
  "control:chat-preset",
  "control:chat-persona",
]);

// Leading resource-kind words to strip from a "create <kind> <name>" query so the
// create modal opens with just the typed name pre-filled.
const CREATE_MODAL_KIND_WORDS: Record<string, readonly string[]> = {
  "create-character": ["character", "card"],
  "create-persona": ["persona", "profile"],
  "create-lorebook": ["lorebook", "world book", "world info", "worldbook"],
  "create-preset": ["preset", "prompt preset"],
};

function createModalPrefillName(modal: string, query: string): string | undefined {
  const words = CREATE_MODAL_KIND_WORDS[modal];
  if (!words) return undefined;
  const intent = parseOmnibarIntent(query);
  if (intent?.kind !== "create") return undefined;
  let name = intent.targetQuery.trim();
  for (const word of words) {
    const stripped = name.replace(new RegExp(`^${word}\\b\\s*`, "i"), "").trim();
    if (stripped !== name) {
      name = stripped;
      break;
    }
  }
  return name || undefined;
}

/**
 * Tier-2 preview data: fetched lazily only for the one focused result, gated by
 * a short focus dwell so arrow-key scrubbing does not fire a request per row.
 * React Query caches by id, so re-focusing a result is instant.
 */
function usePreviewDetail(previewResult: RankedOmnibarResult | null): {
  extraFacts: CommandCenterPreviewFact[];
  note: string | null;
  detailLoading: boolean;
} {
  const { t } = useTranslation();
  const category = previewResult?.category;
  const resourceId = previewResult ? previewResult.id.slice(previewResult.id.indexOf(":") + 1) : "";

  const [settledId, setSettledId] = useState<string | null>(null);
  useEffect(() => {
    if (!previewResult) {
      setSettledId(null);
      return;
    }
    const id = previewResult.id;
    const timer = window.setTimeout(() => setSettledId(id), 160);
    return () => window.clearTimeout(timer);
  }, [previewResult]);
  const settled = !!previewResult && settledId === previewResult.id;

  const chatId = category === "chat" && settled ? resourceId : null;
  const lorebookId = category === "lorebook" && settled ? resourceId : null;
  // Characters are the most-used kind and had no lazy detail at all.
  const characterId = category === "character" && settled ? resourceId : null;

  const peek = useChatMessagePeek(chatId, 1, !!chatId);
  const messageCount = useChatMessageCount(chatId);
  const entries = useLorebookEntries(lorebookId);
  const character = useCharacter(characterId);

  if (chatId) {
    const extraFacts: CommandCenterPreviewFact[] =
      typeof messageCount.data?.count === "number"
        ? [{ label: t("commandCenter.preview.messages", "Messages"), value: messageCount.data.count }]
        : [];
    return { extraFacts, note: peek.data?.at(-1)?.content?.trim() || null, detailLoading: peek.isLoading };
  }

  if (characterId) {
    // The route sends the card as a JSON string, so reading `.first_mes` off it directly found nothing.
    const raw = (character.data as { data?: unknown } | undefined)?.data;
    let data: Character["data"] | undefined;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : (raw as Character["data"] | undefined);
    } catch {
      data = undefined;
    }
    const extraFacts: CommandCenterPreviewFact[] = data?.alternate_greetings?.length
      ? [{ label: t("commandCenter.preview.greetings", "Greetings"), value: data.alternate_greetings.length + 1 }]
      : [];
    // The greeting is what the character actually opens with, so it says more
    // about them than the description does.
    return { extraFacts, note: data?.first_mes?.trim() || null, detailLoading: character.isLoading };
  }

  if (lorebookId) {
    const first = entries.data?.[0];
    const note = entries.isLoading
      ? null
      : first
        ? t("commandCenter.preview.entryNote", "{{name}}: {{content}}", {
            name: first.name?.trim() || t("commandCenter.preview.untitledEntry", "Untitled entry"),
            content: first.content?.trim() ?? "",
          })
        : t("commandCenter.preview.noLorebookEntries", "No entries yet");
    return { extraFacts: [], note, detailLoading: entries.isLoading };
  }

  return { extraFacts: [], note: null, detailLoading: false };
}

export function GlobalOmnibarDialog({ onClose }: { onClose: () => void }) {
  const appearance = useMariAppearancePack();
  const { t } = useTranslation();
  const localize = useLocalizedUiText();
  const ui = useUIStore.getState;
  const inputRef = useRef<HTMLInputElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstResultPaintMarked = useRef(false);
  // Opened by the pull-to-open gesture, whose circle pops the panel open: skip the
  // pop-in and hand the panel over before the first paint, so it can be clipped.
  const [fromPull] = useState(isPullHandoffPending);
  // L8: opened over the game setup wizard, the surface is the game setup. The
  // omnibar covers the wizard, so its step cannot change while this is open.
  const [gameSetupStep] = useState(
    () => document.querySelector("[data-game-setup-step]")?.getAttribute("data-game-setup-step") ?? null,
  );
  // Read before this dialog commits, so only another dialog (the wizard, a lightbox, a Modal) counts.
  const [overDialog] = useState(() => document.querySelector('[aria-modal="true"]') !== null);
  useLayoutEffect(() => takePullHandoff()?.(dialogRef.current), []);
  // R33: how far the search field has to fall to land where Mari's composer sits.
  // Measured while the list is still up, because by the time it leaves the field
  // is gone. 0 means "do not travel" - reduced motion, or a phone, where the
  // composer is already pinned above the keyboard and there is nowhere to fall.
  const [inputTravel, setInputTravel] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // The omnibar always reopens on search: closing persists `results` (see the
  // unmount flush below), so the Mari conversation resumes only on explicit
  // re-entry. The normalizer deliberately preserves a persisted `mari` pane,
  // because `GlobalOmnibarHost` hands off an "open Professor Mari" request by
  // writing that pane and then opening; resetting it on read would kill that.
  const [session, setSession] = useState<CommandCenterSessionState>(() => readCommandCenterSessionState());
  const initialQueryRef = useRef(session.query);
  const mariEnabled = useUIStore((state) => state.commandCenterMariEnabled);
  const { query, filter, activeResultId, mariReturnResultId, mariHandoff } = session;
  // Mari can be switched off from the omnibar's settings menu, the Settings panel
  // or a result row, and the first of those is reachable from inside her own pane.
  // Reading the pane through the flag strands nobody: the persisted `mari` pane
  // resolves to the list until Mari is switched back on. Derived rather than an
  // effect, so there is no frame where the disabled pane is still on screen.
  const pane = !mariEnabled && session.pane === "mari" ? "results" : session.pane;
  const mariFinished = mariHandoff?.status === "finished";
  const setSessionValue = <K extends keyof CommandCenterSessionState>(key: K, value: CommandCenterSessionState[K]) =>
    setSession((current) => ({ ...current, [key]: value }));
  const setQuery = (value: string) => setSessionValue("query", value);
  // Keep typing responsive: the heavy search/rank/present pipeline reruns against
  // the deferred query so keystrokes paint immediately on large libraries.
  const rawDeferredQuery = useDeferredValue(query);
  // "faq: import", "msg: dragon" — a typed prefix narrows the result list to one
  // kind. Everything downstream sees only the part after the prefix, so ranking
  // and matching never see the scope word as a search term.
  const { scope: queryScope, query: deferredQuery } = useMemo(
    () => parseOmnibarScope(rawDeferredQuery),
    [rawDeferredQuery],
  );
  const setFilter = (value: CommandCenterCategoryFilter) => setSessionValue("filter", value);
  const setPane = (value: OmnibarPane) => setSessionValue("pane", value);
  const setActiveResultId = (value: string | null) => setSessionValue("activeResultId", value);
  const settingsTarget = useUIStore((state) => state.omnibarSettings);
  const settingsOpen = settingsTarget !== null;
  const openSettings = useUIStore((state) => state.openOmnibarSettings);
  const closeSettings = useUIStore((state) => state.closeOmnibarSettings);
  const [mariChatOpen, setMariChatOpen] = useState(() => session.pane === "mari");
  const [mariMounted, setMariMounted] = useState(() => session.pane === "mari");
  const [mariContext, setMariContext] = useState<ProfessorMariAskContext | null>(
    () => session.mariHandoff?.context ?? null,
  );
  // A counter, not a flag: the same handoff can happen twice with a new query, and
  // a boolean that is already true delivers no change for the child to react to.
  // Matches mariPendingReviewRequest, which solved the same problem.
  const [mariSubmitDraftRequest, setMariSubmitDraftRequest] = useState(0);
  const [mariPendingReviewRequest, setMariPendingReviewRequest] = useState(0);
  // R9: which review the last request targeted, or null for "any" (the generic continue
  // row and the completion action's "Review changes" button, which have no one review in mind).
  const [mariPendingReviewId, setMariPendingReviewId] = useState<string | null>(null);
  // D1: every arrival-door open (⌘J, the pull, the drag, Home's "Ask Professor Mari") bumps this,
  // so the chat can show the arrival at the bottom of her existing transcript when she already has
  // history — the door's whole promise ("ask Mari about this") otherwise goes unmet on return visits.
  const [mariArrivalAppendRequest, setMariArrivalAppendRequest] = useState(0);
  useEffect(() => {
    const pendingDraft = session.mariHandoff?.draft;
    if (!pendingDraft) return;
    useChatStore.getState().setInputDraft(PROFESSOR_MARI_DRAFT_KEY, pendingDraft);
    // Clear it once applied: `mariHandoff` is persisted session state, so leaving
    // the draft in place would write it back into the composer on every future
    // mount, overwriting whatever the user typed since.
    setSession((current) =>
      current.mariHandoff?.draft ? { ...current, mariHandoff: { ...current.mariHandoff, draft: undefined } } : current,
    );
  }, [session.mariHandoff?.draft]);
  // A cold "open Mari and send" request (fired while the omnibar itself was
  // closed) has nobody around to bump `mariSubmitDraftRequest` directly:
  // `GlobalOmnibarHost` wrote the flag straight into the persisted session
  // before this dialog ever mounted. Pick it up once, then clear it.
  useEffect(() => {
    if (!session.mariHandoff?.submitDraft) return;
    setMariSubmitDraftRequest((current) => current + 1);
    setSession((current) =>
      current.mariHandoff?.submitDraft
        ? { ...current, mariHandoff: { ...current.mariHandoff, submitDraft: undefined } }
        : current,
    );
  }, [session.mariHandoff?.submitDraft]);
  // Transient on purpose: reopening the omnibar always starts from a bare list.
  const [expandedChoiceId, setExpandedChoiceId] = useState<string | null>(null);
  // Which row has its preview open. Replaces the detail pane on narrow screens:
  // the row grows, so nothing above it moves and the list never goes away.
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  /**
   * R33: the search field flies down to become Mari's composer, so the surface
   * visibly turns into a conversation instead of being replaced by a different
   * screen.
   *
   * A one-shot ghost rather than a shared `layoutId`: pairing the real elements
   * would leave a layout animation attached to the composer for the rest of the
   * session, and it would then re-animate every time the textarea grew.
   */
  const [fieldFlight, setFieldFlight] = useState<{
    from: { top: number; left: number; width: number; height: number };
    to: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [mariHeaderSlot, setMariHeaderSlot] = useState<HTMLDivElement | null>(null);
  const [mariStatusSlot, setMariStatusSlot] = useState<HTMLSpanElement | null>(null);
  const mariReturnResultIdRef = useRef<string | null>(mariReturnResultId);
  const [ranking, setRanking] = useState<CommandRankingState>(() => readCommandRankingState());
  // O2: local frecency, read once and kept in sync with every recorded use (see recordUse below).
  const [frecencyEntries, setFrecencyEntries] = useState<readonly OmnibarFrecencyEntry[]>(() =>
    readOmnibarFrecencyEntries(),
  );
  const chats = useChats();
  // Q6: the Home feed's last message per recent chat (bounded, cached), for the chat rows' second line.
  const homeFeed = useHomeFeed();
  const latestMessageByChatId = useMemo(
    () =>
      new Map(
        (homeFeed.data?.recentChats ?? []).flatMap(({ chat, latestMessage }) =>
          latestMessage ? [[chat.id, latestMessage] as const] : [],
        ),
      ),
    [homeFeed.data?.recentChats],
  );
  const characters = useCharacters();
  const personas = usePersonas();
  const lorebooks = useLorebooks(undefined, { includeHidden: true });
  const presets = usePresets();
  const connections = useConnections();
  const startNewChatMode = useStartNewChatMode();
  const languageConnections = useMemo(
    () =>
      (connections.data ?? []).flatMap((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const record = value as Record<string, unknown>;
        const row = readNamedRow(record);
        if (
          !row ||
          !isLanguageGenerationConnection({ provider: typeof record.provider === "string" ? record.provider : null })
        ) {
          return [];
        }
        return [{ id: row.id, name: row.name, model: typeof record.model === "string" ? record.model : "" }];
      }),
    [connections.data],
  );
  const agents = useAgentConfigs();
  const updateLorebook = useUpdateLorebook();
  const setDefaultPreset = useSetDefaultPreset();
  // `useMutation` hands back a new result object on every render, so using
  // `updateLorebook`/`setDefaultPreset` themselves as memo deps below would
  // rebuild the row list (and everything ranked from it) on every keystroke
  // and hover instead of only when the underlying data changes. Their
  // `.mutate` functions are stable across renders, same as `patchChat` below.
  const updateLorebookMutate = updateLorebook.mutate;
  const setDefaultPresetMutate = setDefaultPreset.mutate;
  const updateChat = useUpdateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const extensionCommands = usePersonalExtensionCommands();
  const docs = useDocsCommandSearchProvider(query, { enabled: true });
  const theme = useUIStore((state) => state.theme);
  const reduceMotion = useReducedMotion();
  const reduceAmbientEffects = useUIStore((state) => state.reduceAmbientEffects);
  const musicPlayerEnabled = useUIStore((state) => state.musicPlayerEnabled);
  const omnibarSuggestionsEnabled = useUIStore((state) => state.omnibarSuggestionsEnabled);
  const mariWorkspaceStatus = useProfessorMariWorkspaceStatus();
  // Her run keeps going on the server when her pane is closed; the status poll is how the omnibar knows.
  const mariWorkingInBackground = mariWorkspaceStatus.data?.active === true;
  const asideDisclosed = useUIStore((state) => state.omnibarAsideDisclosed);
  const asideConnectionId = useUIStore((state) => state.omnibarAsideConnectionId);
  const setAsideDisclosed = useUIStore((state) => state.setOmnibarAsideDisclosed);
  const setAsideEnabled = useUIStore((state) => state.setOmnibarAsideEnabled);
  const openRightPanel = useUIStore((state) => state.openRightPanel);
  const openAgentCatalog = useUIStore((state) => state.openAgentCatalog);
  const speechToTextEnabled = useUIStore((state) => state.speechToTextEnabled);
  const notificationSoundsOnlyWhenUnfocused = useUIStore((state) => state.notificationSoundsOnlyWhenUnfocused);
  const showTimestamps = useUIStore((state) => state.showTimestamps);
  const showModelName = useUIStore((state) => state.showModelName);
  const showTokenUsage = useUIStore((state) => state.showTokenUsage);
  // One shallow-compared subscription for every settings-registry toggle the
  // omnibar can flip in place, so adding a binding never means adding a hook.
  const settingsToggleValues = useUIStore(
    useShallow((state) => {
      const values: Record<string, boolean> = {};
      for (const id in OMNIBAR_SETTINGS_TOGGLE_BINDINGS) values[id] = OMNIBAR_SETTINGS_TOGGLE_BINDINGS[id].get(state);
      return values;
    }),
  );
  const userStatus = useUIStore((state) => state.userStatus);
  const activeChat = useChatStore((state) => state.activeChat);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const openCharacterId = useUIStore((state) => state.characterDetailId);
  const activeEditorField = useUIStore((state) => state.activeEditorField);
  const lastAppError = useUIStore((state) => state.lastAppError);
  const openPersonaId = useUIStore((state) => state.personaDetailId);
  const openLorebookId = useUIStore((state) => state.lorebookDetailId);
  const openPresetId = useUIStore((state) => state.presetDetailId);
  const openConnectionId = useUIStore((state) => state.connectionDetailId);
  const openAgentId = useUIStore((state) => state.agentDetailId);
  const settingsTab = useUIStore((state) => state.settingsTab);
  const settingsTargetControlId = useUIStore((state) => state.settingsTargetControlId);
  const settingsPanelVisible = useUIStore((state) => state.rightPanelOpen && state.rightPanel === "settings");
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);
  const rightPanel = useUIStore((state) => state.rightPanel);
  const botBrowserOpen = useUIStore((state) => state.botBrowserOpen);
  const gameAssetsBrowserOpen = useUIStore((state) => state.gameAssetsBrowserOpen);
  const characterLibraryOpen = useUIStore((state) => state.characterLibraryOpen);
  const cardLibraryKind = useUIStore((state) => state.cardLibraryKind);
  const agentCatalogOpen = useUIStore((state) => state.agentCatalogOpen);
  const editorDirty = useUIStore((state) => state.editorDirty);

  const idleGreeting = useMemo(() => {
    if (!activeChat) return t("omnibar.hello", "Hi, I'm Mari. Type to search, or ask me anything.");

    const greetings =
      activeChat.mode === "roleplay"
        ? [
            t("omnibar.greetings.roleplay.one", "What should we look into in this roleplay?"),
            t("omnibar.greetings.roleplay.two", "A scene is in progress. What do you need?"),
            t("omnibar.greetings.roleplay.three", "This story is open. What would you like to find?"),
          ]
        : activeChat.mode === "conversation"
          ? [
              t("omnibar.greetings.conversation.one", "What should we look into in this conversation?"),
              t("omnibar.greetings.conversation.two", "Your conversation is open. What do you need?"),
              t("omnibar.greetings.conversation.three", "This chat is open. What would you like to find?"),
            ]
          : [
              t("omnibar.greetings.chat.one", "What should we look into in this chat?"),
              t("omnibar.greetings.chat.two", "Your chat is open. What do you need?"),
              t("omnibar.greetings.chat.three", "A chat is open. What would you like to find?"),
            ];

    const seed = activeChatId ? [...activeChatId].reduce((sum, character) => sum + character.charCodeAt(0), 0) : 0;
    return greetings[seed % greetings.length];
  }, [activeChat, activeChatId, t]);

  const categoryLabels = useMemo<CommandCenterCategoryLabels>(
    () => ({
      navigation: t("omnibar.categories.navigation", "Navigation"),
      chat: t("omnibar.categories.chat", "Chats"),
      character: t("omnibar.categories.character", "Characters"),
      persona: t("omnibar.categories.persona", "Personas"),
      lorebook: t("omnibar.categories.lorebook", "Lorebooks"),
      preset: t("omnibar.categories.preset", "Presets"),
      connection: t("omnibar.categories.connection", "Connections"),
      agent: t("omnibar.categories.agent", "Agents"),
      settings: t("omnibar.categories.settings", "Settings"),
      professor: t("omnibar.categories.professor", "Professor Mari"),
      docs: t("omnibar.categories.docs", "Docs"),
    }),
    [t],
  );
  const chatModeLabels = useMemo<CommandCenterChatModeLabels>(
    () => ({
      conversation: t("home.recentChats.mode.conversation", "Conversation"),
      roleplay: t("home.recentChats.mode.roleplay", "Roleplay"),
      game: t("home.recentChats.mode.game", "Game"),
    }),
    [t],
  );
  const filterLabels = useMemo<Record<CommandCenterCategoryFilter, string>>(
    () => ({
      all: t("commandCenter.filters.all", "All"),
      chats: t("commandCenter.filters.chats", "Chats"),
      characters: t("commandCenter.filters.characters", "Characters"),
      personas: t("commandCenter.filters.personas", "Personas"),
      lorebooks: t("commandCenter.filters.lorebooks", "Lorebooks"),
      presets: t("commandCenter.filters.presets", "Presets"),
      connections: t("commandCenter.filters.connections", "Connections"),
      agents: t("commandCenter.filters.agents", "Agents"),
      settings: t("commandCenter.filters.settings", "Settings"),
      docs: t("commandCenter.filters.docs", "Docs"),
    }),
    [t],
  );
  const groupLabels = useMemo<Record<CommandCenterResultGroupId, string>>(
    () => ({
      context: t("commandCenter.groups.context", "On this screen"),
      "current-work": t("commandCenter.groups.currentWork", "Current work"),
      continue: t("commandCenter.groups.continue", "Continue"),
      frecent: t("commandCenter.groups.frecent", "Frequently used here"),
      recent: t("commandCenter.groups.recent", "Recent"),
      "quick-controls": t("commandCenter.groups.quickControls", "Quick controls"),
      "create-navigation": t("commandCenter.groups.suggested", "Suggested"),
      navigation: t("commandCenter.groups.navigation", "Navigation"),
      messages: t("commandCenter.groups.messages", "Messages"),
      "lorebook-entries": t("commandCenter.groups.lorebookEntries", "Lorebook entries"),
      chats: filterLabels.chats,
      characters: filterLabels.characters,
      personas: filterLabels.personas,
      lorebooks: filterLabels.lorebooks,
      presets: filterLabels.presets,
      connections: filterLabels.connections,
      agents: filterLabels.agents,
      settings: filterLabels.settings,
      docs: filterLabels.docs,
      "professor-suggested": t("commandCenter.groups.mariSuggested", "Professor Mari"),
      "top-hit": t("commandCenter.groups.topHit", "Top hit"),
      "professor-fallback": t("commandCenter.groups.askMari", "Ask Professor Mari"),
    }),
    [filterLabels, t],
  );

  const characterById = useMemo(
    () =>
      new Map(
        (characters.data ?? []).flatMap((item) => {
          const row = readNamedRow(item);
          return row ? [[row.id, item] as const] : [];
        }),
      ),
    [characters.data],
  );
  const characterNameById = useMemo(
    () =>
      new Map(
        (characters.data ?? []).flatMap((item) => {
          const row = readNamedRow(item);
          if (!row) return [];
          const record = item as Record<string, unknown>;
          return [
            [
              row.id,
              getCharacterDisplayIdentity({ data: record.data, comment: record.comment as string | null | undefined }),
            ] as const,
          ];
        }),
      ),
    [characters.data],
  );
  const personaById = useMemo(() => new Map((personas.data ?? []).map((item) => [item.id, item])), [personas.data]);
  const connectionById = useMemo(
    () =>
      new Map(
        (connections.data ?? []).flatMap((item) => {
          const row = readNamedRow(item);
          return row ? [[row.id, row] as const] : [];
        }),
      ),
    [connections.data],
  );

  // Reverse index: which lorebooks are attached to a given character / persona.
  // Lets resource previews surface their real relationships, not just their own row.
  const lorebookLinks = useMemo(() => {
    const byCharacter = new Map<string, string[]>();
    const byPersona = new Map<string, string[]>();
    for (const book of lorebooks.data ?? []) {
      for (const cid of book.characterIds ?? []) {
        byCharacter.set(cid, [...(byCharacter.get(cid) ?? []), book.name]);
      }
      for (const pid of book.personaIds ?? []) {
        byPersona.set(pid, [...(byPersona.get(pid) ?? []), book.name]);
      }
    }
    return { byCharacter, byPersona };
  }, [lorebooks.data]);

  const data = useMemo(() => {
    const commands = [
      {
        id: "home",
        title: t("home.title", "Home"),
        kind: "navigation" as const,
        icon: "home" as const,
        target: { kind: "home" } as const,
        aliases: ["start"],
      },
      {
        id: "chats",
        title: t("ui.layout.chats", "Chats"),
        kind: "navigation" as const,
        icon: "chats" as const,
        target: { kind: "chats" } as const,
      },
      ...createSystemCommandDefinitions((key, fallback) => t(`commandCenter.system.${key}`, fallback)).map(
        (command) => ({
          id: command.id,
          title: command.title,
          kind: command.kind,
          icon: command.icon,
          aliases: command.aliases,
          keywords: command.keywords,
          target: command.target,
          availability: command.availability,
        }),
      ),
      ...extensionCommands.map((command) => ({
        ...command,
        action: { kind: "personal-extension", commandId: command.id } as const,
        target: { kind: "home" } as const,
      })),
    ];
    const chatRows = buildOmnibarChatRows({
      chats: chats.data ?? [],
      characterById,
      connectionById,
      personaById,
      chatModeLabels,
      latestMessageByChatId,
      t,
    });
    const resources = [
      ...buildOmnibarCharacterRows({
        characters: characters.data ?? [],
        lorebookNamesByCharacter: lorebookLinks.byCharacter,
        categoryLabels,
        t,
      }),
      ...buildOmnibarPersonaRows({
        personas: personas.data ?? [],
        lorebookNamesByPersona: lorebookLinks.byPersona,
        categoryLabels,
        t,
      }),
      ...buildOmnibarLorebookRows({
        lorebooks: lorebooks.data ?? [],
        characterNameById,
        personaById,
        categoryLabels,
        t,
        onSetLorebookEnabled: (id, enabled) => updateLorebookMutate({ id, enabled }),
      }),
      ...buildOmnibarPresetRows({
        presets: presets.data ?? [],
        categoryLabels,
        t,
        onSetDefaultPreset: (id) => setDefaultPresetMutate(id),
      }),
      ...buildOmnibarAgentRows({ agents: agents.data ?? [], connectionById, categoryLabels, t }),
    ];
    const connectionRows = buildOmnibarConnectionRows({ connections: connections.data ?? [], categoryLabels, t });
    return {
      commands,
      chats: chatRows,
      resources,
      connections: connectionRows,
      askProfessorTitle: t("omnibar.askProfessorMari"),
    };
  }, [
    agents.data,
    categoryLabels,
    characterById,
    characterNameById,
    characters.data,
    chatModeLabels,
    chats.data,
    connections.data,
    connectionById,
    extensionCommands,
    latestMessageByChatId,
    lorebooks.data,
    lorebookLinks,
    personaById,
    personas.data,
    presets.data,
    setDefaultPresetMutate,
    t,
    updateLorebookMutate,
  ]);

  const controls = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarControlResults({
        localize,
        musicPlayerEnabled,
        notificationSoundsOnlyWhenUnfocused,
        reduceAmbientEffects,
        settingsToggleValues,
        setters: useUIStore.getState(),
        showModelName,
        showTimestamps,
        showTokenUsage,
        speechToTextEnabled,
        t,
        theme,
        userStatus,
      }),
    [
      localize,
      musicPlayerEnabled,
      notificationSoundsOnlyWhenUnfocused,
      reduceAmbientEffects,
      settingsToggleValues,
      showModelName,
      showTimestamps,
      showTokenUsage,
      speechToTextEnabled,
      t,
      theme,
      userStatus,
    ],
  );

  // Chat state as inline controls: the changes a user makes most often are to
  // the chat they are already in — model, preset, persona, agents. These edit
  // the chat in the row, so nothing navigates away from the scene.
  // useMutation returns a fresh object every render, so the memo depends on the
  // stable mutateAsync functions. Depending on the mutation objects would give
  // this list a new identity each render and churn every list derived from it.
  const patchChat = updateChat.mutateAsync;
  const patchChatMetadata = updateChatMetadata.mutateAsync;
  const chatControls = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarChatControlResults({
        activeChat,
        activeChatId,
        connections: data.connections,
        patchChat,
        patchChatMetadata,
        resources: data.resources,
        t,
      }),
    [activeChat, activeChatId, data.connections, data.resources, patchChat, patchChatMetadata, t],
  );

  const searchableEntityResults = useMemo<OmnibarResult[]>(
    () => [
      ...data.chats.map((item) => ({
        id: `chat:${item.id}`,
        title: item.name,
        category: "chat" as const,
        target: { kind: "chat", chatId: item.id } as const,
        score: 1,
        preview: item.preview,
        kind: "chat" as const,
        icon: "chats" as const,
      })),
      ...data.resources.map((item) => ({
        ...item,
        id: `${item.kind}:${item.id}`,
        title: item.name,
        category: item.kind,
        target: { kind: "resource", resource: item.kind, id: item.id } as const,
        score: 1,
        description: item.description,
        preview: item.preview,
        kind: "resource" as const,
        icon: item.kind,
        control: "control" in item ? item.control : undefined,
      })),
      ...data.connections.map((item) => ({
        id: `connection:${item.id}`,
        title: item.name,
        category: "connection" as const,
        target: { kind: "panel", panel: "connections" } as const,
        score: 1,
        preview: item.preview,
        kind: "settings" as const,
        icon: "connection" as const,
      })),
    ],
    [data.chats, data.connections, data.resources],
  );
  const searchableCommandResults = useMemo<OmnibarResult[]>(
    () =>
      data.commands.map((command) => ({
        ...command,
        category: command.kind === "settings" ? ("settings" as const) : ("navigation" as const),
        score: 160,
      })),
    [data.commands],
  );
  const allLocalResults = useMemo(
    () => [...controls, ...chatControls, ...searchableCommandResults, ...searchableEntityResults],
    [chatControls, controls, searchableCommandResults, searchableEntityResults],
  );
  const omnibarContext = useMemo(() => {
    const chatMetadata = activeChat ? parseChatMetadata(activeChat.metadata) : null;
    const activeLorebookIds = activeChat
      ? deriveActiveLorebookViews({
          activeLorebookIds: getChatActiveLorebookIds(activeChat),
          excludedLorebookIds: getChatExcludedLorebookIds(activeChat),
          dropExcluded: true,
          chat: activeChat,
          lorebooks: lorebooks.data ?? [],
        }).map((lorebook) => lorebook.id)
      : [];
    const activeAgentIds = Array.isArray(chatMetadata?.activeAgentIds)
      ? chatMetadata.activeAgentIds.filter((id): id is string => typeof id === "string")
      : [];
    const activeAgentResultIds = activeAgentIds.map(
      (id) => agents.data?.find((agent) => agent.id === id || agent.type === id)?.type ?? id,
    );
    const activeChatResultIds = [
      ...getOmnibarActiveChatContextResultIds(
        activeChatId,
        activeChat
          ? {
              ...activeChat,
              characterIds: getChatCharacterIds(activeChat),
              lorebookIds: activeLorebookIds,
              enableAgents: chatMetadata?.enableAgents === true,
              activeAgentIds: activeAgentResultIds,
            }
          : null,
      ),
    ];
    const { surface, openResource } = resolveOmnibarScreen({
      characterDetailId: openCharacterId,
      personaDetailId: openPersonaId,
      lorebookDetailId: openLorebookId,
      presetDetailId: openPresetId,
      connectionDetailId: openConnectionId,
      agentDetailId: openAgentId,
      settingsPanelVisible,
      gameAssetsBrowserOpen,
      botBrowserOpen,
      characterLibraryOpen,
      agentCatalogOpen,
      activeChatId,
    });
    const settingsResultId = settingsPanelVisible
      ? settingsTargetControlId
        ? `settings-control:${settingsTargetControlId}`
        : settingsTab
          ? `settings-section:${settingsTab}`
          : "settings"
      : null;
    const surfaceResultIds = rightPanelOpen
      ? [rightPanel === "connections" ? "integrations" : rightPanel === "settings" ? "settings" : rightPanel]
      : botBrowserOpen
        ? ["card-browser"]
        : gameAssetsBrowserOpen
          ? ["game-assets"]
          : characterLibraryOpen
            ? [cardLibraryKind === "personas" ? "persona-library" : "character-library"]
            : agentCatalogOpen
              ? ["agent-library", "packages"]
              : activeChatId
                ? ["chats", `chat:${activeChatId}`]
                : ["home"];
    const setupResultIds = data.commands
      .filter(
        (command) =>
          "availability" in command &&
          command.availability?.status === "requires-capability" &&
          command.availability.setupTarget,
      )
      .map((command) => command.id);
    const failedSources = [chats, characters, personas, lorebooks, presets, connections, agents, docs].some(
      (source) => source.isError,
    );
    return createOmnibarContext({
      surface,
      surfaceResultIds,
      activeChat:
        activeChat && activeChat.id === activeChatId
          ? { id: activeChat.id, mode: activeChat.mode, resultIds: activeChatResultIds }
          : undefined,
      openResource,
      settingsTarget: settingsResultId
        ? { tab: settingsTab, controlId: settingsTargetControlId ?? undefined, resultId: settingsResultId }
        : undefined,
      editorDirty,
      recentResultIds: ranking.recent.map((entry) => entry.id),
      setupResultIds,
      error: failedSources ? { resultIds: ["diagnostics"], message: t("omnibar.error") } : undefined,
    });
  }, [
    activeChat,
    activeChatId,
    agentCatalogOpen,
    agents,
    botBrowserOpen,
    cardLibraryKind,
    characterLibraryOpen,
    characters,
    chats,
    connections,
    data.commands,
    docs,
    editorDirty,
    gameAssetsBrowserOpen,
    lorebooks,
    openAgentId,
    openCharacterId,
    openConnectionId,
    openLorebookId,
    openPersonaId,
    openPresetId,
    personas,
    presets,
    ranking.recent,
    rightPanel,
    rightPanelOpen,
    settingsTab,
    settingsTargetControlId,
    settingsPanelVisible,
    t,
  ]);
  const contextLabels = useMemo(
    () => ({
      surface: t("commandCenter.context.currentSurface", "On this screen"),
      "open-resource": t("commandCenter.context.openResource", "Open now"),
      "active-chat": t("commandCenter.context.activeChat", "Used by this chat"),
      "settings-target": t("commandCenter.context.settingsTarget", "Current setting"),
      dirty: t("commandCenter.context.unsaved", "Open with unsaved changes"),
      setup: t("commandCenter.context.setup", "Setup available"),
      error: t("commandCenter.context.error", "Related to a current error"),
      recent: t("commandCenter.context.recent", "Recently used"),
    }),
    [t],
  );
  // Chat search: the engine only stores messages per chat, so this searches the
  // chat you are in rather than pretending to search all of them. The message
  // list is shared with the in-chat search panel's cache.
  const messageSearchQuery = deferredQuery.trim();
  const messageSearch = useChatMessageSearchSource(
    activeChatId ?? null,
    !!activeChatId && messageSearchQuery.length >= MIN_MESSAGE_SEARCH_LENGTH,
  );
  // Normalizing every message body is NFKC + regex work over the whole chat, so
  // it is cached against the message list instead of redone on each keystroke.
  const messageSearchIndex = useMemo(
    () =>
      (messageSearch.data ?? []).map((message) => ({
        message,
        haystack: isMessageHiddenFromUser(message) ? null : normalizeTextForMatch(message.content),
      })),
    [messageSearch.data],
  );
  const messageResults = useMemo<OmnibarResult[]>(
    () => buildOmnibarMessageResults({ activeChatId, messageSearchIndex, messageSearchQuery, t }),
    [activeChatId, messageSearchIndex, messageSearchQuery, t],
  );
  // The other chats' transcripts are not on the client, so searching them is a
  // server read. Only asked for once the query is long enough to be selective.
  const globalMessageScoped = !queryScope || queryScope === "messages";
  // Each request scans every chat on the server, so wait for a typing pause,
  // with the same delay as the Search All Chats modal.
  const globalMessageQuery = useDebouncedValue(messageSearchQuery, 300);
  const globalMessageSearch = useGlobalChatSearch(
    { query: globalMessageQuery },
    globalMessageQuery.length >= MIN_MESSAGE_SEARCH_LENGTH && globalMessageScoped,
  );
  const globalMessageResults = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarGlobalMessageResults({
        activeChatId,
        // The query keeps the previous page while the next one loads; hits for
        // an older query are not answers to this one.
        hits:
          globalMessageSearch.data?.pages[0]?.query === messageSearchQuery
            ? globalMessageSearch.data.pages[0].results
            : [],
        hasMore: globalMessageSearch.data?.pages[0]?.hasMore ?? false,
        messageSearchQuery,
        t,
      }),
    [activeChatId, globalMessageSearch.data, messageSearchQuery, t],
  );
  // Lorebook entries: the same typing pause as message search, with no scope or `lore:`.
  const entrySearchScoped = !queryScope || queryScope === "lorebook";
  const lorebookEntrySearch = useLorebookEntrySearch(
    globalMessageQuery,
    globalMessageQuery.length >= MIN_MESSAGE_SEARCH_LENGTH && entrySearchScoped,
  );
  const lorebookNameById = useMemo(
    () => new Map((lorebooks.data ?? []).map((book) => [book.id, book.name] as const)),
    [lorebooks.data],
  );
  const lorebookEntryResults = useMemo<OmnibarResult[]>(
    () =>
      // Only while the typed query still matches the one that was searched.
      globalMessageQuery === messageSearchQuery
        ? buildOmnibarLorebookEntryResults({
            entries: lorebookEntrySearch.data ?? [],
            lorebookNameById,
            query: messageSearchQuery,
            t,
          })
        : [],
    [globalMessageQuery, lorebookEntrySearch.data, lorebookNameById, messageSearchQuery, t],
  );
  // F1: an exact message/entry hit should win over the Mari fallback promotion
  // even when nothing else scored well (slice 41). Docs hits are the same
  // kind of late-arriving direct answer (search results that land after their
  // own debounce), so they count too — "Ask Mari" must not outrank a direct
  // hit from any of these late sources (O4 item 2b / tasks 6 and 13).
  const directHitCount =
    messageResults.length + globalMessageResults.length + lorebookEntryResults.length + docs.results.length;
  const searchResults = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarSearchResults({
        chatControls,
        contextLabels,
        controls,
        data,
        deferredQuery,
        directHitCount,
        docsResults: docs.results,
        faqItems: HOME_FAQ_ITEMS,
        frecencyEntries,
        getFaqSearchText,
        localize,
        mariEnabled,
        omnibarContext,
        t,
      }),
    [
      chatControls,
      contextLabels,
      controls,
      data,
      deferredQuery,
      directHitCount,
      docs.results,
      frecencyEntries,
      localize,
      mariEnabled,
      omnibarContext,
      t,
    ],
  );
  // Professor Mari's conversations live behind an internal marker, so they are
  // missing from the normal chat list. Searchable here by their auto-title.
  const [mariOpenChatId, setMariOpenChatId] = useState<string | null>(null);
  // Fetched on open rather than on the first keystroke, so the rows are ready
  // before typing instead of arriving late and pushing the list down.
  const mariChats = useProfessorMariChats(mariEnabled);
  const mariChatResults = useMemo<OmnibarResult[]>(
    () => buildOmnibarMariChatResults({ deferredQuery, mariChats: mariChats.data ?? [], t }),
    [deferredQuery, mariChats.data, t],
  );

  // The chat input already owns a slash-command registry; the omnibar reuses it
  // so "what can I do in this chat" is answerable from one place. Choosing a row
  // types the command into the chat input instead of running it, so args and
  // confirmation stay where the user can see them.
  const installedCapabilities = useInstalledCapabilityPackages();
  const slashAvailability = useMemo(
    () => ({
      mode: activeChat?.mode === "roleplay" || activeChat?.mode === "conversation" ? activeChat.mode : undefined,
      availableCapabilityIds: new Set(
        (installedCapabilities.data ?? []).filter((item) => item.status === "active").map((item) => item.id),
      ),
    }),
    [activeChat?.mode, installedCapabilities.data],
  );
  const slashResults = useMemo<OmnibarResult[]>(
    () => buildOmnibarSlashResults({ activeChatId, deferredQuery, slashAvailability, surface: omnibarContext.surface }),
    [activeChatId, deferredQuery, omnibarContext.surface, slashAvailability],
  );
  const queryClient = useQueryClient();
  // R2: the checkup of the open chat's newest message when it is a reply, from the cached page only.
  const lastReplyFindings = useMemo(() => {
    if (!activeChat || activeChat.id !== activeChatId) return [];
    const newest = queryClient.getQueryData<{ pages: Message[][] }>(chatKeys.messages(activeChat.id))?.pages[0]?.at(-1);
    return newest && (newest.role === "assistant" || newest.role === "narrator") ? checkReply(newest) : [];
  }, [activeChat, activeChatId, queryClient]);
  // Context-aware results: read the app's current location (active chat, open
  // editor) and surface direct jumps to whatever is on screen and under it.
  const contextResults = useMemo<OmnibarResult[]>(() => {
    const built = buildOmnibarContextResults({
      activeChat,
      activeChatId,
      activeEditorField,
      agents: agents.data,
      allLocalResults,
      characterNameById,
      connectionById,
      lastAppError,
      lorebooks: lorebooks.data,
      mariEnabled,
      omnibarSuggestionsEnabled,
      openAgentId,
      openCharacterId,
      openConnectionId,
      openLorebookId,
      openPersonaId,
      openPresetId,
      personaById,
      personas: personas.data,
      presets: presets.data,
      surface: omnibarContext.surface,
      t,
      lastReplyFindings,
    });
    // The Fix row for a failed reply only opened the broken connection's
    // editor; picking one of the chat's other connections here now retries
    // the failed message with it at once (O4 item 3).
    const retry = lastAppError?.retry;
    if (!activeChatId || retry?.kind !== "open-connection") return built;
    const fixRowId = `connection:${retry.id}`;
    const otherConnections = languageConnections.filter((connection) => connection.id !== retry.id);
    if (otherConnections.length === 0) return built;
    return built.map((result) =>
      result.id === fixRowId
        ? {
            ...result,
            control: {
              type: "choice" as const,
              label: t("commandCenter.actions.retryWithConnection", "Retry with"),
              value: "",
              options: otherConnections.map((connection) => ({ value: connection.id, label: connection.name })),
              onChange: (value: string | boolean) => {
                const connectionId = String(value);
                if (connectionId) requestChatRetryWithConnection(activeChatId, connectionId);
              },
            },
          }
        : result,
    );
  }, [
    activeChat,
    activeChatId,
    activeEditorField,
    allLocalResults,
    agents.data,
    characterNameById,
    connectionById,
    languageConnections,
    lastAppError,
    lastReplyFindings,
    lorebooks.data,
    mariEnabled,
    openAgentId,
    openCharacterId,
    openConnectionId,
    openLorebookId,
    openPersonaId,
    openPresetId,
    personaById,
    personas.data,
    presets.data,
    omnibarSuggestionsEnabled,
    omnibarContext.surface,
    t,
  ]);
  // M9: what Mari says when she opens on this screen. Built here, where the omnibar context already is,
  // so every door (⌘J, the pull, Home, ⌘K) shows the same thing. Names, counts and times only (R22).
  const arrivalChat = activeChat && activeChat.id === activeChatId ? activeChat : null;
  const arrivalMessageCount = useChatMessageCount(
    mariEnabled && omnibarContext.surface === "chat" ? (arrivalChat?.id ?? null) : null,
  );
  const [settingUndoVersion, setSettingUndoVersion] = useState(0);
  const mariArrival = useMemo(() => {
    const metadata = arrivalChat ? parseChatMetadata(arrivalChat.metadata) : null;
    // ponytail: the newest reply and the active-entries count come from what is already cached; the
    // arrival never fetches messages or runs a scan of its own. A chat not loaded yet shows fewer facts.
    const newestPage = arrivalChat
      ? queryClient.getQueryData<{ pages: Message[][] }>(chatKeys.messages(arrivalChat.id))?.pages[0]
      : undefined;
    const lastReply = newestPage?.findLast((message) => message.role === "assistant" || message.role === "narrator");
    const count = arrivalMessageCount.data?.count ?? null;
    const summaryEnds = Array.isArray(metadata?.summaryEntries)
      ? (metadata.summaryEntries as { rangeEndIndex?: unknown }[]).flatMap((entry) =>
          typeof entry?.rangeEndIndex === "number" ? [entry.rangeEndIndex] : [],
        )
      : [];
    const agentRow = openAgentId
      ? agents.data?.find((agent) => agent.id === openAgentId || agent.type === openAgentId)
      : undefined;
    let agentSettingsCount = 0;
    try {
      agentSettingsCount = Object.keys(JSON.parse(agentRow?.settings || "{}") ?? {}).length;
    } catch {
      // A malformed settings blob only hides the "what do its settings do" card.
    }
    const activeAgentIds: unknown[] = Array.isArray(metadata?.activeAgentIds) ? metadata.activeAgentIds : [];
    const resource = omnibarContext.openResource;
    const listName = (list: readonly unknown[] | undefined, id: string) =>
      readNamedRow((list ?? []).find((item) => readNamedRow(item)?.id === id))?.name;
    const editorName = !resource
      ? undefined
      : resource.kind === "character"
        ? characterNameById.get(resource.id)
        : resource.kind === "persona"
          ? listName(personas.data, resource.id)
          : resource.kind === "lorebook"
            ? listName(lorebooks.data, resource.id)
            : resource.kind === "preset"
              ? listName(presets.data, resource.id)
              : resource.kind === "connection"
                ? connectionById.get(resource.id)?.name
                : undefined;
    const destinations = getOmnibarSettingsDestinations();
    const destinationTitle = (id: string) => {
      const title = destinations.find((destination) => destination.id === id)?.title;
      return title ? localize(title) : null;
    };
    return buildMariArrival(omnibarContext, {
      t,
      now: Date.now(),
      gameSetupStep,
      chat: arrivalChat
        ? {
            name: arrivalChat.name,
            mode: arrivalChat.mode,
            characters: getChatCharacterIds(arrivalChat).flatMap((id) => {
              const name = characterNameById.get(id);
              return name ? [{ id, name }] : [];
            }),
            lorebooks: deriveActiveLorebookViews({
              activeLorebookIds: getChatActiveLorebookIds(arrivalChat),
              excludedLorebookIds: getChatExcludedLorebookIds(arrivalChat),
              dropExcluded: true,
              chat: arrivalChat,
              lorebooks: lorebooks.data ?? [],
            }).map((lorebook) => ({ id: lorebook.id, name: lorebook.name })),
            messageCount: count,
            lastReply: lastReply
              ? { createdAt: lastReply.createdAt, finishReason: lastReply.extra?.generationInfo?.finishReason }
              : null,
            messagesSinceSummary:
              count != null && summaryEnds.length > 0 ? Math.max(0, count - 1 - Math.max(...summaryEnds)) : null,
            activeEntries:
              queryClient.getQueryData<ActiveLorebookScan>(lorebookKeys.active(arrivalChat.id))?.entries.length ?? null,
          }
        : null,
      replyFailed: isMariReplyFailure(lastAppError, arrivalChat?.id),
      agent: agentRow
        ? {
            type: agentRow.type,
            name: agentRow.name,
            enabled: String(agentRow.enabled) === "true",
            promptLength: agentRow.promptTemplate?.length ?? 0,
            settingsCount: agentSettingsCount,
            onForChat:
              arrivalChat &&
              metadata?.enableAgents === true &&
              (activeAgentIds.includes(agentRow.id) || activeAgentIds.includes(agentRow.type))
                ? arrivalChat.name
                : null,
            lastError:
              lastAppError?.retry?.kind === "open-agent" && lastAppError.retry.id === agentRow.type
                ? lastAppError.message
                : null,
          }
        : null,
      editor: editorName ? { name: editorName, field: activeEditorField?.label } : null,
      settings: settingsPanelVisible
        ? {
            section:
              (settingsTab ? destinationTitle(`settings-section:${settingsTab}`) : null) ??
              t("omnibar.categories.settings", "Settings"),
            control: settingsTargetControlId ? destinationTitle(`settings-control:${settingsTargetControlId}`) : null,
          }
        : null,
      undoLabel: lastSettingFlip?.label ?? null,
    });
    // settingUndoVersion: lastSettingFlip is module state; the version re-reads it after an Undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeEditorField?.label,
    agents.data,
    arrivalChat,
    arrivalMessageCount.data?.count,
    characterNameById,
    connectionById,
    gameSetupStep,
    lastAppError,
    localize,
    lorebooks.data,
    omnibarContext,
    openAgentId,
    personas.data,
    presets.data,
    queryClient,
    settingUndoVersion,
    settingsPanelVisible,
    settingsTab,
    settingsTargetControlId,
    t,
  ]);
  // R7: which Mari thread this screen's arrivals go to.
  const mariThreadContext = useMemo(
    () => mariThreadContextFor(omnibarContext, mariArrival),
    [mariArrival, omnibarContext],
  );
  const attachedResultIds = useMemo(
    () => new Set(omnibarContext.activeChat?.resultIds ?? []),
    [omnibarContext.activeChat?.resultIds],
  );
  const removalSuggestions = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarRemovalSuggestions({
        activeChat,
        attachedResultIds,
        contextResults,
        deferredQuery,
        omnibarSuggestionsEnabled,
        t,
      }),
    [activeChat, attachedResultIds, contextResults, deferredQuery, omnibarSuggestionsEnabled, t],
  );
  // A bare "add" has no search results to draw on, so the recently used rows
  // stand in: a few concrete "Add Eliza to this chat" rows are worth more than
  // six abstract kind rows alone. Kept short so the kind rows stay visible.
  const recentAttachable = useMemo(() => {
    const byId = new Map(allLocalResults.map((item) => [item.id, item]));
    return ranking.recent.flatMap((entry) => {
      const item = byId.get(entry.id);
      return item && CHAT_RESOURCE_KIND[item.category] ? [item] : [];
    });
  }, [allLocalResults, ranking.recent]);
  /**
   * What a bare "add" is answered with. The text search returns nothing for a
   * verb on its own except the Ask-Mari row, so testing `searchResults.length`
   * was never false and the recents fallback never fired: recents lead, then any
   * other attachable, and the builder's own cap decides how many are shown.
   */
  const attachableFallback = useMemo(() => {
    const recent = recentAttachable.slice(0, 3);
    const seen = new Set(recent.map((result) => result.id));
    return [
      ...recent,
      ...allLocalResults.filter((result) => CHAT_RESOURCE_KIND[result.category] && !seen.has(result.id)),
      // The builder caps what it shows; capping here too keeps a large library
      // from copying every attachable row on each query change (section 10).
    ].slice(0, 40);
  }, [allLocalResults, recentAttachable]);
  const addSuggestions = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarAddSuggestions({
        activeChat,
        attachedResultIds,
        deferredQuery,
        omnibarSuggestionsEnabled,
        searchResults: searchResults.some((result) => CHAT_RESOURCE_KIND[result.category])
          ? searchResults
          : attachableFallback,
        t,
      }),
    [activeChat, attachableFallback, attachedResultIds, deferredQuery, omnibarSuggestionsEnabled, searchResults, t],
  );
  const verbSuggestions = useMemo<OmnibarResult[]>(
    () => buildOmnibarVerbSuggestions({ allLocalResults, deferredQuery }),
    [allLocalResults, deferredQuery],
  );
  const addedResultIds = useMemo(
    () => new Set(addSuggestions.map((item) => item.id.replace("action:add-to-chat:", ""))),
    [addSuggestions],
  );
  // Same reason as the add rows below: while a removal row is offered for an
  // entity, the plain entity row is a duplicate that opens its editor instead,
  // which is never what "remove Eliza" asked for.
  const removedResultIds = useMemo(
    () => new Set(removalSuggestions.map((item) => item.id.replace("action:detach-from-chat:", ""))),
    [removalSuggestions],
  );
  // The same hook the Work pane uses, so an approval decided from a row behaves
  // and reads exactly as it does there.
  const { keepApproval, restoreApproval, pendingId: approvalPendingId } = useMariApprovals();
  const approvalResults = useMemo<OmnibarResult[]>(
    () =>
      buildOmnibarApprovalResults({
        approvals: mariEnabled ? mariWorkspaceStatus.data?.pendingApprovals : undefined,
        t,
        pendingId: approvalPendingId,
        onDecide: (id, decision) => void (decision === "keep" ? keepApproval(id) : restoreApproval(id)),
        query: deferredQuery,
      }),
    [
      approvalPendingId,
      deferredQuery,
      keepApproval,
      mariEnabled,
      mariWorkspaceStatus.data?.pendingApprovals,
      restoreApproval,
      t,
    ],
  );
  const continueResult = useMemo<OmnibarResult | null>(
    () => buildOmnibarContinueResult({ mariEnabled, t, workspaceStatus: mariWorkspaceStatus.data, mariFinished }),
    [mariEnabled, mariWorkspaceStatus.data, t, mariFinished],
  );
  // The empty omnibar also offers the chats you were in last, other than the open
  // one: switching chats is the most common trip here, and the "Recent" group
  // otherwise only knows what was chosen through the omnibar before.
  // "new character Bob", "chat with Shrek": sentences the name search cannot answer.
  const intentShortcuts = useMemo<OmnibarResult[]>(
    () =>
      deferredQuery.trim()
        ? buildOmnibarIntentShortcuts({
            query: deferredQuery,
            characters: [...characterNameById].map(([id, name]) => ({ id, name })),
            t,
          })
        : [],
    [characterNameById, deferredQuery, t],
  );
  // N2: doors into the same new-chat flow as Home's Conversation/Roleplay/Game
  // buttons, findable by typing (not shown idle, matching the create-* commands).
  const newChatCommands = useMemo<OmnibarResult[]>(
    () => (deferredQuery.trim() ? buildOmnibarNewChatCommands({ query: deferredQuery, t }) : []),
    [deferredQuery, t],
  );
  const recentChatResults = useMemo<OmnibarResult[]>(() => {
    const rowById = new Map(searchableEntityResults.map((row) => [row.id, row] as const));
    const lastActive = (chat: Chat) => chat.lastMessageAt ?? chat.updatedAt;
    return [...(chats.data ?? [])]
      .filter((chat) => chat.id !== activeChatId)
      .sort((a, b) => lastActive(b).localeCompare(lastActive(a)))
      .flatMap((chat) => {
        const row = rowById.get(`chat:${chat.id}`);
        return row ? [{ ...row, group: "recent" as const }] : [];
      })
      .slice(0, IDLE_RECENT_CHATS);
  }, [activeChatId, chats.data, searchableEntityResults]);
  // O2: on an empty query, the top 3-5 rows this surface's user actually runs
  // most, ahead of the plain "last used anywhere" recents group below.
  const frecentIdleResults = useMemo<OmnibarResult[]>(() => {
    if (deferredQuery.trim()) return [];
    const ids = topFrecentResultIds(frecencyEntries, omnibarContext.surface);
    if (!ids.length) return [];
    const rowById = new Map(allLocalResults.map((row) => [row.id, row] as const));
    return ids.flatMap((id) => {
      // Already the thing you're on — showing "open it" again would be noise.
      if (id === `chat:${activeChatId}` || id === omnibarContext.openResource?.resultId) return [];
      const row = rowById.get(id);
      return row && isNavigationOmnibarResult(row) ? [{ ...row, group: "frecent" as const }] : [];
    });
  }, [
    activeChatId,
    allLocalResults,
    deferredQuery,
    frecencyEntries,
    omnibarContext.openResource,
    omnibarContext.surface,
  ]);
  const rawResults = useMemo(
    () =>
      // A scope with nothing typed after it ("char:") is a request to browse that
      // kind, so the whole local list answers it instead of the idle suggestions.
      queryScope && !deferredQuery.trim()
        ? allLocalResults.filter((result) => matchesOmnibarScope(result, queryScope))
        : deferredQuery.trim()
          ? [
              ...intentShortcuts,
              ...newChatCommands,
              ...slashResults,
              ...verbSuggestions,
              ...addSuggestions,
              ...removalSuggestions,
              ...approvalResults,
              ...messageResults,
              ...globalMessageResults,
              ...lorebookEntryResults,
              ...mariChatResults,
              // An explicit "Add X to this chat" row replaces the plain entity row
              // for the same thing: showing both lists every character twice, and
              // the plain one reads like "open" while doing the same attach.
              ...(addedResultIds.size || removedResultIds.size
                ? searchResults.filter((result) => !addedResultIds.has(result.id) && !removedResultIds.has(result.id))
                : searchResults),
            ]
          : [
              ...contextResults.slice(0, CHAT_CONTEXT_MAX_RESULTS),
              ...frecentIdleResults,
              ...recentChatResults,
              ...slashResults,
              ...approvalResults,
              ...(continueResult ? [continueResult] : []),
            ],
    [
      allLocalResults,
      queryScope,
      addSuggestions,
      addedResultIds,
      removedResultIds,
      contextResults,
      frecentIdleResults,
      intentShortcuts,
      newChatCommands,
      recentChatResults,
      approvalResults,
      continueResult,
      deferredQuery,
      globalMessageResults,
      lorebookEntryResults,
      mariChatResults,
      messageResults,
      searchResults,
      removalSuggestions,
      slashResults,
      verbSuggestions,
    ],
  );
  const scopedRawResults = useMemo(
    () => (queryScope ? rawResults.filter((result) => matchesOmnibarScope(result, queryScope)) : rawResults),
    [queryScope, rawResults],
  );
  const relevanceFilteredResults = useMemo(() => filterOmnibarFuzzyFallback(scopedRawResults), [scopedRawResults]);
  const rankedResults = useMemo<RankedOmnibarResult[]>(() => {
    const sourceById = new Map<string, OmnibarResult>();
    for (const result of relevanceFilteredResults) {
      if (!sourceById.has(result.id)) sourceById.set(result.id, result);
    }
    const uniqueRawResults = [...sourceById.values()];
    return rankCommandResults(
      uniqueRawResults.map((result) => ({
        command: {
          id: result.id,
          title: result.title,
          kind:
            result.kind ??
            (result.category === "settings"
              ? "settings"
              : result.category === "navigation"
                ? "navigation"
                : "resource"),
          icon:
            result.icon ??
            (result.category === "professor" ? "professor" : result.category === "docs" ? "documentation" : "command"),
          target: result.target,
          availability:
            result.availability === "unavailable"
              ? { status: "requires-capability" }
              : typeof result.availability === "object"
                ? result.availability
                : { status: "available" },
        },
        score: result.score,
      })),
      ranking,
    ).map(({ result }) => ({ ...sourceById.get(result.command.id)!, command: result.command }));
  }, [ranking, relevanceFilteredResults]);
  const presentation = useMemo(
    () =>
      presentCommandCenterResults(rankedResults, {
        query: deferredQuery,
        filter,
        rankingState: ranking,
      }),
    [filter, deferredQuery, rankedResults, ranking],
  );
  const idle = !query.trim() && presentation.groups.length === 0;
  const listVisible = pane !== "mari" && !idle;
  // The filter bar only renders once there is a query, so availability always comes from the results.
  const tabAvailability = presentation.categoryAvailability;
  const availableFilters = COMMAND_CENTER_CATEGORY_FILTERS.filter(
    (item) => item === "all" || item === filter || tabAvailability[item] > 0,
  );
  // R40: a choice row's options are rows, inserted below it. The detail pane was
  // doing two unrelated jobs - previewing a resource and editing a control - and
  // only the first is a preview.
  const results = useMemo(
    () => expandChoiceRows(presentation.results, expandedChoiceId),
    [expandedChoiceId, presentation.results],
  );
  // R10: the aside fires on exactly the queries the Ask-Mari row is promoted
  // for. That predicate is already tuned, and its outcome is visible here - the
  // row lands in "professor-suggested" only when it fires - so there is no
  // second heuristic to keep in step.
  useEffect(() => {
    setExpandedChoiceId(null);
    setExpandedPreviewId(null);
  }, [deferredQuery, filter]);
  // Message and lorebook-entry hits arrive after the Ask row was promoted, so they
  // are checked here too: when the library already answers, no model is called.
  const asideDeadEnd =
    results.some((result) => result.id === "ask-professor-mari" && result.group === "professor-suggested") &&
    messageResults.length === 0 &&
    globalMessageResults.length === 0 &&
    lorebookEntryResults.length === 0;
  const asideConnectionName =
    languageConnections.find((connection) => connection.id === asideConnectionId)?.name ?? null;
  // The real surface the user is on, not always "command-center": an open
  // editor or the active chat is a more honest (and more useful) context for
  // the aside's unasked call than the omnibar shell it happens to appear in.
  const asideSource: ProfessorMariEntryPoint = gameSetupStep
    ? "game-setup"
    : omnibarContext.openResource
      ? (`${omnibarContext.openResource.kind}-editor` as ProfessorMariEntryPoint)
      : omnibarContext.surface === "settings"
        ? "settings"
        : omnibarContext.surface === "chat" && activeChat?.id === activeChatId
          ? "character-chat"
          : "command-center";
  // R22: the wizard step is a label only; nothing typed into the wizard is sent.
  const asideResourceLabel = gameSetupStep
    ? gameSetupStep
    : omnibarContext.openResource
      ? (allLocalResults.find((result) => result.id === omnibarContext.openResource?.resultId)?.title ?? null)
      : omnibarContext.surface === "chat" && activeChat?.id === activeChatId
        ? activeChat.name
        : agentCatalogOpen
          ? t("omnibar.aside.downloadAgents", "Download Agents")
          : null;
  const asideState = useOmnibarAside({
    query: deferredQuery,
    deadEnd: asideDeadEnd && pane === "results",
    source: asideSource,
    resourceLabel: asideResourceLabel,
  });
  // Only these two states carry an answer worth escalating (R25); "thinking"
  // has no text yet and "error" offers retry/choose-model instead.
  const asideLive = asideState.status === "streaming" || asideState.status === "complete";
  // The idle countdown is silent; every later state grows inside the promoted Ask row (R9).
  const asideShown = asideState.status !== "idle" && asideState.status !== "waiting";
  // The things a finished answer names, offered as one-click destinations under it.
  const asideLinks = useMemo(
    () => (asideState.status === "complete" ? findMentionedResults(asideState.answer, allLocalResults) : []),
    [allLocalResults, asideState.answer, asideState.status],
  );
  // K4: a capability word in the typed query ("images", "music", "maps"...)
  // points at the real official Agent package, computed from the query the
  // user already typed - no extra data leaves the device for this (R22).
  const asideAgentPackageIds = useMemo(
    () => (asideState.status === "complete" ? matchOmnibarCapabilityAgentPackageIds(asideState.query) : []),
    [asideState.query, asideState.status],
  );
  // Quick and Mari both own the whole dialog. Leaving the search input mounted
  // under them let one keystroke re-enter `results` and abort a running answer.
  const mariSurface = pane === "mari";
  // K6: fire once per open, the first time the results pane actually paints
  // (opening straight into Mari's pane has no results list to time).
  useLayoutEffect(() => {
    if (mariSurface || firstResultPaintMarked.current) return;
    firstResultPaintMarked.current = true;
    measureOmnibarFirstResultPaint(useUIStore.getState().debugMode);
  }, [mariSurface]);
  useLayoutEffect(() => {
    if (mariSurface) return;
    const dialog = dialogRef.current;
    const input = inputRef.current;
    if (!dialog || !input || reduceMotion || !window.matchMedia("(min-width: 640px)").matches) {
      setInputTravel(0);
      return;
    }
    // The panel grows into the takeover, so aim at the taller shell, not this one.
    const grown = Math.min(44 * 16, window.innerHeight * 0.8);
    setInputTravel(
      Math.max(0, grown - (input.getBoundingClientRect().bottom - dialog.getBoundingClientRect().top) - 44),
    );
  }, [mariSurface, reduceMotion]);
  // Ghost text: continue the query with the best-ranked result title. Uses the
  // ranked list already on screen, so the guess never disagrees with row 1.
  // It completes the name only. Completing the whole sentence ("add Eliza to
  // this chat") duplicated the add and removal suggestion rows, which say the
  // same thing as a row you can press Enter on.
  const inlineSuffix = useMemo(() => {
    if (mariSurface) return "";
    const candidates = results.flatMap((result) => (result.id === "ask-professor-mari" ? [] : [result.title]));
    return completeInline(query, candidates);
  }, [mariSurface, query, results]);
  const resultIdsKey = results.map((result) => result.id).join("\u0000");
  const reconciledResultIdsKeyRef = useRef<string | null>(null);
  const reconciledQueryRef = useRef(deferredQuery);
  // F1 (O5): true while the selection is still wherever the effect put it, not
  // somewhere the user picked. Late message/entry/docs hits land after their own
  // debounce and can change which row is first; the selection should keep
  // following that row only while it's still auto-selected. Reset on every
  // query change, cleared the moment the user moves the selection themselves.
  const autoSelectionRef = useRef(true);
  const activeIndex = results.findIndex((result) => result.id === activeResultId);
  const activeResult = activeIndex >= 0 ? results[activeIndex] : undefined;
  const sourceQueries: Array<{ isLoading: boolean; isError: boolean }> = [
    chats,
    characters,
    personas,
    lorebooks,
    presets,
    connections,
    agents,
    ...(globalMessageScoped ? [globalMessageSearch] : []),
  ];
  const loading = sourceQueries.some((item) => item.isLoading) || docs.isSearching;
  const failed = sourceQueries.some((item) => item.isError) || docs.isError;

  // Persist the session, but debounced: writing JSON to localStorage on every
  // keystroke is pure jank. A ref holds the latest session so the unmount-only
  // effect can flush it on close without losing the final edit.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    const timer = window.setTimeout(() => writeCommandCenterSessionState(session), 250);
    return () => window.clearTimeout(timer);
  }, [session]);
  // Closing always persists the list. Mari is a place you go, not a place you
  // are returned to, and the pane is the one field that must not survive.
  useEffect(
    () => () => {
      writeCommandCenterSessionState({ ...sessionRef.current, pane: "results" });
    },
    [],
  );

  useEffect(() => {
    const resultOrderChanged = reconciledResultIdsKeyRef.current !== resultIdsKey;
    reconciledResultIdsKeyRef.current = resultIdsKey;
    const leadingCurrentWorkId =
      !deferredQuery.trim() && presentation.groups[0]?.id === "current-work"
        ? presentation.groups[0].results[0]?.id
        : undefined;
    // When that row is only the chat already open, Enter on it does nothing, so the
    // empty omnibar starts on the last other chat instead: Cmd+K, Enter switches back.
    // F3: stays on "recent" only - "frecent" can hold a settings toggle or other
    // write, and an idle Ctrl+K/Enter must never apply one just because it's used often.
    const firstCurrentWorkId =
      leadingCurrentWorkId && activeChatId && leadingCurrentWorkId === `chat:${activeChatId}`
        ? (presentation.groups.find((group) => group.id === "recent")?.results[0]?.id ?? leadingCurrentWorkId)
        : leadingCurrentWorkId;
    // A new query re-ranks everything, so the selection must follow the new top
    // row instead of sticking to whatever was highlighted before. Otherwise
    // "remove eliza" keeps the plain "Eliza" row selected from earlier
    // keystrokes and Enter opens her editor instead of detaching her.
    const queryChanged = reconciledQueryRef.current !== deferredQuery;
    reconciledQueryRef.current = deferredQuery;
    if (queryChanged) autoSelectionRef.current = true;
    // F1: late-arriving message/entry/docs hits reorder the list after their own
    // debounce, demoting the promoted "Ask Mari" row below the real hit. If the
    // user has not moved the selection since this query started, the selection
    // must follow that new top row too, not just on the keystroke that changed
    // the query - otherwise Enter still lands on the no-longer-first Mari row.
    const topCandidateId = firstCurrentWorkId ?? results[0]?.id ?? null;
    const next = reconcileActiveResultId(
      queryChanged
        ? null
        : // Also while nothing is selected yet: the effect can run again before the
          // first pass's selection lands, and would fall back to the first row.
          (resultOrderChanged || !activeResultId) && autoSelectionRef.current && topCandidateId
          ? topCandidateId
          : activeResultId,
      results.map((result) => result.id),
    );
    setSession((current) => (current.activeResultId === next ? current : { ...current, activeResultId: next }));
  }, [activeChatId, activeResultId, deferredQuery, presentation.groups, resultIdsKey, results]);

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestAnimationFrame(() => {
      // The settings sheet owns focus when it opens the omnibar directly
      // (Settings > Open, a Settings-search jump); focusing the hidden
      // search input underneath it would steal focus from the sheet.
      if (useUIStore.getState().omnibarSettings) return;
      inputRef.current?.focus();
      if (initialQueryRef.current) inputRef.current?.select();
    });
    return () => restoreRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!activeResultId || pane !== "results") return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-result-id="${CSS.escape(activeResultId)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeResultId, expandedPreviewId, pane]);

  // Returning from Mari puts focus back on the row that opened her, so the
  // keyboard position survives the round trip; the input is the fallback.
  // The search header comes back after the Mari header's exit animation, so wait (a few frames at
  // most) until the row or the search field is there again.
  const [mariReturnFocus, setMariReturnFocus] = useState(0);
  useEffect(() => {
    if (!mariReturnFocus) return;
    let frame = 0;
    let tries = 40;
    const focusReturn = () => {
      const resultId = mariReturnResultIdRef.current;
      const row = resultId
        ? listRef.current?.querySelector<HTMLElement>(`[data-result-id="${CSS.escape(resultId)}"]`)
        : null;
      const target = row?.querySelector<HTMLElement>("button") ?? inputRef.current;
      if (target) target.focus();
      else if (tries-- > 0) frame = requestAnimationFrame(focusReturn);
    };
    frame = requestAnimationFrame(focusReturn);
    return () => cancelAnimationFrame(frame);
  }, [mariReturnFocus]);
  const focusMariReturnRow = () => setMariReturnFocus((current) => current + 1);
  /** Measures the search field's flight to the composer dock. See fieldFlight. */
  const startFieldFlight = () => {
    if (reduceMotion || pane === "mari") return;
    const field = inputRef.current?.getBoundingClientRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (!field || !panel) return;
    const inset = 10;
    setFieldFlight({
      from: { top: field.top, left: field.left, width: field.width, height: field.height },
      to: {
        top: panel.bottom - field.height - inset * 2,
        left: panel.left + inset,
        width: Math.max(panel.width - inset * 2, 0),
        height: field.height,
      },
    });
  };
  /** Every route into the Work pane goes through here, so none forgets a flag. */
  const enterMariPane = (context?: ProfessorMariAskContext, submitDraft = false, draftOverride?: string) => {
    startFieldFlight();
    if (context) {
      setMariContext(context);
      // The handoff lives in session state, not component state, so a task that
      // Mari finishes while the omnibar is shut is still waiting on reopen.
      setSessionValue("mariHandoff", {
        status: "pending",
        context,
        draft: draftOverride ?? context.query,
      });
    }
    if (submitDraft) setMariSubmitDraftRequest((current) => current + 1);
    setMariChatOpen(true);
    setMariMounted(true);
    setPane("mari");
  };
  const enterRequestedMariPane = useEffectEvent((request: ProfessorMariOpenDetail) => {
    // M9: a door that brings nothing (the pull, Home's "Ask Professor Mari", ⌘J) arrives with this
    // screen's context, exactly like ⌘K's own Ask Mari with an empty query. A left-over query is not sent along.
    if (!request.context && !request.draft) {
      openProfessorMari(null, { arrival: true });
      return;
    }
    // A scope prefix like "faq:" is omnibar search syntax, not part of the
    // message text — strip it before it lands in Mari's composer.
    const rawDraft = request.draft ?? request.context?.query ?? "";
    enterMariPane(request.context, request.submitDraft ?? false, parseOmnibarScope(rawDraft).query);
  });
  // A cold door (the omnibar was shut): the host left its request for this dialog to pick up. Read
  // before anything renders, because the Mari chat below consumes open requests in its own (earlier,
  // child-first) mount effect.
  const [coldMariRequest] = useState(() => {
    const pending = peekProfessorMariOpenRequest();
    return (pending?.destination ?? "omnibar") === "omnibar" ? pending : null;
  });
  useEffect(() => {
    if (!coldMariRequest) return;
    consumeProfessorMariOpenRequest("omnibar");
    enterRequestedMariPane(coldMariRequest);
  }, [coldMariRequest]);
  useEffect(() => {
    const openRequestedProfessorMari = (event: Event) => {
      const request = (event as CustomEvent<ProfessorMariOpenDetail>).detail;
      if ((request.destination ?? "omnibar") !== "omnibar") return;
      consumeProfessorMariOpenRequest("omnibar");
      enterRequestedMariPane(request);
    };
    window.addEventListener(PROFESSOR_MARI_OPEN_EVENT, openRequestedProfessorMari);
    return () => window.removeEventListener(PROFESSOR_MARI_OPEN_EVENT, openRequestedProfessorMari);
  }, []);
  /**
   * Guards every path that leaves an open editor, so no route skips the prompt.
   * An editor with a leave handler saves itself on the way out (the store routes
   * the leave through it), so only editors without one need the prompt; the
   * chat sidebar applies the same rule.
   */
  const confirmLeaveEditor = () =>
    !ui().editorDirty ||
    hasEditorLeaveHandler(ui()) ||
    window.confirm(t("commandCenter.dirtyEditor", "You have unsaved changes. Leave this editor?"));
  const navigate = (target: ProfessorMariNavigationTarget) => {
    // Q2: a setting that lives in this omnibar opens its settings view here, so the omnibar stays
    // open and nothing is left behind (no editor-leave prompt, no close).
    if (target.kind === "settings" && isOmnibarSettingsTarget(target)) {
      openSettings(target.controlId ?? null);
      return false;
    }
    if (!confirmLeaveEditor()) return false;
    executeStateNavigation(target);
    return true;
  };
  const recordUse = (id: string) => {
    const next = recordCommandUse(ranking, id);
    setRanking(next);
    writeCommandRankingState(next);
    // O2: a no-op for Mari's row, enforced inside recordOmnibarFrecencyUse.
    setFrecencyEntries(recordOmnibarFrecencyUse(id, omnibarContext.surface));
  };
  const runSystemAction = (result: OmnibarResult) => {
    const definition = createSystemCommandDefinitions((key, fallback) =>
      t(`commandCenter.system.${key}`, fallback),
    ).find((item) => item.id === result.id);
    if (!definition) return false;
    if (!confirmLeaveEditor()) return false;
    if (
      definition.availability.status !== "available" &&
      !(
        definition.availability.status === "requires-capability" &&
        definition.availability.setupTarget &&
        definition.action.kind === "navigate"
      )
    )
      return false;
    if (definition.action.kind === "modal") {
      const props = definition.action.props ? { ...definition.action.props } : undefined;
      const prefillName = createModalPrefillName(definition.action.modal, query);
      ui().openModal(definition.action.modal, prefillName ? { ...props, defaultName: prefillName } : props);
    } else executeStateNavigation(definition.action.target);
    return true;
  };
  /**
   * Detaches one resource from the open chat. Each kind lives in a different
   * field, so the mapping is explicit; a lorebook is also added to the excluded
   * list, because dropping it from the active list alone lets a character
   * re-activate it immediately.
   */
  const detachFromChat = (resource: ChatResourceDragKind, resourceId: string, label: string) => {
    if (!activeChat || !resourceId) return false;
    const chatId = activeChat.id;
    // Each patch is paired with the patch that puts the old value back, so the
    // toast can offer Undo instead of a modal confirm blocking the keyboard flow.
    const metadata = parseChatMetadata(activeChat.metadata);
    const activeAgentIds = Array.isArray(metadata.activeAgentIds) ? metadata.activeAgentIds : [];
    const characterIds = getChatCharacterIds(activeChat);
    const activeLorebookIds = getChatActiveLorebookIds(activeChat);
    const excludedLorebookIds = getChatExcludedLorebookIds(activeChat);
    const chatPatch = (next: Parameters<typeof patchChat>[0], undo: Parameters<typeof patchChat>[0]) => ({
      apply: () => void patchChat(next),
      undo: () => void patchChat(undo),
    });
    const metadataPatch = (
      next: Parameters<typeof patchChatMetadata>[0],
      undo: Parameters<typeof patchChatMetadata>[0],
    ) => ({ apply: () => void patchChatMetadata(next), undo: () => void patchChatMetadata(undo) });
    const change =
      resource === "character"
        ? chatPatch(
            { id: chatId, characterIds: characterIds.filter((id) => id !== resourceId) },
            { id: chatId, characterIds },
          )
        : resource === "persona"
          ? chatPatch({ id: chatId, personaId: null }, { id: chatId, personaId: activeChat.personaId ?? null })
          : resource === "preset"
            ? chatPatch(
                { id: chatId, promptPresetId: null },
                { id: chatId, promptPresetId: activeChat.promptPresetId ?? null },
              )
            : resource === "connection"
              ? chatPatch(
                  { id: chatId, connectionId: null },
                  { id: chatId, connectionId: activeChat.connectionId ?? null },
                )
              : resource === "lorebook"
                ? metadataPatch(
                    {
                      id: chatId,
                      activeLorebookIds: activeLorebookIds.filter((id) => id !== resourceId),
                      excludedLorebookIds: [...new Set([...excludedLorebookIds, resourceId])],
                    },
                    { id: chatId, activeLorebookIds, excludedLorebookIds },
                  )
                : resource === "agent"
                  ? metadataPatch(
                      {
                        id: chatId,
                        // A chat stores either the agent's id or its type, while the row id
                        // is always the type. Comparing raw values would detach nothing.
                        activeAgentIds: activeAgentIds.filter(
                          (id) =>
                            (agents.data?.find((agent) => agent.id === id || agent.type === id)?.type ?? id) !==
                            resourceId,
                        ),
                      },
                      { id: chatId, activeAgentIds },
                    )
                  : null;
    if (!change) return false;
    change.apply();
    toast.success(t("commandCenter.actions.removedFromChat", "Removed {{name}} from this chat.", { name: label }), {
      action: { label: t("ui.chat.chatresourcedropoverlay.undo", "Undo"), onClick: change.undo },
    });
    onClose();
    return true;
  };
  /** Attaches one resource to the open chat and closes, unless the drop rules block it. */
  const attachToChat = (kind: ChatResourceDragKind, id: string, label: string, resultId: string) => {
    if (!activeChat || !id) return false;
    const payload: ChatResourceDragPayload = { version: 1, kind, ids: [id], label };
    const blocked = resolveChatResourceDropAction(payload, activeChat);
    if (blocked?.type === "blocked") {
      // Silently returning false left the row looking live but doing nothing.
      toast.info(t(chatResourceBlockedKey(blocked), { name: label }));
      return false;
    }
    requestChatResourceAssignment(payload);
    recordUse(resultId);
    // A character or lorebook attaches quietly with an Undo toast, so the omnibar
    // stays open for the next one. The others can ask to replace the current
    // persona, preset or connection, or open agent setup, which must not open
    // behind this dialog.
    if (kind !== "character" && kind !== "lorebook") onClose();
    return true;
  };
  /**
   * Attaches a lorebook to the open chat unless it is already active there, in
   * which case there is nothing to attach (O4 item 1).
   */
  const attachLorebookIfNotActive = (result: OmnibarResult): boolean => {
    if (!activeChat) return false;
    const id = getOmnibarResourceId(result);
    if (!id) return false;
    const payload: ChatResourceDragPayload = { version: 1, kind: "lorebook", ids: [id], label: result.title };
    if (resolveChatResourceDropAction(payload, activeChat)?.type === "blocked") return false;
    return attachToChat("lorebook", id, result.title, result.id);
  };
  /** A lorebook row's own "Enabled" toggle, as opposed to the explicit "Add X to chat" suggestion row. */
  const isLorebookEnableToggleRow = (result: Pick<OmnibarResult, "category" | "control" | "action">) =>
    result.category === "lorebook" && result.control?.type === "toggle" && !result.action;
  const runDirectChatAction = (result: OmnibarResult) => {
    if (!activeChat || !isDirectActiveChatAction(query, result, searchResults)) return false;
    const kind = CHAT_RESOURCE_KIND[result.category];
    if (!kind) return false;
    return attachToChat(kind, getOmnibarResourceId(result), result.title, result.id);
  };
  // Typed dispatch for the results that do something other than open an entity.
  // Results without an `action` fall through to the generic entity-open path in
  // `choose` below.
  const runResultAction = (result: OmnibarResult, action: OmnibarAction) => {
    switch (action.kind) {
      case "open-mari-chat":
        setMariOpenChatId(action.chatId);
        openProfessorMari();
        return;
      case "slash": {
        const chatId = activeChatId;
        const command = `/${action.command} `;
        recordUse(result.id);
        onClose();
        // After the dialog unmounts, so the chat input keeps the focus it takes.
        if (chatId) requestAnimationFrame(() => dispatchCardAssetInsert(command, chatId));
        return;
      }
      case "goto-message":
        // The request is keyed by chat id and survives the switch, so a hit in
        // another chat opens that chat and the jump is picked up on arrival.
        if (action.chatId !== activeChatId && !navigate({ kind: "chat", chatId: action.chatId })) return;
        useChatStore.getState().requestGotoMessage(action.chatId, action.messageNumber);
        onClose();
        return;
      case "refine-query":
        setQuery(action.query);
        setActiveResultId(null);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      case "add-to-chat":
        attachToChat(action.resource, action.resourceId, action.label, result.id);
        return;
      case "detach-from-chat":
        if (detachFromChat(action.resource, action.resourceId, action.label)) recordUse(result.id);
        return;
      case "personal-extension":
        if (activatePersonalExtensionCommand(action.commandId)) {
          recordUse(result.id);
          onClose();
        }
        return;
      case "open-docs":
        ui().openModal("docs-viewer", {
          initialDoc: action.path,
          initialSearchTerm: query.trim().slice(0, 200),
        });
        recordUse(result.id);
        onClose();
        return;
      case "open-faq":
        ui().openModal("faq-viewer", { initialItemId: action.itemId });
        recordUse(result.id);
        onClose();
        return;
      case "open-global-search":
        openGlobalSearch(action.query);
        onClose();
        return;
      case "create-named":
        ui().openModal(action.modal, { defaultName: action.name });
        recordUse(result.id);
        onClose();
        return;
      case "start-character-chat":
        ui().openModal("start-character-chat", {
          characterId: action.characterId,
          characterName: action.characterName,
        });
        recordUse(result.id);
        onClose();
        return;
      case "start-chat":
        if (!confirmLeaveEditor()) return;
        recordUse(result.id);
        // Closing unmounts this dialog (and the mutation hook inside
        // `startNewChatMode`), so wait for it to settle first — otherwise the
        // chat gets created but the unmount drops its success callback.
        void startNewChatMode(action.mode)
          .catch(() => {
            /* The create mutation's own onError already surfaces a toast. */
          })
          .finally(() => onClose());
        return;
      case "open-lorebook-entry":
        if (!confirmLeaveEditor()) return;
        ui().openLorebookDetail(action.lorebookId, { initialTab: "entries", entryId: action.entryId });
        recordUse(result.id);
        onClose();
        return;
      case "open-chat-tool":
        recordUse(result.id);
        onClose();
        // After the dialog unmounts, so the panel it opens can anchor to a button
        // that is actually visible on screen again.
        requestAnimationFrame(() => {
          switch (action.tool) {
            case "summary":
              requestChatSummaryOpen(action.chatId);
              return;
            case "lorebook":
              requestChatLorebookEntriesOpen(action.chatId);
              return;
            case "search":
              requestChatSearchOpen(action.chatId);
              return;
            case "reply-checkup":
              requestChatReplyCheckup(action.chatId);
              return;
            case "regenerate":
              requestChatRegenerate(action.chatId);
              return;
          }
        });
        return;
    }
  };
  const choose = (result: OmnibarResult) => {
    if (result.action) {
      runResultAction(result, result.action);
      return;
    }
    if (isLorebookEnableToggleRow(result)) {
      // Enter/tap attaches it to the open chat when it is not already active
      // there, the same unambiguous rule "add <character>" uses, instead of
      // flipping the global Enabled switch — the default action used to
      // silently disable it app-wide with no visible Undo (O4 item 1). The
      // switch rendered beside the row is the only door left to that toggle.
      if (attachLorebookIfNotActive(result)) return;
      if (result.target && navigate(result.target)) {
        recordUse(result.id);
        onClose();
      }
      return;
    }
    // R9: the choice control (Keep/Restore) on an approval row is a quick action, not the
    // row's whole purpose — the row body below still navigates to that specific review.
    if (result.control && !isMariApprovalRow(result)) return;
    if (runDirectChatAction(result)) return;
    if (runSystemAction(result)) {
      recordUse(result.id);
      onClose();
      return;
    }
    // A dependency install or a sensitive file write executes on approval, so the
    // row opens the card that shows what will run instead of deciding in place; a
    // db-change review's inline Keep/Restore stays available too. Either way the
    // row targets THIS approval, in the Mari chat that made it if different from
    // whatever is currently open (R9).
    if (isMariApprovalRow(result)) {
      const approvalId = result.id.slice(MARI_APPROVAL_PREFIX.length);
      const approval = mariWorkspaceStatus.data?.pendingApprovals.find((item) => item.id === approvalId);
      const ownerChatId = approval ? chatIdForMariSession(approval.sessionId) : null;
      if (ownerChatId) setMariOpenChatId(ownerChatId);
      openProfessorMari(null, { reviewPending: approvalId });
      return;
    }
    if (result.id === "suggestion:edit-focused-field") {
      openProfessorMari(result, { submitDraft: mariSends(result) });
      return;
    }
    if (result.id === "ask-professor-mari") {
      if (result.group === "continue") {
        // The continue row resumes existing work, so there is nothing to submit.
        openProfessorMari(null, {
          reviewPending: (mariWorkspaceStatus.data?.pendingApprovals.length ?? 0) > 0,
        });
      } else if (asideLive) {
        // The answer grew inside this row, so continuing carries it along (G3).
        escalateAside();
      } else {
        // The row reads "Ask Mari: <your query>", so it sends. Enter always did;
        // click used to open with the text unsent, which no title promised.
        openProfessorMari(null, { submitDraft: true });
      }
      return;
    }
    if (result.category === "connection") {
      if (!confirmLeaveEditor()) return;
      ui().openConnectionDetail(result.id.slice("connection:".length));
      recordUse(result.id);
      onClose();
      return;
    }
    if (result.target && navigate(result.target)) {
      recordUse(result.id);
      onClose();
    }
  };
  const showResultDetail = (result: RankedOmnibarResult) => {
    setActiveResultId(result.id);
    setExpandedPreviewId(result.id);
  };
  // F5 (O5): the Fix row's connection choice has the control id
  // `connection:<id>` (that connection's own editor row, repurposed by
  // `contextResults` while a retry is offered), so it cannot join the static
  // CHAT_SCOPED_CHOICE_CONTROL_IDS set - it needs the same close+toast
  // treatment, derived from the same `lastAppError.retry` the row came from.
  const fixRowChoiceParentId =
    lastAppError?.retry?.kind === "open-connection" ? `connection:${lastAppError.retry.id}` : null;
  const isChatScopedChoiceControlId = (id: string) =>
    CHAT_SCOPED_CHOICE_CONTROL_IDS.has(id) || id === fixRowChoiceParentId;
  // F5 (O5): the inline segmented control on the row itself (the pill buttons a
  // mouse/touch user picks directly, with no expand step) called only
  // `control.onChange` - never the close+toast+recordUse below, so a direct
  // pick left search open with the next Enter pointed at an unrelated chat.
  // Shared with `chooseChoiceOption` below so a keyboard pick (via the
  // expanded option rows) gets the exact same treatment.
  const runScopedChoiceChange = (result: RankedOmnibarResult, value: string | boolean) => {
    if (!result.control) return;
    result.control.onChange(value);
    if (!isChatScopedChoiceControlId(result.id)) return;
    const optionLabel = result.control.options?.find((option) => option.value === value)?.label ?? String(value);
    toast.success(
      t("commandCenter.actions.chatControlChosen", "{{label}}: {{value}}", {
        label: result.description ?? result.command.title,
        value: optionLabel,
      }),
    );
    recordUse(result.id);
    onClose();
  };
  const chooseChoiceOption = (result: RankedOmnibarResult) => {
    if (!result.chooseValue) return false;
    result.chooseValue();
    // Keep the parent selected when the row came from an expansion, so the list
    // does not jump; a row found by typing has no parent on screen.
    const parentId = readChoiceOptionId(result.id)?.parentId;
    setExpandedChoiceId(null);
    if (parentId && isChatScopedChoiceControlId(parentId)) {
      toast.success(
        t("commandCenter.actions.chatControlChosen", "{{label}}: {{value}}", {
          label: result.description ?? result.command.title,
          value: result.title,
        }),
      );
      recordUse(result.id);
      onClose();
      return true;
    }
    if (parentId && presentation.results.some((row) => row.id === parentId)) setActiveResultId(parentId);
    return true;
  };
  // A settings-registry toggle (K5) gets an Undo toast, same pattern as the
  // chat-resource attach/remove toasts below; the hand-built control rows
  // (theme, presence, the original 9 toggles) keep their plain immediate flip.
  const flipToggleControl = (result: RankedOmnibarResult, nextValue: boolean) => {
    const control = result.control;
    if (!control || control.type !== "toggle") return;
    // F10 (O5): a lorebook row's own Enabled switch is now the only door to its
    // app-wide toggle (see `isLorebookEnableToggleRow` above) - a stray tap there
    // needs the same Undo as a settings toggle, not a silent flip.
    if (!result.id.startsWith("settings-control:") && result.category !== "lorebook") {
      control.onChange(nextValue);
      return;
    }
    const previousValue = control.value === true;
    // Pulse and RGB are mutually exclusive (same pair as the Appearance
    // settings row), so flipping one can silently turn the other off as a
    // side effect; Undo must restore both, not just the row that was flipped.
    const isAccentPair = result.id === "settings-control:accent-pulse" || result.id === "settings-control:rgb-mode";
    const previousPulse = isAccentPair ? useUIStore.getState().appAccentPulseMode : undefined;
    const previousRgb = isAccentPair ? useUIStore.getState().appAccentRgbMode : undefined;
    control.onChange(nextValue);
    const label = t("commandCenter.actions.settingToggled", "{{label}}: {{state}}", {
      label: result.title,
      state: nextValue ? t("commandCenter.values.enabled", "Enabled") : t("commandCenter.values.disabled", "Disabled"),
    });
    const flip = {
      label,
      undo: () => {
        if (lastSettingFlip === flip) lastSettingFlip = null;
        if (isAccentPair) {
          useUIStore.getState().setAppAccentPulseMode(previousPulse!);
          useUIStore.getState().setAppAccentRgbMode(previousRgb!);
        } else {
          control.onChange(previousValue);
        }
      },
    };
    lastSettingFlip = flip;
    toast.success(label, { action: { label: t("ui.chat.chatresourcedropoverlay.undo", "Undo"), onClick: flip.undo } });
  };
  const selectResult = (result: RankedOmnibarResult) => {
    if (chooseChoiceOption(result)) return;
    // A first tap opens the preview; a tap on the open row runs Enter, which the
    // preview no longer repeats as a chip.
    if (
      !result.control &&
      !resultOpensDirectlyOnTap(result) &&
      expandedPreviewId !== result.id &&
      isRichResult(result) &&
      window.matchMedia("(pointer: coarse)").matches
    ) {
      showResultDetail(result);
      return;
    }
    autoSelectionRef.current = false;
    setActiveResultId(result.id);
    // R9: the row body navigates to the review, not the generic expand/collapse a
    // settings-picker choice control gets — Keep/Restore stay reachable inline.
    if (isMariApprovalRow(result)) choose(result);
    else if (result.control?.type === "toggle" && !isLorebookEnableToggleRow(result))
      flipToggleControl(result, result.control.value !== true);
    else if (result.control?.type === "choice")
      setExpandedChoiceId((current) => (current === result.id ? null : result.id));
    else choose(result);
  };
  // Keyboard navigation scrolls the list under a resting cursor, and the browser
  // then fires a mousemove for the row that slid beneath it — which would drag the
  // selection back. Only a move to genuinely new screen coordinates counts as hover.
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const handleResultMouseMove = (result: RankedOmnibarResult, event: MouseEvent<HTMLLIElement>) => {
    const previous = pointerRef.current;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (previous && previous.x === event.clientX && previous.y === event.clientY) return;
    autoSelectionRef.current = false;
    setActiveResultId(result.id);
    // The preview renders for whatever is highlighted, and hover moves the
    // highlight. Without this the box under the expanded row would show the
    // hovered row's preview. Same rule the arrow keys already follow.
    if (expandedPreviewId) setExpandedPreviewId(isRichResult(result) ? result.id : null);
  };
  const handleEscape = () => {
    if (expandedPreviewId || expandedChoiceId) {
      // One expansion, one press. Collapsing does not close the omnibar.
      setExpandedPreviewId(null);
      setExpandedChoiceId(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (pane === "mari") {
      setMariChatOpen(false);
      setPane("results");
      focusMariReturnRow();
    } else onClose();
  };
  const moveSelection = (index: number) => {
    const next = results[index];
    autoSelectionRef.current = false;
    setActiveResultId(next?.id ?? null);
    if (expandedPreviewId) setExpandedPreviewId(next && isRichResult(next) ? next.id : null);
  };
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // An IME (Chinese, Japanese, ...) confirms its candidate with Enter, and
    // arrows move its candidate list, and Escape cancels the composition; none
    // of them belong to the result list or the dialog's own Escape handling.
    if (event.nativeEvent.isComposing) {
      event.stopPropagation();
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && inlineSuffix) {
      // Accept the ghost completion instead of leaving the field.
      event.preventDefault();
      setQuery(query + inlineSuffix);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleEscape();
    } else if (pane === "results" && event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(Math.min(Math.max(activeIndex, -1) + 1, results.length - 1));
    } else if (pane === "results" && event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(Math.max(activeIndex < 0 ? 0 : activeIndex - 1, 0));
    } else if (pane === "results" && event.key === "Home") {
      event.preventDefault();
      moveSelection(0);
    } else if (pane === "results" && event.key === "End") {
      event.preventDefault();
      moveSelection(results.length - 1);
    } else if (
      mariEnabled &&
      pane === "results" &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      asideLive &&
      (!activeResult || activeResult.id === "ask-professor-mari")
    ) {
      // No real row selected (the generic Ask-Mari row doesn't count), and the
      // aside is answering: ⌘↵ escalates it instead of just asking again (R25).
      event.preventDefault();
      escalateAside();
    } else if (
      mariEnabled &&
      pane === "results" &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      activeResult &&
      activeResult.command.availability?.status !== "requires-admin"
    ) {
      // Continue the selected result with Mari without opening the detail pane first.
      event.preventDefault();
      askMariAbout(resolveCurrentResult(activeResult));
    } else if (pane === "results" && event.key === "Enter" && !activeResult && mariEnabled && query.trim()) {
      // Nothing ranked at all, so Enter still reaches Mari by the one door.
      event.preventDefault();
      askMariAbout(null);
    } else if (
      pane === "results" &&
      event.key === "Enter" &&
      event.shiftKey &&
      activeResult &&
      activeResult.id.startsWith("settings-control:") &&
      activeResult.control?.type === "toggle" &&
      activeResult.target
    ) {
      // Enter flips a bound toggle in place (K5); Shift+Enter keeps the pre-K5
      // path of navigating to the control's spot in Settings instead.
      event.preventDefault();
      if (navigate(activeResult.target)) {
        recordUse(activeResult.id);
        onClose();
      }
    } else if (pane === "results" && event.key === "Enter" && activeResult) {
      event.preventDefault();
      if (chooseChoiceOption(activeResult)) return;
      if (isMariApprovalRow(activeResult)) choose(activeResult);
      else if (activeResult.control?.type === "toggle" && !isLorebookEnableToggleRow(activeResult))
        flipToggleControl(activeResult, activeResult.control.value !== true);
      else if (activeResult.control?.type === "choice")
        setExpandedChoiceId((current) => (current === activeResult.id ? null : activeResult.id));
      else if (mariEnabled && activeResult.id === "ask-professor-mari") {
        // An answer grown inside the promoted row goes along with the question (G3).
        if (asideLive && activeResult.group !== "continue") escalateAside();
        else openProfessorMari(null, { submitDraft: true });
      } else choose(activeResult);
    } else if (pane === "results" && event.key === "ArrowLeft" && activeResult && expandedPreviewId) {
      event.preventDefault();
      setExpandedPreviewId(null);
    } else if (
      pane === "results" &&
      event.key === "ArrowLeft" &&
      activeResult &&
      expandedChoiceId &&
      (activeResult.id === expandedChoiceId || readChoiceOptionId(activeResult.id)?.parentId === expandedChoiceId)
    ) {
      // Collapse before the generic ArrowLeft below returns focus to the input,
      // so one press does one thing.
      event.preventDefault();
      setExpandedChoiceId(null);
      setActiveResultId(expandedChoiceId);
    } else if (
      pane === "results" &&
      event.key === "ArrowRight" &&
      activeResult &&
      activeResult.control?.type === "choice"
    ) {
      event.preventDefault();
      setExpandedChoiceId(activeResult.id);
    } else if (pane === "results" && event.key === "ArrowRight" && activeResult && isRichResult(activeResult)) {
      event.preventDefault();
      setExpandedPreviewId((current) => (current === activeResult.id ? null : activeResult.id));
    }
  };
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    // L8: the omnibar may sit over a dialog or the game setup wizard. An Escape
    // pressed inside it (also one a menu or row already handled) is its own, so
    // it must not reach their document/window listeners and close them too.
    if (event.key === "Escape" && panelRef.current?.contains(event.target as Node)) event.stopPropagation();
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      handleEscape();
      return;
    }
    const focusedRow = (event.target as HTMLElement).closest<HTMLElement>("[data-command-center-result-row]");
    const focusedRowButton = focusedRow?.querySelector<HTMLElement>(":scope > button");
    if (focusedRow && event.target === focusedRowButton && pane === "results") {
      const rowId = focusedRow.dataset.resultId;
      // Hover moves the highlight without moving DOM focus, so arrows continue
      // from what is highlighted — otherwise they jump back to the focused row.
      const rowIndex = activeIndex >= 0 ? activeIndex : results.findIndex((result) => result.id === rowId);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? results.length - 1
              : event.key === "ArrowDown"
                ? Math.min(rowIndex + 1, results.length - 1)
                : Math.max(rowIndex - 1, 0);
        const next = results[nextIndex];
        if (next) {
          // Through `moveSelection`, so this path keeps the expansion in step
          // with the selection exactly as the input-focused arrows and hover do.
          moveSelection(nextIndex);
          listRef.current?.querySelector<HTMLElement>(`[data-result-id="${CSS.escape(next.id)}"] button`)?.focus();
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (event.key === "ArrowRight") {
        const focusedResult = results[rowIndex];
        if (focusedResult?.control?.type === "choice") {
          event.preventDefault();
          setExpandedChoiceId(focusedResult.id);
          return;
        }
        if (focusedResult && isRichResult(focusedResult)) {
          event.preventDefault();
          setExpandedPreviewId((current) => (current === focusedResult.id ? null : focusedResult.id));
          return;
        }
      }
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        !element.closest('[aria-hidden="true"], [inert]') &&
        element.getClientRects().length > 0,
    );
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? current <= 0
        ? focusable.length - 1
        : current - 1
      : current === focusable.length - 1
        ? 0
        : current + 1;
    event.preventDefault();
    focusable[next]?.focus();
  };
  const setCategoryFilter = (nextFilter: CommandCenterCategoryFilter) => {
    setFilter(nextFilter);
    setActiveResultId(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  // Only reachable from the back button, which renders when the pane is not the
  // list — and `mari` is the only other pane.
  const leaveDetail = () => {
    setMariChatOpen(false);
    setPane("results");
    focusMariReturnRow();
  };
  /** M9: the arrival cards only the omnibar can run. */
  const runArrivalAction = (action: MariArrivalAction) => {
    if (action.kind === "undo-setting") {
      lastSettingFlip?.undo();
      setSettingUndoVersion((current) => current + 1);
    } else if (action.kind === "find-setting") {
      setMariChatOpen(false);
      setPane("results");
      setQuery(omnibarScopePrefix("settings"));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };
  // M18: ⌘J asks Mari about this screen; with her already open it goes back to the search. The host
  // opens the omnibar for it while it is shut; from here on this listener owns the shortcut.
  const toggleMariPane = useEffectEvent(() => {
    if (pane === "mari") leaveDetail();
    else openProfessorMari(null, { arrival: !query.trim() });
  });
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !isAskMariShortcut(event)) return;
      if (!useUIStore.getState().commandCenterMariEnabled) return;
      // A dialog opened above the omnibar (a confirm from Mari, say) keeps the keyboard, as with ⌘K.
      const dialog = event.target instanceof Element ? event.target.closest('[aria-modal="true"]') : null;
      if (dialog && !dialog.closest('[data-component="GlobalOmnibar"]')) return;
      event.preventDefault();
      toggleMariPane();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const fixRowId = mariFixRowId(lastAppError);
  /** Ranked rows and plain context rows both feed the Mari handoff. */
  type OmnibarAskFocus = Pick<OmnibarResult, "id" | "title" | "category"> | null;
  /** Quick and full Mari hand over the same context, so they read the same surroundings. */
  const buildAskContext = (
    message: string,
    focusResult: OmnibarAskFocus,
    asideAnswer?: { query: string; answer: string; tier: "local" | "remote" },
    options: { fix?: boolean } = {},
  ) => {
    // The "fix this" door only opens on a deliberate pick of the Fix row (⌘↵/Enter on it, or the
    // arrival Fix card) — never implicitly, because a built-in agent's editor row and Fix row share
    // an id, so "focus id equals Fix row id" can also be true for a plain fallback focus (A5/N6).
    const fix = Boolean(options.fix);
    const source = fix ? ("chat-error" as const) : gameSetupStep ? ("game-setup" as const) : undefined;
    return buildProfessorMariCommandCenterContext(message, focusResult, [], focusResult?.id, {
      activeChat: activeChat ? { id: activeChat.id, label: activeChat.name, mode: activeChat.mode } : undefined,
      settingsLocation:
        settingsPanelVisible && (settingsTab || settingsTargetControlId)
          ? { tab: settingsTab ?? undefined, controlId: settingsTargetControlId ?? undefined }
          : undefined,
      field: gameSetupStep ?? activeEditorField?.label,
      fieldId: gameSetupStep ? undefined : activeEditorField?.id,
      // Only the deliberate "fix this" handoff actually needs lastAppError's text; every other
      // Mari call (R22) must not carry it along just because an unrelated error happens to be live.
      error: fix && lastAppError ? { message: lastAppError.message, code: lastAppError.code } : undefined,
      source,
      asideAnswer,
    });
  };
  /** Both Mari routes remember the row they left, so returning restores focus. */
  const rememberMariReturn = (focusResult: OmnibarAskFocus) => {
    const returnResultId = focusResult?.id ?? activeResultId;
    mariReturnResultIdRef.current = returnResultId;
    setSessionValue("mariReturnResultId", returnResultId);
  };
  const openProfessorMari = (
    selectedResult: OmnibarAskFocus = null,
    // R9: `reviewPending: true` opens on any pending review (the generic continue row, the
    // completion action); a string targets that one review specifically (the per-approval row).
    options: { reviewPending?: boolean | string; submitDraft?: boolean; arrival?: boolean } = {},
  ) => {
    // A scope prefix like "faq:" is omnibar search syntax, not part of the
    // message text — strip it before it lands in Mari's composer. M9: an arrival
    // brings no text, and the open chat travels as its own facet, not also as a
    // "Current chat" resource.
    const draft = options.arrival ? "" : parseOmnibarScope(query.trim()).query;
    if (draft) useChatStore.getState().setInputDraft(PROFESSOR_MARI_DRAFT_KEY, draft);
    // A deliberate pick of the Fix row — not the fallback landing on the same id — is what opens
    // the chat-error door (A5/N6): `selectedResult` is only set on an actual pick.
    const fix = Boolean(selectedResult && fixRowId && selectedResult.id === fixRowId);
    const focusResult =
      selectedResult ?? mariFallbackFocus(contextResults, options.arrival ? `chat:${activeChat?.id}` : null);
    rememberMariReturn(focusResult);
    // The focused-field row is about the open editor, so Mari gets that resource beside the field.
    const askFocus =
      focusResult?.id === "suggestion:edit-focused-field"
        ? (contextResults.find((row) => row.id === omnibarContext.openResource?.resultId) ?? focusResult)
        : focusResult;
    enterMariPane(buildAskContext(draft, askFocus, undefined, { fix }), options.submitDraft);
    if (options.reviewPending) {
      setMariPendingReviewId(typeof options.reviewPending === "string" ? options.reviewPending : null);
      setMariPendingReviewRequest((current) => current + 1);
    }
    // R7: a Fix pick that sends nothing is a door too, so it lands in this screen's thread like ⌘J.
    if (options.arrival || (fix && !options.submitDraft)) setMariArrivalAppendRequest((current) => current + 1);
  };
  /**
   * One rule for every "take this to Mari" door: typed text that asks for something is sent.
   * The Ask-Mari row's title is the query itself, so it always sends; the continue row resumes
   * work that is already running, so it never does.
   */
  const mariSends = (result: OmnibarResult | null) =>
    result?.id === "ask-professor-mari" ? result.group !== "continue" : isMariInstruction(query, result?.title);
  const askMariAbout = (result: RankedOmnibarResult | null) =>
    openProfessorMari(result, { submitDraft: mariSends(result) });
  /**
   * R25: `⌘↵` with the aside answering takes its query and answer into the full agent.
   * From the follow-up line, the question typed there is what Mari is asked.
   */
  const escalateAside = (question?: string) => {
    if (!asideLive) return;
    const draft = question ?? asideState.query;
    if (draft) useChatStore.getState().setInputDraft(PROFESSOR_MARI_DRAFT_KEY, draft);
    const focusResult = mariFallbackFocus(contextResults);
    rememberMariReturn(focusResult);
    enterMariPane(
      buildAskContext(draft, focusResult, {
        // The aside escalation is never the deliberate Fix-row pick, so `fix` stays unset below.
        // Match the server's zod limits so an over-length aside can't 400 the whole send.
        query: asideState.query.slice(0, 500),
        answer: omnibarAsideHandoffAnswer(asideState.answer, asideState.followUp).slice(0, 4_000),
        tier: asideState.tier,
      }),
      true,
    );
  };
  // A handed-off task is "finished" once Mari has been seen working and then
  // stops. Advancing the persisted status rather than detecting the edge in a ref
  // means the transition still lands when it happens between two opens.
  const mariActive = mariWorkspaceStatus.data?.active ?? false;
  useEffect(() => {
    setSession((current) => {
      const mariHandoff = advanceMariHandoff(current.mariHandoff, mariActive);
      return mariHandoff === current.mariHandoff ? current : { ...current, mariHandoff };
    });
  }, [mariActive]);
  const completionActions = mariFinished ? omnibarCompletionActions(mariHandoff.context) : [];
  const runCompletionAction = (action: OmnibarCompletionAction) => {
    setSessionValue("mariHandoff", null);
    if (action.kind === "return") {
      leaveDetail();
      return;
    }
    if (action.kind === "review") {
      setMariPendingReviewRequest((current) => current + 1);
      return;
    }
    // Open the resource through the existing result path so dirty-editor and
    // navigation rules still apply. Characters can deep-link to the edited field.
    const resource = action.resource;
    if (!resource) return;
    if (resource.kind === "character") {
      if (!confirmLeaveEditor()) return;
      ui().openCharacterDetail(resource.id, {
        ...(action.kind === "open-field" ? { initialTab: action.field === "Greeting" ? "convo" : "card" } : {}),
      });
      onClose();
      return;
    }
    const result = currentResultById.get(`${resource.kind}:${resource.id}`);
    if (result) choose(result);
  };

  // Keyed by row id so the two per-row lookups below stay O(1); a linear scan
  // over every chat, twice per rendered row, showed up on large libraries.
  const chatModeByResultId = useMemo(
    () => new Map(data.chats.map((chat) => [`chat:${chat.id}` as string, chat.mode] as const)),
    [data.chats],
  );
  // Q6: what each row is. Entity rows take their kind's icon (and a badge on a portrait); a chat
  // takes its mode. Commands and settings keep the icon they name (Home, Backups, Spotify).
  const resultType = (result: RankedOmnibarResult): ResultType | undefined => {
    const prefix = result.id.split(":")[0];
    if (prefix === "message") return "message";
    if (prefix === "mari-chat") return "mari-chat";
    if (prefix === "lorebook-entry") return "lorebook-entry";
    if (result.action?.kind === "start-chat") return chatResultType(result.action.mode);
    if (result.category === "chat") {
      const mode = chatModeByResultId.get(result.id);
      return mode ? chatResultType(mode) : undefined;
    }
    return OMNIBAR_CATEGORY_RESULT_TYPE[result.category];
  };
  const resultIcon = (result: RankedOmnibarResult) => {
    const type = resultType(result);
    return type && type !== "setting" && type !== "doc"
      ? RESULT_TYPE_ICONS[type]
      : getCommandIcon(result.command.icon, result.command.kind);
  };
  const resultVisual = (result: RankedOmnibarResult) => {
    if (result.category === "chat") {
      const mode = chatModeByResultId.get(result.id);
      if (mode) return getCommandCenterChatModeVisual(mode as ChatMode, chatModeLabels);
    }
    return getCommandCenterCategoryVisual(result.category, categoryLabels);
  };
  /**
   * What Enter does, in one word. Resource rows open an editor even when the row
   * shows only a name, so "Open" alone was misleading in the context group.
   */
  // What Enter does on this row (R8), from the same dispatch `choose` runs: an
  // "Add Eliza to this chat" row must not say Edit.
  const resultEnterHint = (result: RankedOmnibarResult) => {
    if (result.id === "ask-professor-mari") {
      return result.group === "continue" ? t("commandCenter.open", "Open") : t("commandCenter.enter.ask", "Ask");
    }
    if (result.id.startsWith("mari-approval:")) return t("commandCenter.enter.review", "Review");
    if (result.chooseValue) return t("commandCenter.enter.choose", "Choose");
    switch (result.action?.kind) {
      case "add-to-chat":
        return t("commandCenter.enter.add", "Add");
      case "detach-from-chat":
        return t("commandCenter.enter.remove", "Remove");
      case "slash":
        return t("commandCenter.enter.insert", "Insert");
      case "goto-message":
        return t("commandCenter.enter.jump", "Jump to");
      case "open-docs":
      case "open-faq":
        return t("commandCenter.read", "Read");
      case "open-global-search":
        return t("commandCenter.enter.search", "Search");
      case "personal-extension":
        return t("commandCenter.enter.run", "Run");
      case "open-lorebook-entry":
        return t("commandCenter.edit", "Edit");
      case "create-named":
        return t("commandCenter.enter.create", "Create");
      case "start-character-chat":
      case "start-chat":
        return t("commandCenter.enter.start", "Start");
    }
    if (activeChat && CHAT_RESOURCE_KIND[result.category] && isDirectActiveChatAction(query, result, searchResults)) {
      return t("commandCenter.enter.add", "Add");
    }
    return EDITOR_CATEGORIES.has(result.category)
      ? t("commandCenter.edit", "Edit")
      : result.category === "docs"
        ? t("commandCenter.read", "Read")
        : t("commandCenter.open", "Open");
  };
  // Matched against the in-flight mutation's own id: keying on `isPending` alone
  // put a spinner on every persona row while one persona was activating.
  const resultControlPending = (result: RankedOmnibarResult) => {
    const resourceId = getOmnibarResourceId(result);
    if (result.category === "lorebook") return updateLorebook.isPending && updateLorebook.variables?.id === resourceId;
    if (result.category === "preset") return setDefaultPreset.isPending && setDefaultPreset.variables === resourceId;
    return result.id.startsWith("control:chat-") && (updateChat.isPending || updateChatMetadata.isPending);
  };
  const liveMessage = loading
    ? t("commandCenter.live.loading", "Loading results")
    : failed
      ? t("commandCenter.live.partialFailure", "{{count}} results. Some sources could not be loaded.", {
          count: results.length,
        })
      : t("commandCenter.live.resultCount", "{{count}} results", { count: results.length });
  const currentResultById = useMemo(() => {
    const current = new Map(results.map((result) => [result.id, result] as const));
    for (const result of searchableEntityResults) {
      if (current.has(result.id)) continue;
      current.set(result.id, {
        ...result,
        command: {
          id: result.id,
          title: result.title,
          kind: result.kind ?? "resource",
          icon: result.icon ?? "command",
          target: result.target,
          availability: { status: "available" as const },
        },
      } as RankedOmnibarResult);
    }
    return current;
  }, [results, searchableEntityResults]);
  const resolveCurrentResult = (result: RankedOmnibarResult | null) =>
    result ? (currentResultById.get(result.id) ?? null) : null;
  // Always show the detail panel for whatever result is currently selected.
  const previewResult = resolveCurrentResult(activeResult ?? null);
  const previewDetail = usePreviewDetail(previewResult);

  // The row already runs its Enter action, so the expansion offers only the others
  // (D3): an "Edit character" chip under a row whose Enter edits is the same door twice.
  const previewEnterHint = previewResult && !previewResult.control ? resultEnterHint(previewResult) : null;
  const previewActions = previewResult
    ? (() => {
        if (previewResult.command.availability?.status === "requires-admin") return [];
        // Only for what she can change; a setting, a message or a doc has nothing to continue.
        const mariActions =
          mariEnabled && MARI_EDITABLE_CATEGORIES.has(previewResult.category) && !previewResult.action
            ? [
                {
                  label: t("commandCenter.actions.continueWithMari", "Continue with Mari"),
                  icon: Sparkles,
                  onSelect: () => askMariAbout(previewResult),
                },
              ]
            : [];
        if (previewResult.control?.type === "choice") return mariActions;
        const resourceKind = CHAT_RESOURCE_KIND[previewResult.category];
        const resourceId = resourceKind ? getOmnibarResourceId(previewResult) : "";
        const connection =
          resourceKind === "connection"
            ? (connections.data ?? []).find((item) => readNamedRow(item)?.id === resourceId)
            : undefined;
        const payload: ChatResourceDragPayload | null = resourceKind
          ? {
              version: 1,
              kind: resourceKind,
              ids: [resourceId],
              label: previewResult.title,
              ...(connection && !isLanguageGenerationConnection(connection)
                ? { unsupported: "connection-kind" as const }
                : {}),
            }
          : null;
        const rowResource =
          resourceKind === "character" ||
          resourceKind === "persona" ||
          resourceKind === "preset" ||
          resourceKind === "connection"
            ? resourceKind
            : null;
        const rowState = rowResource
          ? resolveOmnibarRowState({
              resource: rowResource,
              id: resourceId,
              activeChat,
              globallyActive:
                previewResult.category === "persona"
                  ? previewResult.control?.value === true
                  : previewResult.category === "preset"
                    ? previewResult.control?.value === true
                    : undefined,
            })
          : null;
        const canAddToChat =
          payload &&
          activeChat &&
          (!rowState || rowState.canAddToChat) &&
          resolveChatResourceDropAction(payload, activeChat)?.type !== "blocked";
        const addToChatAction =
          payload && canAddToChat && previewEnterHint !== t("commandCenter.enter.add", "Add")
            ? {
                label: t("commandCenter.actions.addToThisChat", "Add to this chat"),
                icon: MessageCircle,
                onSelect: () => {
                  requestChatResourceAssignment(payload);
                  recordUse(previewResult.id);
                  onClose();
                },
              }
            : null;
        // Enter on a persona or preset row flips its toggle, which is the global action.
        if (previewResult.category === "persona" || previewResult.category === "preset") {
          return [...mariActions, ...(addToChatAction ? [addToChatAction] : [])];
        }
        if (previewResult.category === "lorebook") {
          const inActiveChat = Boolean(activeChat && attachedResultIds.has(previewResult.id));
          // Enter on the row itself attaches (or is a no-op) rather than
          // editing (O4 item 1), so editing always stays a dedicated action here.
          const editAction = {
            label: t("commandCenter.actions.editLorebook", "Edit lorebook"),
            icon: Edit3,
            onSelect: () => {
              if (previewResult.target && navigate(previewResult.target)) {
                recordUse(previewResult.id);
                onClose();
              }
            },
          };
          const askMariAction = mariEnabled
            ? {
                label: t("commandCenter.mode.work", "Ask Mari"),
                icon: Sparkles,
                onSelect: () => askMariAbout(previewResult),
              }
            : null;
          const contextAction = inActiveChat
            ? {
                label: t("commandCenter.actions.removeFromThisChat", "Remove from this chat"),
                icon: X,
                danger: true,
                onSelect: () => detachFromChat("lorebook", resourceId, previewResult.title),
              }
            : addToChatAction;
          return [editAction, ...(askMariAction ? [askMariAction] : []), ...(contextAction ? [contextAction] : [])];
        }
        if (previewResult.category === "character") {
          const characterId = getOmnibarResourceId(previewResult);
          const startChatAction =
            previewEnterHint !== t("commandCenter.enter.start", "Start")
              ? {
                  label: t("commandCenter.actions.startChat", "Start chat"),
                  icon: Play,
                  onSelect: () => {
                    ui().openModal("start-character-chat", { characterId, characterName: previewResult.title });
                    recordUse(previewResult.id);
                    onClose();
                  },
                }
              : null;
          // Symmetric to add-to-chat: when the character is already a participant,
          // the most useful scene action is removing it from the active chat.
          const removeFromChatAction =
            activeChat &&
            characterId &&
            rowState?.inActiveChat &&
            previewEnterHint !== t("commandCenter.enter.remove", "Remove")
              ? {
                  label: t("commandCenter.actions.removeFromThisChat", "Remove from this chat"),
                  icon: UserMinus,
                  danger: true,
                  onSelect: () => {
                    void updateChat.mutateAsync({
                      id: activeChat.id,
                      characterIds: (activeChat.characterIds ?? []).filter((id) => id !== characterId),
                    });
                    recordUse(previewResult.id);
                    onClose();
                  },
                }
              : null;
          return [
            ...(removeFromChatAction ? [removeFromChatAction] : addToChatAction ? [addToChatAction] : []),
            ...(startChatAction ? [startChatAction] : []),
          ];
        }
        // Resume chat, Open documentation and Open were all Enter.
        return [...mariActions, ...(addToChatAction ? [addToChatAction] : [])];
      })()
    : [];

  // The quick answer, as the expansion of the promoted Ask row: only ever below the selection (R9).
  const renderAsideAnswer = () => (
    <Suspense fallback={null}>
      <OmnibarAside
        state={asideState}
        connectionName={asideConnectionName}
        disclosed={asideDisclosed}
        onDisclose={() => setAsideDisclosed(true)}
        onDisable={() => {
          setAsideEnabled(false);
          setAsideDisclosed(true);
        }}
        onEscalate={() => escalateAside()}
        onChooseModel={() => openSettings("quick-answer-model")}
        onRetry={asideState.retry}
        onAnswerAgain={asideState.answerAgain}
        // One quick follow-up; the question after it goes to full Mari (G4).
        onFollowUp={(question) => (asideState.followUp ? escalateAside(question) : asideState.askFollowUp(question))}
        links={asideLinks.map((row) => ({ id: row.id, title: row.title }))}
        onOpenLink={(id) => {
          const row = asideLinks.find((item) => item.id === id);
          if (row) choose(row);
        }}
        showDownloadAgents={asideAgentPackageIds.length > 0}
        onOpenDownloadAgents={() => {
          openRightPanel("agents");
          openAgentCatalog(asideAgentPackageIds[0]);
          onClose();
        }}
      />
    </Suspense>
  );
  // The body of the expanded row, rendered inline under the selected row.
  const renderResultPreview = () =>
    previewResult ? (
      <Suspense fallback={null}>
        <OmnibarDetailPane
          result={previewResult}
          actions={previewActions}
          extraFacts={previewDetail.extraFacts}
          note={previewDetail.note}
          detailLoading={previewDetail.detailLoading}
          contextStatusLabel={
            previewResult.category === "character"
              ? activeChat?.characterIds?.includes(getOmnibarResourceId(previewResult))
                ? t("commandCenter.preview.inThisChat", "In this chat")
                : undefined
              : previewResult.category === "lorebook" && activeChat
                ? attachedResultIds.has(previewResult.id)
                  ? t("commandCenter.preview.activeInThisChat", "Active in this chat")
                  : t("commandCenter.preview.notInThisChat", "Not in this chat")
                : undefined
          }
        />
      </Suspense>
    ) : null;

  return createPortal(
    <motion.div
      ref={panelRef}
      data-component="GlobalOmnibar"
      data-over-dialog={overDialog ? "true" : undefined}
      data-pane={pane}
      data-mode={pane === "mari" ? "work" : "find"}
      className="fixed inset-0 z-(--mari-layer-omnibar) flex items-start justify-center bg-black/55 backdrop-blur-sm motion-safe:transition-[padding] motion-safe:duration-300 sm:px-6 sm:pt-[var(--omnibar-top)]"
      // An empty bar sits lower, near the middle, so the hint field below it has
      // room; it rides back up as soon as results need the space.
      style={{ "--omnibar-top": idle && !mariSurface ? "26vh" : "10vh" } as React.CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={trapFocus}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-omnibar-title"
        ref={dialogRef}
        data-component="GlobalOmnibar.Panel"
        className={`relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--card)] shadow-2xl ${fromPull ? "" : "motion-safe:animate-omnibar-in"} sm:max-w-[44rem] sm:rounded-2xl sm:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] sm:ring-1 sm:ring-[var(--border)]/60 motion-safe:transition-[height,max-height,max-width] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none ${
          pane === "mari"
            ? "mari-workspace-shell sm:h-[min(44rem,80dvh)] sm:max-h-[min(44rem,80dvh)]"
            : idle && !settingsOpen
              ? "sm:h-auto sm:max-h-none"
              : "sm:h-[min(36rem,68dvh)] sm:max-h-[min(36rem,68dvh)]"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(120%_100%_at_12%_0%,oklch(0.72_0.16_255/0.12),transparent_60%),radial-gradient(120%_100%_at_88%_0%,oklch(0.73_0.21_345/0.11),transparent_60%)]"
        />
        <h2 id="global-omnibar-title" className="sr-only">
          {mariSurface ? t("commandCenter.workTitle", "Professor Mari") : t("omnibar.title", "Search Marinara")}
        </h2>
        <header className="relative z-50 shrink-0 overflow-visible pt-[env(safe-area-inset-top)]">
          <div
            className={cn(
              "flex items-center",
              mariSurface
                ? "mari-workspace-header h-12 px-2"
                : "h-16 gap-3 border-b border-[var(--border)] px-3 sm:h-14 sm:px-4",
            )}
          >
            {pane !== "results" ? (
              <button
                ref={backButtonRef}
                type="button"
                onClick={leaveDetail}
                aria-label={
                  mariSurface
                    ? t("commandCenter.backToFind", "Back to search")
                    : t("commandCenter.backToResults", "Back to results")
                }
                // M18: ⌘J goes back to the search from Mari, so the button says so.
                title={mariSurface ? t("commandCenter.keyboard.backToSearch", "Back to search (Ctrl/⌘+J)") : undefined}
                aria-keyshortcuts={mariSurface ? (isApplePlatform() ? "Meta+J" : "Control+J") : undefined}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] sm:size-9"
              >
                <ChevronLeft size={18} />
              </button>
            ) : (
              <Search
                size={19}
                aria-hidden="true"
                data-mari-pull-target="search"
                className="shrink-0 text-[var(--primary)]"
              />
            )}
            <AnimatePresence initial={false} mode="wait">
              {mariSurface ? (
                <motion.div
                  key="omnibar-mari-header"
                  initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
                  className="flex min-w-0 flex-1 flex-col justify-center px-1"
                >
                  {/* Row 1: her name and live status, no portrait (she is in the transcript). The status text
                      comes from her chat through `mariStatusSlot`; row 2 below holds the destinations. */}
                  <span className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
                    {t("omnibar.categories.professor", "Professor Mari")}
                  </span>
                  <span
                    ref={setMariStatusSlot}
                    className="mari-omnibar-header-status truncate text-[0.6875rem] font-medium leading-tight text-[var(--muted-foreground)]"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="omnibar-search-header"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : inputTravel ? { opacity: 0, y: inputTravel } : { opacity: 0, x: 10 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: inputTravel ? 0.28 : 0.16, ease: "easeOut" }}
                  className="relative z-20 flex min-w-0 flex-1"
                >
                  <InlineGhostText
                    value={query}
                    suffix={inlineSuffix}
                    className="text-base font-medium leading-normal"
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setFilter("all");
                      setPane("results");
                    }}
                    type="search"
                    // The browser's own suggestion popup steals ArrowUp/ArrowDown
                    // from the result list, so every native assist is off here.
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label={t("omnibar.inputLabel", "Search Marinara")}
                    // Focus stays in the field while the arrows move the selection,
                    // so point screen readers at the selected row.
                    aria-controls={listVisible ? "global-omnibar-results" : undefined}
                    aria-activedescendant={listVisible && activeResult ? `omnibar-${activeResult.id}` : undefined}
                    onKeyDown={onInputKeyDown}
                    placeholder={
                      idle
                        ? idleGreeting
                        : // ponytail: read once per open (the dialog remounts each time); a resize
                          // while open keeps the old text. Use a shared media hook if one lands.
                          window.matchMedia("(min-width: 640px)").matches
                          ? t("commandCenter.placeholder", "Search everything, or narrow with faq:, docs:, msg:, char:")
                          : t("commandCenter.placeholderShort", "Search everything")
                    }
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-[var(--foreground)] outline-none placeholder:font-normal placeholder:text-[var(--muted-foreground)] [&::-webkit-search-cancel-button]:hidden"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {query && !mariSurface ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setActiveResultId(null);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                aria-label={t("commandCenter.clearSearch", "Clear search")}
                title={t("commandCenter.clearSearch", "Clear search")}
                className="inline-flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_12%,var(--card))] text-[var(--muted-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_20%,var(--card))] hover:text-[var(--foreground)]"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            ) : null}
            {!mariSurface && mariEnabled ? (
              <button
                type="button"
                onClick={() => askMariAbout(null)}
                aria-label={t("commandCenter.openWork", "Ask Professor Mari")}
                title={t("commandCenter.openWork", "Ask Professor Mari")}
                data-component="GlobalOmnibar.ProfessorMariButton"
                data-mari-glow={mariWorkingInBackground ? "true" : "false"}
                className="group relative -mb-px flex h-14 w-[4.25rem] shrink-0 self-end items-end justify-end pb-2 pl-8 [--mari-glow-size:3.4rem] [--mari-glow-top:0.05rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] max-[30rem]:w-11 max-[30rem]:pl-0"
              >
                {/* P1: only the tall portrait is cropped, so her working glow on the button fades out freely. */}
                <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
                  <img
                    src={appearance.portraits.idle}
                    alt=""
                    draggable={false}
                    className="absolute left-1/2 top-0 h-[6.5rem] w-auto max-w-none -translate-x-1/2 object-contain object-top transition-transform duration-200 ease-out group-hover:-translate-y-1 group-focus-visible:-translate-y-1 motion-reduce:transition-none max-[30rem]:h-20"
                  />
                </span>
              </button>
            ) : null}
            {mariSurface ? <OmnibarSettingsButton open={settingsOpen} onOpen={() => openSettings()} /> : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close", "Close")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] sm:size-9"
            >
              <X size={18} />
            </button>
          </div>
          {mariSurface ? (
            <div ref={setMariHeaderSlot} className="mari-omnibar-header-slot mari-omnibar-header-row" />
          ) : null}
          {!query.trim() && !mariSurface ? (
            <div
              role="toolbar"
              aria-label={t("commandCenter.scopeChips.label", "Search a category")}
              data-component="GlobalOmnibar.ScopeChips"
              className="omnibar-horizontal-strip scrollbar-hide flex min-h-11 items-center gap-1 overflow-x-auto border-b border-[var(--border)] py-1.5 pl-3 pr-6 overscroll-x-contain sm:min-h-10"
            >
              {OMNIBAR_SCOPE_CHIP_FILTERS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  data-omnibar-scope-chip={chip}
                  onClick={() => {
                    const scope = FILTER_CATEGORY[chip];
                    if (!scope) return;
                    // Write the prefix rather than setting hidden state, so the
                    // syntax is visible in the field the moment it is used.
                    setQuery(omnibarScopePrefix(scope));
                    setFilter("all");
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className="min-h-8 shrink-0 rounded-md px-2.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {filterLabels[chip]}
                </button>
              ))}
            </div>
          ) : null}
          {query.trim() && !mariSurface ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
              role="toolbar"
              aria-label={t("commandCenter.filters.label", "Result categories")}
              data-component="GlobalOmnibar.Filters"
              className="omnibar-horizontal-strip scrollbar-hide flex min-h-11 items-center gap-1 overflow-x-auto border-b border-[var(--border)] py-1.5 pl-3 pr-6 overscroll-x-contain sm:min-h-10"
            >
              {availableFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setCategoryFilter(item)}
                  className={`min-h-8 shrink-0 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${filter === item ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"}`}
                >
                  {filterLabels[item]}
                </button>
              ))}
            </motion.div>
          ) : null}
        </header>

        {pane === "results" ? (
          <div data-component="GlobalOmnibar.LiveResults" className="sr-only" aria-live="polite" aria-atomic="true">
            {liveMessage}
          </div>
        ) : null}

        {mariMounted ? (
          <Suspense fallback={null}>
            <OmnibarMariPane
              active={pane === "mari"}
              reduceMotion={reduceMotion}
              mariContext={mariContext}
              submitDraftRequest={mariSubmitDraftRequest}
              mariOpenChatId={mariOpenChatId}
              mariPendingReviewRequest={mariPendingReviewRequest}
              mariPendingReviewId={mariPendingReviewId}
              mariChatOpen={mariChatOpen}
              onChatWindowOpenChange={(open) => {
                setMariChatOpen(open);
                if (!open) {
                  setPane("results");
                  const returnResultId = mariReturnResultIdRef.current;
                  if (returnResultId) setActiveResultId(returnResultId);
                  focusMariReturnRow();
                }
              }}
              completionActions={completionActions}
              onCompletionAction={runCompletionAction}
              omnibarHeaderSlot={mariHeaderSlot}
              omnibarStatusSlot={mariStatusSlot}
              arrival={mariArrival}
              arrivalAppendRequest={mariArrivalAppendRequest}
              arrivalThread={mariThreadContext}
              onArrivalAction={runArrivalAction}
              // N6: what an arrival Fix card sends with: the same handoff as a deliberate pick of the Fix row.
              arrivalFixContext={buildAskContext(
                "",
                contextResults.find((row) => row.id === fixRowId) ?? null,
                undefined,
                { fix: true },
              )}
            />
          </Suspense>
        ) : null}
        {pane !== "mari" && idle ? (
          <div
            data-component="GlobalOmnibar.Empty"
            className="flex min-h-40 flex-1 flex-col items-center justify-center px-6 py-8 text-center sm:min-h-32"
          >
            <Search size={20} aria-hidden="true" className="mb-2 text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {t("commandCenter.empty.title", "Search across Marinara")}
            </p>
            <p className="mt-1 max-w-[32rem] text-xs leading-relaxed text-[var(--muted-foreground)]">
              {t(
                "commandCenter.empty.description",
                "Type the name of a chat, character, setting or message. Pick a category above to browse.",
              )}
            </p>
          </div>
        ) : null}
        {!listVisible ? null : (
          <div className="flex min-h-0 flex-1">
            <div
              ref={listRef}
              id="global-omnibar-results"
              aria-label={t("omnibar.results", "Search results")}
              data-component="GlobalOmnibar.Results"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
            >
              {query.trim() && loading && results.length === 0 ? (
                <div className="flex min-h-24 items-center justify-center text-sm text-[var(--muted-foreground)]">
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  {t("omnibar.loading", "Loading results")}
                </div>
              ) : null}
              {failed ? (
                <div role="status" className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
                  {t("omnibar.error", "Some results could not be loaded")}
                </div>
              ) : null}
              {presentation.groups.map((group) => {
                const GroupIcon =
                  group.id === "professor-suggested"
                    ? Sparkles
                    : group.id === "current-work" || group.id === "context"
                      ? Compass
                      : group.id === "continue"
                        ? Sparkles
                        : group.id === "recent" || group.id === "frecent"
                          ? Clock3
                          : group.id === "quick-controls"
                            ? SlidersHorizontal
                            : LayoutGrid;
                return (
                  <section key={group.id} aria-labelledby={`omnibar-group-${group.id}`}>
                    <div className="flex items-center gap-1.5 px-3 pb-1 pt-3">
                      <GroupIcon size={12} className="text-[var(--primary)]" aria-hidden="true" />
                      <h3
                        id={`omnibar-group-${group.id}`}
                        className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]"
                      >
                        {groupLabels[group.id]}
                      </h3>
                      <span className="text-[0.625rem] text-[var(--muted-foreground)]/70">{group.results.length}</span>
                    </div>
                    <ul className="space-y-0.5 px-1">
                      {group.results.map((result, rowIndex) => {
                        const visual = resultVisual(result);
                        const preview = result.preview?.();
                        const selected = result.id === activeResult?.id;
                        const setupStatus =
                          result.command.availability?.status === "requires-capability"
                            ? t("commandCenter.setup", "Set up")
                            : result.command.availability?.status === "requires-admin"
                              ? t("commandCenter.adminRequired", "Administrator access required")
                              : undefined;
                        return (
                          <CommandCenterResultRow
                            key={result.id}
                            className="motion-safe:animate-omnibar-row-in"
                            style={{ animationDelay: `${Math.min(rowIndex, 8) * 22}ms` }}
                            dataResultId={result.id}
                            id={`omnibar-${result.id}`}
                            title={result.title}
                            metadata={resultMetadata(result, preview)}
                            tertiaryMetadata={
                              <>
                                {preview?.lorebookCount ? (
                                  // Q6: a chat's attached lorebooks, as the lorebook icon and a count.
                                  <span
                                    className="inline-flex shrink-0 items-center gap-0.5"
                                    title={t("commandCenter.chat.lorebookCount", {
                                      count: preview.lorebookCount,
                                    })}
                                  >
                                    <ResultTypeIcon type="lorebook" glyph className="size-3" />
                                    {preview.lorebookCount}
                                  </span>
                                ) : null}
                                {
                                  // A toggle/action control already shows the on/active state, so
                                  // the status label ("Enabled"/"Active") next to it is redundant —
                                  // keep only the informative metadata line in that case.
                                  result.control?.type === "toggle"
                                    ? preview?.metadataLine
                                    : (preview?.status?.label ?? preview?.badges?.[0] ?? preview?.metadataLine)
                                }
                              </>
                            }
                            icon={resultIcon(result)}
                            type={resultType(result)}
                            faces={preview?.participants}
                            faceCount={preview?.participantCount}
                            selected={selected}
                            onSelect={() => selectResult(result)}
                            onMouseMove={(event) => handleResultMouseMove(result, event)}
                            expanded={
                              result.id === expandedPreviewId
                                ? renderResultPreview()
                                : asideShown &&
                                    selected &&
                                    result.id === "ask-professor-mari" &&
                                    result.group === "professor-suggested"
                                  ? renderAsideAnswer()
                                  : undefined
                            }
                            mediaSrc={preview?.media?.src}
                            mediaKind={preview?.media?.kind}
                            avatarCropStyle={preview?.media?.avatarCropStyle}
                            groupClassName={visual.groupClassName}
                            accent={preview?.accent}
                            setupStatus={setupStatus}
                            enterHint={result.control ? undefined : resultEnterHint(result)}
                            control={
                              result.control?.type === "choice" ? (
                                <CommandCenterSegmentedChoice
                                  label={result.control.label}
                                  value={String(result.control.value)}
                                  // F5: ArrowDown/ArrowUp moves `activeResultId` onto an expanded
                                  // option row below this one (ids encode the parent + value); show
                                  // that pick on the inline segments too, since the expanded rows
                                  // themselves render nowhere a keyboard user can see them.
                                  pendingValue={
                                    activeResultId && readChoiceOptionId(activeResultId)?.parentId === result.id
                                      ? readChoiceOptionId(activeResultId)?.value
                                      : undefined
                                  }
                                  options={(result.control.options ?? []).map((option) => ({ ...option }))}
                                  onValueChange={(value) => runScopedChoiceChange(result, value)}
                                  variant="compact"
                                />
                              ) : result.category === "preset" && result.control?.type === "toggle" ? (
                                // Only the preset's own row: an "Add preset to this chat" row
                                // showed a button that did nothing and hid its Enter hint.
                                <CommandCenterActionValue
                                  label={t("commandCenter.actions.setDefaultPreset", "Set default preset")}
                                  icon={ArrowRight}
                                  value={
                                    result.control?.value === true
                                      ? t("commandCenter.values.active", "Active")
                                      : undefined
                                  }
                                  onClick={() => {
                                    if (result.control?.type === "toggle") result.control.onChange(true);
                                  }}
                                  disabled={result.control?.value === true || resultControlPending(result)}
                                  loading={resultControlPending(result)}
                                  variant="compact"
                                  tone="primary"
                                  className="justify-end"
                                />
                              ) : result.control?.type === "toggle" ? (
                                <CommandCenterToggle
                                  label={result.control.label}
                                  checked={Boolean(result.control.value)}
                                  stateLabel={
                                    result.control.value
                                      ? t("commandCenter.values.enabled", "Enabled")
                                      : t("commandCenter.values.disabled", "Disabled")
                                  }
                                  onCheckedChange={(value) => flipToggleControl(result, value)}
                                  disabled={resultControlPending(result)}
                                  loading={resultControlPending(result)}
                                  variant="compact"
                                  className="justify-end"
                                />
                              ) : undefined
                            }
                          />
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
              {!loading && query.trim() && results.length === 0 ? (
                <div className="flex min-h-32 flex-col items-center justify-center px-4 text-center">
                  <Search size={20} className="mb-2 text-[var(--muted-foreground)]" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {t("commandCenter.noResults", "No matching commands")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!mariSurface ? (
          <footer className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] px-3 text-[0.6875rem] text-[var(--muted-foreground)]">
            {/* The conditional hints group to the left so the two permanent
                hints keep their positions as rows gain and lose shortcuts. */}
            <span className="hidden items-center gap-4 sm:flex">
              <span>{t("commandCenter.keyboard.move", "Arrow keys move")}</span>
              {inlineSuffix ? (
                <span>{t("commandCenter.keyboard.complete", "⇥ Complete")}</span>
              ) : mariEnabled && pane === "results" && activeResult ? (
                // Says whether ⌘↵ sends: "Ask" sends what you typed, "Continue" only opens her.
                <span>
                  {mariSends(activeResult)
                    ? t("commandCenter.keyboard.askMari", "Ctrl/⌘+Enter Ask Mari")
                    : t("commandCenter.keyboard.continueMari", "Ctrl/⌘+Enter Continue with Mari")}
                </span>
              ) : null}
              {pane === "results" && activeResult && isRichResult(activeResult) ? (
                <span>
                  {expandedPreviewId === activeResult.id
                    ? t("commandCenter.keyboard.closePreview", "← Close preview")
                    : t("commandCenter.keyboard.preview", "→ Preview")}
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 items-center gap-3">
              {mariEnabled ? (
                <span className="hidden sm:inline">
                  {t("commandCenter.keyboard.askMariShortcut", "Ctrl/⌘+J Ask Mari")}
                </span>
              ) : null}
              {!idle ? (
                <span className="hidden sm:inline">{t("commandCenter.keyboard.escape", "Esc close")}</span>
              ) : null}
              <OmnibarSettingsButton open={settingsOpen} onOpen={() => openSettings()} />
            </span>
          </footer>
        ) : null}
        {settingsTarget ? (
          <OmnibarSettingsSheet
            focusControlId={settingsTarget.controlId}
            onClose={closeSettings}
            connections={languageConnections}
            onClearSearchHistory={() => {
              clearOmnibarFrecencyHistory();
              setFrecencyEntries([]);
              // F7 (O5): the older ranking store (recency/frequency boost + the
              // "Recent" group) is separate from the frecency store above - both
              // record the same uses, so "forgets it all" must clear both.
              const clearedRanking = { ...ranking, recent: [] };
              setRanking(clearedRanking);
              writeCommandRankingState(clearedRanking);
            }}
            onSetUpLocalModel={
              import.meta.env.VITE_MARINARA_LITE === "true"
                ? undefined
                : () => {
                    onClose();
                    useSidecarStore.getState().setShowDownloadModal(true);
                  }
            }
          />
        ) : null}
      </div>

      <AnimatePresence>
        {fieldFlight ? (
          <motion.div
            key="omnibar-field-flight"
            aria-hidden="true"
            className="pointer-events-none fixed z-[110] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg"
            initial={{ ...fieldFlight.from, opacity: 0.9 }}
            animate={{ ...fieldFlight.to, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.75 }}
            onAnimationComplete={() => setFieldFlight(null)}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
