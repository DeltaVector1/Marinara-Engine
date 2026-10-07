import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { MariStorySprite } from "./MariStorySprite";
import {
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
  lazy,
  memo,
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { professorMariWorkspaceStatusKeys } from "../../hooks/use-professor-mari-workspace-status";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Brain,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Link,
  Loader2,
  Lock,
  MessageCircle,
  EllipsisVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  X,
  ClipboardList,
  FastForward,
  Hand,
  RotateCcw,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  BUILT_IN_AGENTS,
  LOCAL_SIDECAR_CONNECTION_ID,
  MARI_AUTHORIZATION_ACCEPT_CHIP,
  MARI_AUTHORIZATION_DECLINE_CHIP,
  isMariHeldChangeApprovalChip,
  withHeldChangeDeclineChip,
  MARI_STARTER_CHIPS,
  type APIConnection,
  type Chat,
  type MariGuidedPlanStep,
  type MariSuggestionAction,
  type MariSuggestionChip,
  type MariWorkspaceSkillDetail,
  type MariWorkspaceActionResult,
  type MariWorkspaceSkillsResponse,
  type MariInstructionDetail,
  type MariInstructionsResponse,
  type MariInstructionMutationResponse,
  type MariWorkspaceStatus,
  type MariWorkspaceTraceItem,
  type Message,
  type ProfessorMariAskContext,
  type ProfessorMariHandoff,
} from "@marinara-engine/shared";
import { useConnections } from "../../hooks/use-connections";
import { useTrackAchievement } from "../../hooks/use-achievements";
import { chatKeys, useChats } from "../../hooks/use-chats";
import { characterKeys, useCharacters, usePersonas } from "../../hooks/use-characters";
import { getCharacterDisplayIdentity } from "../../lib/character-display";
import { buildCharacterPreviewModel, type CharacterPreviewModel } from "../../lib/character-preview";
import { resolveRunAnchorMs, resolveRunSeconds, type RunStepTiming } from "../../lib/mari-work-card-timing";
import { buildLorebookPreviewModel, type LorebookPreviewModel } from "../../lib/lorebook-preview";
import { completeInline } from "../../lib/inline-completion";
import {
  MARI_ASSET_TIER,
  mariImgLoading,
  resolveMariRestStory,
  selectMariWorkAnimation,
  stableHash,
  type MariStoryState,
  type MariWorkAnimation,
} from "../../lib/mari-work-animations";
import {
  buildWorkTimelineBlocks,
  groupRunPhases,
  pastTenseStepTitle,
  splitMariAnswerWhy,
  stepVerbClass,
  type RunPhaseKind,
  type StepVerbClass,
} from "../../lib/mari-work-timeline";
import { resolveStepSeconds } from "../../lib/mari-step-duration";
import { InlineGhostText } from "../ui/InlineGhostText";
import { lorebookKeys, useLorebooks } from "../../hooks/use-lorebooks";
import { presetKeys, usePresets } from "../../hooks/use-presets";
import { useMariWorkspaceContext } from "../../hooks/use-mari-workspace-context";
import { useDialogFocusScope } from "../../hooks/use-dialog-focus-scope";
import { useInDialogFocusScope } from "../../hooks/use-in-dialog-focus-scope";
import { useChatKeyboardOpen } from "../../hooks/use-visual-viewport-chat-bottom";
import { MariAttachButton } from "./MariAttachButton";
import { MariChatHistoryPicker } from "./MariChatHistoryPicker";
import { MariContextViewer } from "./MariContextViewer";
import { facetIcon, MariContextFacetChips } from "./MariContextFacetChips";
import { ProfessorMariContextControl } from "./ProfessorMariContextControl";
import { CharacterSubject } from "../characters/CharacterSubject";
import { LorebookSubject } from "../lorebooks/LorebookSubject";
import { homeFeedKeys } from "../../hooks/use-home-feed";
import { filterLanguageGenerationConnections } from "../../lib/connection-filters";
import { api, ApiError, getPrivilegedActionErrorMessage, isPassiveStreamDisconnect } from "../../lib/api-client";
import { describeProfessorMariError } from "../../lib/professor-mari-errors";
import {
  assignReviewsToTurns,
  countBlockingReviews,
  isPersistentProfessorMariContext,
  professorMariContextCount,
  professorMariContextFacets,
  professorMariFacetSendsContentLater,
  resolveProfessorMariPresentationState,
  reviewRecordKeys,
  shouldAppendMariArrival,
  shouldOfferProfessorMariStarterSuggestions,
  shouldShowProfessorMariConnectionHint,
  stripProfessorMariSpeakerPrefix,
  withoutProfessorMariContextFacet,
  withoutReviewedResults,
  type ProfessorMariContextFacet,
} from "../../lib/professor-mari-presentation";
import {
  resolveProfessorMariWorkspaceBackAction,
  type ProfessorMariWorkspaceDestination,
} from "../../lib/professor-mari-workspace-navigation";
import { useMariApprovals } from "../../hooks/use-mari-approvals";
import { useLocalizedUiText } from "../../localization/use-localized-ui-text";
import {
  awaitMariPermissionsModeWrites,
  enqueueMariPermissionsModeWrite,
} from "../../lib/mari-permissions-write-chain";
import {
  DEFAULT_MARI_PERMISSIONS_MODE,
  MARI_PERMISSIONS_MODE_LABELS,
  MARI_PERMISSIONS_MODES,
  type MariPermissionsMode,
  type MariWorkspacePendingApproval,
} from "@marinara-engine/shared";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { useChatStore } from "../../stores/chat.store";
import { useAgentStore } from "../../stores/agent.store";
import { useSidecarStore } from "../../stores/sidecar.store";
import { useUIStore } from "../../stores/ui.store";
import { ResolvedPromptLine, WorkspaceApprovalCard } from "./MariApprovalCards";
import {
  MARI_SIDE_ROW_CLASS,
  MariPanelSortSelect,
  MariSidePanelHeader,
  MariSideSearch,
  compareMariPanelItems,
  type MemoryDraftState,
  type SkillDraftState,
} from "./MariPanelControls";

// The Skills and Memories panels are a management surface most sessions never
// open. Keeping them out of the eager chunk leaves room under the hard bundle
// budget for the work surface itself.
const ProfessorMariSkillsMenu = lazy(() =>
  import("./MariSkillsMenu").then((module) => ({ default: module.ProfessorMariSkillsMenu })),
);
const ProfessorMariMemoriesMenu = lazy(() =>
  import("./MariMemoriesMenu").then((module) => ({ default: module.ProfessorMariMemoriesMenu })),
);
import { TranscriptRow } from "./MariTranscriptRow";
import type { MariPromptRenderSide } from "./MariPromptPreviewModal";
import { showLocalMessageNotification, showNativeMessageNotification } from "../../lib/local-notifications";
import {
  followTranscriptGrowth,
  isProfessorMariTranscriptNearBottom,
  scrollProfessorMariTranscriptToBottom,
  transcriptScrollAction,
} from "../../lib/professor-mari-transcript-scroll";
import { formatCompactTokenCount, resolveProfessorMariContextBudget } from "../../lib/professor-mari-context-budget";
import { renderCompactInline, renderMarkdownBlocks } from "../../lib/markdown";
import { useCodeBlockCopy } from "../../hooks/use-code-block-copy";
import { rafThrottle } from "../../lib/raf-throttle";
import { prepareImageAttachment } from "../../lib/chat-attachment-images";
import { cn, copyToClipboard } from "../../lib/utils";
import { executeStateNavigation } from "../../lib/state-navigation";
import {
  chooseMariThread,
  readMariThread,
  type MariArrival,
  type MariArrivalAction,
  type MariThreadContext,
} from "../../lib/mari-arrival";
import {
  collectMariReferencedResources,
  findMariSettingReferences,
  isWorkspaceTraceItem,
  mariReferenceFact,
  mariReferenceTarget,
  selectMariReplyReferences,
  type MariReferencedResource,
} from "../../lib/mari-referenced-resources";
import { formatRelativeContact } from "../../lib/relative-time";
import { getOmnibarSettingsDestinations } from "../../lib/omnibar-settings";
import { useAgentConfigs } from "../../hooks/use-agents";
import { ResultTypeIcon } from "../command-center/ResultTypeIcon";
import { chatResultType, resourceResultType, type ResultType } from "../../lib/command-icons";
import { MacroTextarea } from "../ui/MacroTextarea";
import { MariNextStepCards, MariSuggestionChips } from "./MariSuggestionChips";
import { requestChatPeekPrompt } from "../../lib/chat-floating-ui-events";
import { MariList, MariNote, MariRow } from "./mari-primitives";
import { useTranslation, useTranslation as useUiTranslation } from "react-i18next";
import {
  consumeProfessorMariOpenRequest,
  PROFESSOR_MARI_OPEN_EVENT,
  type ProfessorMariOpenDetail,
} from "../../lib/professor-mari-open";

const PROFESSOR_MARI_DRAFT_KEY = "__home_professor_mari__";
const MARI_CONNECTION_STORAGE_KEY = "marinara:home-professor-mari-connection-id";
const PROFESSOR_MARI_ERROR_TOAST_DURATION_MS = 120_000;
const WORKSPACE_SETTLE_POLL_MS = 1_500;
const WORKSPACE_SETTLE_MAX_WAIT_MS = 30 * 60_000;
const WORKSPACE_SETTLE_REQUEST_TIMEOUT_MS = 10_000;

// After the SSE stream detaches on tab resume, the run keeps going server-side.
// Poll the workspace status until it is no longer active so the caller reloads
// the fully persisted reply and approvals rather than a half-written state.
class MariWorkspaceRunError extends Error {}

async function waitForWorkspaceRunToSettle(connectionId: string | null, signal: AbortSignal): Promise<boolean> {
  const query = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : "";
  const startedAt = Date.now();
  let sawActiveRun = false;
  let inactiveReadings = 0;
  while (!signal.aborted && Date.now() - startedAt < WORKSPACE_SETTLE_MAX_WAIT_MS) {
    const pollController = new AbortController();
    const abortPoll = () => pollController.abort();
    const pollTimeout = window.setTimeout(abortPoll, WORKSPACE_SETTLE_REQUEST_TIMEOUT_MS);
    signal.addEventListener("abort", abortPoll, { once: true });
    try {
      const status = await api.get<MariWorkspaceStatus>(`/professor-mari/workspace/status${query}`, {
        signal: pollController.signal,
      });
      if (status.active) {
        sawActiveRun = true;
      } else if (sawActiveRun) {
        return true;
      } else {
        // The prompt route does storage work (connection resolution, message
        // persistence, history listing) BEFORE the run flips active, so one
        // early inactive reading is not proof the run never started — require
        // two, a poll apart, before concluding that.
        inactiveReadings += 1;
        if (inactiveReadings >= 2) return false;
      }
    } catch {
      // The resumed tab may still be restoring network access; keep polling.
    } finally {
      window.clearTimeout(pollTimeout);
      signal.removeEventListener("abort", abortPoll);
    }
    if (signal.aborted) return sawActiveRun;
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, WORKSPACE_SETTLE_POLL_MS);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
  return sawActiveRun;
}
// One glyph per Permissions Mode, so the bar reads like an agent's mode switch at a glance.
const MARI_PERMISSIONS_MODE_ICONS: Record<MariPermissionsMode, LucideIcon> = {
  auto: Sparkles,
  manual: Hand,
  "accept-edits": FastForward,
  plan: ClipboardList,
  bypass: ShieldOff,
};

/** R11: the short fact under each mode in the composer's mode menu (Settings keeps the long text). */
const MARI_PERMISSIONS_MODE_FACT_KEYS: Record<MariPermissionsMode, string> = {
  auto: "ui.chat.homeprofessormarichat.modeFact.auto",
  manual: "ui.chat.homeprofessormarichat.modeFact.manual",
  "accept-edits": "ui.chat.homeprofessormarichat.modeFact.acceptEdits",
  plan: "ui.chat.homeprofessormarichat.modeFact.plan",
  bypass: "ui.chat.homeprofessormarichat.modeFact.bypass",
};

const MARI_WELCOME =
  "Howdy, welcome to Marinara Engine!\n\nFeeling a little lost? It is not a skill issue yet, I am here to help! Ask me about the app, your setup, or what to do next.\n\nNeed something made or changed? I can create character cards, personas, lorebooks, chats, and presets, and I can make reversible local workspace changes with a Keep/Restore review. Select a connection via the link icon beside the paperclip first and then ask away!";
const NEW_SKILL_CONTENT = `# Custom Professor Mari Skill

Use this skill when the request matches a workflow you want Professor Mari to follow.

## Workflow

- Add the trigger conditions.
- Add the steps Professor Mari should follow.
- Add any checks or evidence she should collect before saying the work is done.
`;

type ProfessorMariAttachment = {
  type: string;
  data: string;
  name: string;
  filename?: string;
  resized?: boolean;
};
const PROFESSOR_MARI_ATTACHMENT_ACCEPT =
  "image/*,application/pdf,.pdf,.txt,.md,.markdown,.json,.jsonl,.csv,.log,.xml,.yaml,.yml";
const PROFESSOR_MARI_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
const PROFESSOR_MARI_TEXT_ATTACHMENT_EXTENSIONS = new Set([
  "csv",
  "json",
  "jsonl",
  "log",
  "markdown",
  "md",
  "txt",
  "xml",
  "yaml",
  "yml",
]);
const PROFESSOR_MARI_PDF_ATTACHMENT_MIME_TYPE = "application/pdf";
/**
 * R50: the panel slot. Beside the stream once there is room for both, and over
 * it below that - the same component either way, so there is no second layout to
 * keep in step.
 */
const MARI_PANEL_SLOT_CLASS =
  "mari-workspace-canvas absolute inset-0 z-10 flex h-full min-h-0 min-w-0 flex-col sm:relative sm:inset-auto sm:z-auto sm:h-full sm:w-[24rem] sm:min-w-[24rem] sm:shrink-0 sm:border-l sm:border-[var(--mari-hairline)]";

/** M7: the "Aware of" panel's group labels and rows, on the direction A `.mari-edit` group. */
const SEES_KICKER_CLASS = "px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]";

const PROFESSOR_MARI_PANE_TRANSITION = { duration: 0.24, ease: [0.16, 1, 0.3, 1] } as const;

type WorkspaceSkillMutationResponse = {
  ok: boolean;
  skill: MariWorkspaceSkillDetail;
};

type ProfessorMariConnectionOption = {
  id: string;
  name: string;
  model?: string | null;
  provider?: string;
  isDefault?: boolean;
};

type ProfessorMariChatSummary = Chat & {
  messageCount?: number;
};

// R7: "Continue here" picks per context, so the same door does not ask again.
// ponytail: page-session memory only; a reload asks once more. Persist it on the thread if that annoys.
const continuedThereByContext = new Map<string, string>();

function readStoredConnectionId() {
  try {
    return window.localStorage.getItem(MARI_CONNECTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberConnectionId(id: string) {
  try {
    window.localStorage.setItem(MARI_CONNECTION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function isProfessorMariDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
}

function ProfessorMariMobilePortal({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const [mobile, setMobile] = useState(() => !isProfessorMariDesktopViewport());

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  if (disabled) return children;
  return mobile ? createPortal(children, document.body) : children;
}

function getProfessorMariFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function inferProfessorMariAttachmentType(file: File): string {
  const extension = getProfessorMariFileExtension(file.name);
  if (extension === "pdf") return PROFESSOR_MARI_PDF_ATTACHMENT_MIME_TYPE;
  if (file.type) return file.type;
  if (extension === "json" || extension === "jsonl") return "application/json";
  if (extension === "csv") return "text/csv";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  if (extension === "xml") return "application/xml";
  if (extension === "yaml" || extension === "yml") return "application/yaml";
  if (extension === "txt" || extension === "log") return "text/plain";
  return "application/octet-stream";
}

function isSupportedProfessorMariAttachment(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type.startsWith("text/")) return true;
  const type = inferProfessorMariAttachmentType(file);
  if (type === PROFESSOR_MARI_PDF_ATTACHMENT_MIME_TYPE) return true;
  if (
    type === "application/json" ||
    type === "application/xml" ||
    type === "application/yaml" ||
    type === "application/x-yaml"
  ) {
    return true;
  }
  return PROFESSOR_MARI_TEXT_ATTACHMENT_EXTENSIONS.has(getProfessorMariFileExtension(file.name));
}

function readProfessorMariFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function isProfessorMariImageAttachment(attachment: ProfessorMariAttachment): boolean {
  return attachment.type.startsWith("image/") && attachment.data.startsWith("data:image/");
}

function isProfessorMariAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function toMessageExtra(message: Message): Message["extra"] {
  if (typeof message.extra === "string") {
    try {
      return JSON.parse(message.extra) as Message["extra"];
    } catch {
      return {
        displayText: null,
        isGenerated: message.role === "assistant",
        tokenCount: null,
        generationInfo: null,
      };
    }
  }
  return message.extra;
}

function getProfessorMariAttachments(message: Message): ProfessorMariAttachment[] {
  const extra = toMessageExtra(message);
  const rawAttachments =
    extra && typeof extra === "object" && "attachments" in extra
      ? (extra as { attachments?: unknown }).attachments
      : undefined;
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments.flatMap((attachment): ProfessorMariAttachment[] => {
    if (!attachment || typeof attachment !== "object") return [];
    const candidate = attachment as Partial<ProfessorMariAttachment>;
    if (typeof candidate.type !== "string" || typeof candidate.data !== "string") return [];
    if (!candidate.data.startsWith("data:")) return [];
    const filename =
      typeof candidate.filename === "string" && candidate.filename.trim() ? candidate.filename.trim() : undefined;
    const name =
      typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : (filename ?? "attachment");
    const normalized: ProfessorMariAttachment = { type: candidate.type, data: candidate.data, name };
    if (filename) normalized.filename = filename;
    if (typeof candidate.resized === "boolean") normalized.resized = candidate.resized;
    return [normalized];
  });
}

/** The name every Mari chat is created with, before it earns a real one. */
const PROFESSOR_MARI_DEFAULT_CHAT_NAME = "Professor Mari";
const PROFESSOR_MARI_AUTO_TITLE_MAX = 48;

/**
 * A title taken from the first thing the user asked. No second model call: the
 * opening question is already the best short summary of the conversation, and a
 * history of ten chats all called "Professor Mari" cannot be searched at all.
 */
function buildProfessorMariAutoTitle(text: string): string {
  const line = text.replace(/\s+/gu, " ").trim();
  if (!line) return "";
  if (line.length <= PROFESSOR_MARI_AUTO_TITLE_MAX) return line;
  return `${line.slice(0, PROFESSOR_MARI_AUTO_TITLE_MAX - 1).trimEnd()}…`;
}

function isProfessorMariChatActive(chat: ProfessorMariChatSummary) {
  const raw = chat.metadata;
  try {
    const metadata =
      typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown> | null);
    if (!metadata) return false;
    return metadata.professorMariActive === true && metadata.professorMariArchived !== true;
  } catch {
    return false;
  }
}

function createLocalUserMessage(
  chatId: string,
  content: string,
  attachments: ProfessorMariAttachment[] = [],
  context: ProfessorMariAskContext | null = null,
): Message {
  return {
    id: `__professor_mari_local_${Date.now()}`,
    chatId,
    role: "user",
    characterId: null,
    content,
    activeSwipeIndex: 0,
    createdAt: new Date().toISOString(),
    extra: {
      displayText: null,
      isGenerated: false,
      tokenCount: null,
      generationInfo: null,
      ...(attachments.length > 0 ? { attachments } : {}),
      professorMariContext: context,
    },
  };
}

function getProfessorMariMessageContext(message: Message): ProfessorMariAskContext | null | undefined {
  const extra = toMessageExtra(message);
  if (!extra || typeof extra !== "object" || !("professorMariContext" in extra)) return undefined;
  return extra.professorMariContext ?? null;
}

function formatMariMessageTime(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function resolveContextCharacter(
  context: ProfessorMariAskContext | null | undefined,
  characters: ReadonlyMap<string, CharacterPreviewModel>,
  fallbackName: string,
): CharacterPreviewModel | null {
  if (context?.resource?.kind !== "character") return null;
  return (
    characters.get(context.resource.id) ?? {
      id: context.resource.id,
      name: context.resource.label ?? fallbackName,
      tags: [],
      lorebookCount: 0,
    }
  );
}

function resolveContextLorebook(
  context: ProfessorMariAskContext | null | undefined,
  lorebooks: ReadonlyMap<string, LorebookPreviewModel>,
  fallbackName: string,
): LorebookPreviewModel | null {
  if (context?.resource?.kind !== "lorebook") return null;
  return (
    lorebooks.get(context.resource.id) ?? {
      id: context.resource.id,
      name: context.resource.label ?? fallbackName,
      category: "uncategorized",
      isGlobal: false,
      enabled: true,
      linkedNames: [],
      tags: [],
    }
  );
}

function persistentResourceContext(
  context: ProfessorMariAskContext | null | undefined,
): ProfessorMariAskContext | null {
  if (!context?.resource || !isPersistentProfessorMariContext(context)) return null;
  return {
    source: context.source,
    capability: "explain",
    resource: context.resource,
  };
}

function getMessageThinking(message: Message): string | null {
  const extra = toMessageExtra(message);
  const thinking = extra?.thinking;
  return typeof thinking === "string" && thinking.trim().length > 0 ? thinking : null;
}

type WorkspaceToolCall = {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  input?: unknown;
  detail: string | null;
  output: string | null;
  /** First time we saw this call. Preserved across upserts so a RUNNING step can tick live. */
  startedAt: number;
  /** Server-measured wall time of a finished call. Authoritative - it survives a reload. */
  durationMs?: number;
  updatedAt: number;
};

type ToolTone = "db" | "shell" | "file" | "search" | "write" | "theme" | "image" | "wiki" | "skill" | "generic";

type ToolPresentation = {
  eyebrow: string;
  title: string;
  detail: string | null;
  tone: ToolTone;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function previewValue(value: unknown, limit = 180): string | null {
  if (value == null) return null;
  let text: string;
  if (typeof value === "string") text = value;
  else {
    const record = asRecord(value);
    if (record) {
      const primary = record.command ?? record.path ?? record.pattern ?? record.query ?? record.url ?? record.reason;
      if (typeof primary === "string") text = primary;
      else {
        try {
          text = JSON.stringify(record);
        } catch {
          text = String(value);
        }
      }
    } else text = String(value);
  }

  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function outputValue(value: unknown, limit = 8000): string | null {
  if (value == null) return null;
  let text: string;
  if (typeof value === "string") text = value;
  else {
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      text = String(value);
    }
  }
  const trimmed = text.trimEnd();
  if (!trimmed) return null;
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
}

function getToolCallId(data: Record<string, unknown> | null, name: string) {
  const id = data?.id;
  return typeof id === "string" && id.trim() ? id : `${name}-${Date.now()}`;
}

function formatToolName(name: string) {
  return name
    .replace(/^functions\./, "")
    .replace(/^multi_tool_use\./, "")
    .replace(/_/g, " ");
}

function getMessageWorkspaceTrace(message: Message): MariWorkspaceTraceItem[] | null {
  const extra = toMessageExtra(message);
  const trace = extra?.mariWorkspaceTimeline;
  if (!Array.isArray(trace)) return null;
  const items = trace.filter(isWorkspaceTraceItem);
  return items.length > 0 ? items : null;
}

/** R14: why this turn failed (`mariRunError`); null when it did not, or once you dismissed it. */
function getMessageRunError(
  message: Message,
  { includeDismissed = false }: { includeDismissed?: boolean } = {},
): { message: string; dismissed: boolean } | null {
  const value = asRecord(toMessageExtra(message)?.mariRunError);
  if (typeof value?.message !== "string") return null;
  const dismissed = value.dismissed === true;
  return dismissed && !includeDismissed ? null : { message: value.message, dismissed };
}

function isMariWorkspaceActionResult(value: unknown): value is MariWorkspaceActionResult {
  const result = asRecord(value);
  const resource = asRecord(result?.resource);
  return (
    (result?.status === "created" || result?.status === "updated") &&
    typeof result.summary === "string" &&
    !!resource &&
    ["character", "persona", "lorebook", "preset"].includes(String(resource.kind)) &&
    typeof resource.id === "string" &&
    resource.id.length > 0 &&
    Array.isArray(result.changedFields) &&
    result.changedFields.every((field) => typeof field === "string")
  );
}

function getMessageWorkspaceActionResults(message: Message): MariWorkspaceActionResult[] {
  const extra = toMessageExtra(message);
  const results = extra?.mariWorkspaceActionResults;
  return Array.isArray(results) ? results.filter(isMariWorkspaceActionResult) : [];
}

type WorkspaceTimelineItem =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "thinking"; content: string; startedAt?: number; updatedAt?: number }
  | { id: string; type: "tool"; tool: WorkspaceToolCall }
  | { id: string; type: "status"; content: string };

function timelineId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function timelineItemsFromTrace(trace: MariWorkspaceTraceItem[], message: Message): WorkspaceTimelineItem[] {
  const items = trace.map((item, index): WorkspaceTimelineItem => {
    if (item.type === "tool") {
      return {
        id: `${message.id}-tool-${item.tool.id || index}`,
        type: "tool",
        tool: {
          id: item.tool.id || `${message.id}-${index}`,
          name: item.tool.name || "tool",
          status: item.tool.status === "running" ? "done" : item.tool.status,
          input: item.tool.input,
          detail: previewValue(item.tool.input),
          output: item.tool.output ?? null,
          // A replayed step never ticks, so it has no local anchor. Its duration comes from the
          // server-stamped pair; a trace written before those existed stays "—" rather than
          // showing a fabricated 1s.
          startedAt: 0,
          durationMs:
            item.tool.startedAt && item.tool.updatedAt
              ? Math.max(0, item.tool.updatedAt - item.tool.startedAt)
              : undefined,
          updatedAt: item.tool.updatedAt ?? 0,
        },
      };
    }
    if (item.type === "thinking") {
      return {
        id: `${message.id}-thinking-${index}`,
        type: "thinking",
        content: item.content,
        startedAt: item.startedAt,
        updatedAt: item.updatedAt,
      };
    }
    return { id: `${message.id}-${item.type}-${index}`, type: item.type, content: item.content };
  });

  if (!items.some((item) => item.type === "text") && message.content.trim()) {
    items.push({ id: `${message.id}-text-fallback`, type: "text", content: message.content });
  }
  return items;
}

function appendTextTimeline(current: WorkspaceTimelineItem[], delta: string): WorkspaceTimelineItem[] {
  if (!delta) return current;
  const last = current[current.length - 1];
  if (last?.type === "text") return [...current.slice(0, -1), { ...last, content: `${last.content}${delta}` }];
  return [...current, { id: timelineId("text"), type: "text", content: delta }];
}

function appendThinkingTimeline(current: WorkspaceTimelineItem[], delta: string): WorkspaceTimelineItem[] {
  if (!delta) return current;
  const now = Date.now();
  const last = current[current.length - 1];
  if (last?.type === "thinking") {
    return [...current.slice(0, -1), { ...last, content: `${last.content}${delta}`, updatedAt: now }];
  }
  return [...current, { id: timelineId("thinking"), type: "thinking", content: delta, startedAt: now, updatedAt: now }];
}

function appendStatusTimeline(current: WorkspaceTimelineItem[], content: string): WorkspaceTimelineItem[] {
  const trimmed = content.trim();
  if (!trimmed) return current;
  const last = current[current.length - 1];
  if (last?.type === "status" && last.content === trimmed) return current;
  return [...current, { id: timelineId("status"), type: "status", content: trimmed }];
}

function upsertToolTimeline(current: WorkspaceTimelineItem[], update: WorkspaceToolCall): WorkspaceTimelineItem[] {
  const existingIndex = current.findIndex((item) => item.type === "tool" && item.tool.id === update.id);
  if (existingIndex < 0) {
    const toolItem: WorkspaceTimelineItem = { id: `tool-${update.id}`, type: "tool", tool: update };
    return [...current, toolItem];
  }
  return current.map((item, index) => {
    if (index !== existingIndex || item.type !== "tool") return item;
    return {
      ...item,
      tool: {
        ...item.tool,
        ...update,
        name: update.name === "tool" && item.tool.name !== "tool" ? item.tool.name : update.name,
        input: update.input ?? item.tool.input,
        detail: update.detail ?? item.tool.detail,
        output: update.output ?? item.tool.output,
        // The update carries its own timestamp; the first sighting is what dates the step.
        startedAt: item.tool.startedAt || update.startedAt,
        // A later event without a duration must not erase one we already have.
        durationMs: update.durationMs ?? item.tool.durationMs,
      },
    };
  });
}

const MARI_DB_MUTATIONS = new Set(["insert", "patch", "replace", "delete", "transform"]);

function splitShellWords(command: string): string[] {
  const words: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (const char of command) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (current) words.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) words.push(current);
  return words;
}

function humanizeIdentifier(value: string | null | undefined) {
  if (!value) return "data";
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactCommand(command: string, limit = 220) {
  const compact = command.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function getBashCommand(tool: WorkspaceToolCall) {
  const input = asRecord(tool.input);
  const command = input?.command;
  if (typeof command === "string" && command.trim()) return command.trim();
  return null;
}

function shellTokenBasename(token: string) {
  const clean = token.trim().replace(/^["']|["']$/g, "");
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1]?.toLowerCase() ?? "";
}

function isMariExecutableToken(token: string) {
  return /^(?:mari|mari\.(?:cmd|ps1|exe))$/i.test(shellTokenBasename(token));
}

function getMariTokens(command: string): string[] | null {
  const tokens = splitShellWords(command);
  const start = tokens.findIndex(isMariExecutableToken);
  return start >= 0 ? tokens.slice(start) : null;
}

function firstCommandValue(tokens: string[], start = 0) {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token === "--" || token.startsWith("-") || token.includes("=")) continue;
    return token;
  }
  return null;
}

function looksLikeHelpToken(token: string | null | undefined) {
  return !token || token === "help" || token === "--help" || token === "-h";
}

function extractMariDbCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || tokens[1] !== "db") return null;
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "status");
  const target = tokens.slice(3).find((token) => token && !token.startsWith("-") && !token.includes("=")) ?? null;
  return {
    action,
    target,
    apply: tokens.includes("--apply"),
    dryRun: tokens.includes("--dry-run") || (MARI_DB_MUTATIONS.has(action) && !tokens.includes("--apply")),
  };
}

function mariDbTitle(info: NonNullable<ReturnType<typeof extractMariDbCommand>>) {
  const target = humanizeIdentifier(info.target);
  switch (info.action) {
    case "status":
      return "Checking database status";
    case "help":
      return "Opening database command help";
    case "tables":
      return "Listing database tables";
    case "counts":
      return "Counting database rows";
    case "schema":
      return `Reading ${target} schema`;
    case "list":
      return `Listing ${target}`;
    case "get":
      return `Reading ${target} row`;
    case "search":
      return `Searching ${info.target === "all" ? "all tables" : target}`;
    case "select":
      return `Querying ${target}`;
    case "validate":
      return "Validating workspace data";
    case "insert":
      return info.apply ? `Creating ${target}` : `Previewing new ${target}`;
    case "patch":
      return info.apply ? `Applying ${target} update` : `Previewing ${target} update`;
    case "replace":
      return info.apply ? `Replacing ${target}` : `Previewing ${target} replacement`;
    case "delete":
      return info.apply ? `Deleting ${target}` : `Previewing ${target} deletion`;
    case "transform":
      return info.apply ? `Applying ${target} transform` : `Previewing ${target} transform`;
    default:
      return `Running mari db ${info.action}`;
  }
}

function mariDbDetail(info: NonNullable<ReturnType<typeof extractMariDbCommand>>) {
  if (!info.target || ["status", "tables", "counts", "validate", "data-dir", "now", "new-id"].includes(info.action))
    return null;
  return info.target === "all" ? "all tables" : humanizeIdentifier(info.target);
}

function tokenFlagValue(tokens: string[], flag: string) {
  const prefixed = `${flag}=`;
  const inline = tokens.find((token) => token.startsWith(prefixed));
  if (inline) return inline.slice(prefixed.length);
  const index = tokens.indexOf(flag);
  return index >= 0 ? (tokens[index + 1] ?? null) : null;
}

function extractMariCodeCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || tokens[1] !== "code") return null;
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "status");
  return {
    action,
    subaction: action === "reload" ? (tokens[3] ?? null) : null,
    kind: tokenFlagValue(tokens, "--kind"),
    changed: tokens.includes("--changed"),
    patch: tokens.includes("--patch") || tokens.includes("--full"),
  };
}

function mariCodeTitle(info: NonNullable<ReturnType<typeof extractMariCodeCommand>>) {
  switch (info.action) {
    case "status":
      return "Checking workspace status";
    case "help":
      return "Opening workspace command help";
    case "diff":
      return info.patch ? "Inspecting workspace diff" : "Summarizing workspace diff";
    case "check":
      return info.changed ? "Checking changed workspace files" : "Running workspace checks";
    case "health":
      return "Checking workspace health";
    case "reload":
      return info.subaction === "request"
        ? `Requesting ${info.kind ?? "workspace"} reload`
        : "Managing workspace reload";
    case "continue":
      return "Continuing workspace run";
    default:
      return `Running mari code ${info.action}`;
  }
}

function mariCodeDetail(info: NonNullable<ReturnType<typeof extractMariCodeCommand>>) {
  if (info.action === "reload" && info.kind) return info.kind;
  if (info.action === "diff" && info.patch) return "patch included";
  if (info.action === "check" && info.changed) return "changed scope requested";
  return null;
}

const MARI_THEME_MUTATIONS = new Set(["create", "update", "set-active"]);

function extractMariThemesCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || (tokens[1] !== "themes" && tokens[1] !== "theme")) return null;
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "list");
  const name = tokenFlagValue(tokens, "--name");
  return {
    action,
    name,
    apply: tokens.includes("--apply"),
    activate: tokens.includes("--activate") || tokens.includes("--active") || action === "set-active",
    dryRun: MARI_THEME_MUTATIONS.has(action) && !tokens.includes("--apply"),
  };
}

function mariThemesTitle(info: NonNullable<ReturnType<typeof extractMariThemesCommand>>) {
  const suffix = info.name ? `: ${info.name}` : "";
  switch (info.action) {
    case "list":
      return "Listing themes";
    case "help":
      return "Opening theme command help";
    case "active":
      return "Checking active theme";
    case "get":
      return "Reading theme";
    case "create":
      return info.apply ? `Creating theme${suffix}` : `Previewing theme${suffix}`;
    case "update":
      return info.apply ? "Updating theme" : "Previewing theme update";
    case "set-active":
      return info.apply ? "Activating theme" : "Previewing theme activation";
    default:
      return `Running mari themes ${info.action}`;
  }
}

function mariThemesDetail(info: NonNullable<ReturnType<typeof extractMariThemesCommand>>) {
  if (info.dryRun) return "dry run, not saved";
  if (info.activate) return "activate";
  return null;
}

const MARI_IMAGE_WRITES = new Set(["assign", "add", "replace", "delete", "remove", "clear"]);

function extractMariImagesCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || !["image", "images", "media"].includes(tokens[1] ?? "")) return null;
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "help");
  return {
    action,
    target: tokenFlagValue(tokens, "--target") ?? firstCommandValue(tokens, 3),
    asset: tokenFlagValue(tokens, "--asset") ?? tokenFlagValue(tokens, "--id"),
    prompt: tokenFlagValue(tokens, "--prompt"),
    source: tokenFlagValue(tokens, "--source"),
    connection: tokenFlagValue(tokens, "--connection"),
    edit: tokens.includes("--edit"),
    mutating: MARI_IMAGE_WRITES.has(action),
  };
}

function mariImagesTitle(info: NonNullable<ReturnType<typeof extractMariImagesCommand>>) {
  switch (info.action) {
    case "connections":
      return info.edit ? "Finding edit-capable image connections" : "Checking image connections";
    case "capabilities":
      return info.edit ? "Checking image edit capabilities" : "Checking image capabilities";
    case "preview":
      return "Preparing image preview";
    case "generate":
      return "Generating review image";
    case "edit":
      return "Editing review image";
    case "assign":
    case "add":
    case "replace":
      return "Assigning image asset";
    case "delete":
    case "remove":
    case "clear":
      return "Removing image asset";
    case "list":
      return `Listing ${humanizeIdentifier(info.target)}`;
    case "get":
      return "Reading image asset";
    case "help":
      return "Opening image command help";
    default:
      return `Running mari images ${info.action}`;
  }
}

function mariImagesDetail(info: NonNullable<ReturnType<typeof extractMariImagesCommand>>) {
  if (info.target && !["list", "get"].includes(info.action)) return humanizeIdentifier(info.target);
  if (info.asset) return compactCommand(info.asset, 70);
  if (info.source) return compactCommand(info.source, 70);
  if (info.prompt) return compactCommand(info.prompt, 70);
  if (info.connection) return compactCommand(info.connection, 70);
  return null;
}

function extractMariWikiCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || !["wiki", "fandom"].includes(tokens[1] ?? "")) return null;
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "help");
  const wiki =
    tokenFlagValue(tokens, "--wiki") ??
    (["search", "search-wiki", "pages", "category", "category-members", "site-info"].includes(action)
      ? tokens[3]
      : null);
  return {
    action,
    wiki,
    title: tokenFlagValue(tokens, "--title"),
    pageUrl: tokenFlagValue(tokens, "--page-url") ?? tokenFlagValue(tokens, "--pageUrl"),
    query: tokenFlagValue(tokens, "--query") ?? firstCommandValue(tokens, action === "search-in-page" ? 5 : 3),
    category:
      tokenFlagValue(tokens, "--category") ??
      (["category", "category-members"].includes(action)
        ? tokens.slice(4).find((token) => token && !token.startsWith("-"))
        : null),
    content: tokenFlagValue(tokens, "--content"),
  };
}

function mariWikiTitle(info: NonNullable<ReturnType<typeof extractMariWikiCommand>>) {
  switch (info.action) {
    case "find":
    case "find-wikis":
      return "Finding Fandom wikis";
    case "search-all":
      return "Searching Fandom pages";
    case "search":
    case "search-wiki":
      return "Searching wiki";
    case "get":
    case "get-page":
      return "Reading wiki page";
    case "pages":
      return "Reading wiki pages";
    case "sections":
      return "Reading wiki sections";
    case "category":
    case "category-members":
      return "Listing wiki category";
    case "site-info":
      return "Checking wiki site info";
    case "search-in-page":
      return "Searching inside wiki page";
    case "help":
      return "Opening wiki command help";
    default:
      return `Running mari wiki ${info.action}`;
  }
}

function mariWikiDetail(info: NonNullable<ReturnType<typeof extractMariWikiCommand>>) {
  const detail = info.title ?? info.category ?? info.pageUrl ?? info.wiki ?? info.query ?? info.content;
  return detail ? compactCommand(detail, 70) : null;
}

function extractMariStorageCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  if (!isMariExecutableToken(tokens[0] ?? "") || tokens[1] !== "storage") return null;
  return {
    action: looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "help"),
  };
}

function extractMariGenericCommand(command: string) {
  const tokens = getMariTokens(command);
  if (!tokens) return null;
  const group = looksLikeHelpToken(tokens[1]) ? "help" : (tokens[1] ?? "help");
  const action = looksLikeHelpToken(tokens[2]) ? "help" : (tokens[2] ?? "help");
  return { group, action };
}

function mariGenericTitle(info: NonNullable<ReturnType<typeof extractMariGenericCommand>>) {
  if (info.group === "help") return "Opening Mari CLI help";
  if (info.group === "storage") return "Checking reserved storage command";
  if (info.action === "help") return `Opening mari ${info.group} help`;
  return `Running mari ${info.group} ${info.action}`;
}

function mariGenericDetail(info: NonNullable<ReturnType<typeof extractMariGenericCommand>>) {
  if (info.group === "help") return null;
  return info.action === "help" ? info.group : `${info.group} ${info.action}`;
}

function toolInputPath(tool: WorkspaceToolCall) {
  const input = asRecord(tool.input);
  const candidate = input?.path ?? input?.file ?? input?.filePath ?? input?.file_path ?? input?.uri ?? tool.detail;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function skillNameFromPath(path: string) {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  const file = parts[parts.length - 1]?.toLowerCase();
  const parent = file === "skill.md" ? parts[parts.length - 2] : parts[parts.length - 1];
  return humanizeIdentifier(parent ?? "skill");
}

function getSkillReadPresentation(tool: WorkspaceToolCall): ToolPresentation | null {
  const path = toolInputPath(tool);
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  if (!normalized.endsWith("/skill.md") && normalized !== "skill.md") return null;
  const professorMariSkill = normalized.includes("/.mari-workspace/skills/");
  const skillName = skillNameFromPath(path);
  return {
    eyebrow: professorMariSkill ? "Mari skill" : "Skill",
    title: professorMariSkill ? "Loading Professor Mari skill" : `Loading ${skillName}`,
    detail: professorMariSkill ? skillName : null,
    tone: "skill",
  };
}

function summarizeShellCommand(command: string) {
  const compact = compactCommand(command, 120);
  const words = splitShellWords(command);
  if (words[0] === "pnpm" && words[1]) return `Running pnpm ${words[1]}`;
  if (words[0] === "git" && words[1]) return `Running git ${words[1]}`;
  if (words[0] === "node") return "Running node script";
  return compact ? `$ ${compact}` : "Running shell command";
}

/**
 * Who or what an app-data step was about, so a step reads "Reading character · Shrek" instead of a bare
 * verb. The name comes from the output (a single read returns the record), else from what she searched.
 * ponytail: the first "name"/"title" in the output text; parse per action if a record ever nests a
 * different name first.
 */
function appDataSubject(tool: WorkspaceToolCall, input: Record<string, unknown> | null): string | null {
  // A list's first record is not its subject; a list or search is only "about" what she searched for.
  const single = typeof input?.action === "string" && /\.get(Entry)?$/u.test(input.action);
  const named = single && tool.output?.match(/"(?:name|title)"\s*:\s*"((?:[^"\\]|\\.){1,80})"/u)?.[1];
  if (named) return named.replace(/\\(.)/gu, "$1");
  const asked = input?.query ?? input?.name ?? input?.search;
  return typeof asked === "string" && asked.trim() ? previewValue(asked, 60) : null;
}

const APP_DATA_WRITE_VERBS: Record<string, string> = {
  create: "Creating",
  update: "Updating",
  add: "Adding",
  delete: "Deleting",
  set: "Setting",
  move: "Moving",
};

function inferToolPresentation(tool: WorkspaceToolCall): ToolPresentation {
  const name = formatToolName(tool.name);
  const input = asRecord(tool.input);
  const appDataAction = typeof input?.action === "string" ? input.action : null;
  const command = getBashCommand(tool);
  const mariDb = command ? extractMariDbCommand(command) : null;
  const mariCode = command ? extractMariCodeCommand(command) : null;
  const mariThemes = command ? extractMariThemesCommand(command) : null;
  const mariImages = command ? extractMariImagesCommand(command) : null;
  const mariWiki = command ? extractMariWikiCommand(command) : null;
  const mariStorage = command ? extractMariStorageCommand(command) : null;
  const mariGeneric = command ? extractMariGenericCommand(command) : null;
  if (command && mariDb) {
    return {
      eyebrow: mariDb.dryRun ? "DB preview" : "Database",
      title: mariDbTitle(mariDb),
      detail: mariDbDetail(mariDb),
      tone: "db",
    };
  }
  if (command && mariCode) {
    return {
      eyebrow: "Workspace",
      title: mariCodeTitle(mariCode),
      detail: mariCodeDetail(mariCode),
      tone: "shell",
    };
  }
  if (command && mariThemes) {
    return {
      eyebrow: mariThemes.dryRun ? "Theme preview" : "Theme",
      title: mariThemesTitle(mariThemes),
      detail: mariThemesDetail(mariThemes),
      tone: "theme",
    };
  }
  if (command && mariImages) {
    return {
      eyebrow: mariImages.mutating ? "Image change" : "Images",
      title: mariImagesTitle(mariImages),
      detail: mariImagesDetail(mariImages),
      tone: mariImages.mutating ? "write" : "image",
    };
  }
  if (command && mariWiki) {
    return {
      eyebrow: "Wiki",
      title: mariWikiTitle(mariWiki),
      detail: mariWikiDetail(mariWiki),
      tone: "wiki",
    };
  }
  if (command && mariStorage) {
    return {
      eyebrow: "Storage",
      title: "Checking reserved storage command",
      detail: mariStorage.action === "help" ? null : mariStorage.action,
      tone: "shell",
    };
  }
  if (command && mariGeneric) {
    return {
      eyebrow: "Mari CLI",
      title: mariGenericTitle(mariGeneric),
      detail: mariGenericDetail(mariGeneric),
      tone: "shell",
    };
  }

  if (command) {
    return {
      eyebrow: "Shell",
      title: summarizeShellCommand(command),
      detail: compactCommand(command, 90),
      tone: "shell",
    };
  }

  if (appDataAction && /app[ _-]?data/i.test(name)) {
    const actionTitles: Record<string, string> = {
      "chat.get": "Reading chat",
      "chat.messages": "Reading recent messages",
      "chat.updateMessage": "Fixing a reply",
      "character.get": "Reading character",
      "instruction.get": "Reading instruction",
    };
    // A write reads as one ("Updating lorebook entry"), so its icon and its run phase say it changed something.
    const parts = appDataAction.split(".");
    const writeVerb = /^(create|update|add|delete|set|move)(.*)$/u.exec(parts.at(-1) ?? "");
    const writeTitle = writeVerb
      ? [
          APP_DATA_WRITE_VERBS[writeVerb[1]!],
          ...parts.slice(0, -1),
          writeVerb[2]!.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase(),
        ]
          .filter(Boolean)
          .join(" ")
      : null;
    return {
      eyebrow: "App data",
      title: actionTitles[appDataAction] ?? writeTitle ?? `Reading ${appDataAction.replaceAll(".", " ")}`,
      detail: appDataSubject(tool, input),
      tone: "db",
    };
  }

  const skillPresentation = getSkillReadPresentation(tool);
  if (skillPresentation) return skillPresentation;

  if (name === "package service") {
    const packageId = typeof input?.package === "string" && input.package.trim() ? input.package : null;
    // With an action it runs something in a package, which the Engine cannot preview or undo.
    return appDataAction
      ? { eyebrow: "Package", title: `Running ${appDataAction}`, detail: packageId, tone: "write" }
      : { eyebrow: "Package", title: "Checking package actions", detail: packageId, tone: "generic" };
  }

  const detail = previewValue(
    input?.path ?? input?.pattern ?? input?.query ?? input?.url ?? input?.command ?? tool.detail,
    90,
  );
  if (/grep|find|search/i.test(name)) {
    return { eyebrow: "Search", title: name === "grep" ? "Searching text" : "Finding files", detail, tone: "search" };
  }
  if (/read|file/i.test(name)) {
    return { eyebrow: "File", title: "Reading file", detail, tone: "file" };
  }
  if (/write|edit/i.test(name)) {
    return {
      eyebrow: "File change",
      title: name.includes("edit") ? "Editing file" : "Writing file",
      detail,
      tone: "write",
    };
  }
  if (name === "ls") {
    return { eyebrow: "Files", title: "Listing folder", detail, tone: "file" };
  }
  return { eyebrow: "Tool", title: name, detail, tone: "generic" };
}

/** While Mari streams, each new word mounts in its own span and blurs in; words already shown keep their key. */
function renderStreamingInline(text: string, keyPrefix: string): ReactNode[] {
  return renderCompactInline(text, keyPrefix).map((node, nodeIndex) =>
    typeof node === "string"
      ? node.split(/(\s+)/).map((word, wordIndex) =>
          /\S/.test(word) ? (
            <span key={`${keyPrefix}-${nodeIndex}-${wordIndex}`} className="mari-stream-word">
              {word}
            </span>
          ) : (
            word
          ),
        )
      : node,
  );
}

const CompactMarkdown = memo(function CompactMarkdown({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const trimmed = content.trim();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const rendered = useMemo(
    () =>
      trimmed
        ? renderMarkdownBlocks(trimmed, streaming ? renderStreamingInline : renderCompactInline, "home-mari")
        : null,
    [trimmed, streaming],
  );
  useCodeBlockCopy(container, rendered);
  if (!trimmed) return null;
  return (
    <div
      ref={setContainer}
      className="mari-message-content text-[0.8125rem] leading-[1.42] text-[var(--foreground)] [&_.mari-md-codeblock]:my-1.5 [&_.mari-md-codeblock]:max-h-44 [&_.mari-md-codeblock]:pb-12! [&_.mari-md-heading]:mb-0.5 [&_.mari-md-heading]:mt-1 [&_.mari-md-ol]:my-1 [&_.mari-md-ul]:my-1"
    >
      {rendered}
      {streaming && <span className="mari-stream-caret" aria-hidden="true" />}
    </div>
  );
});

function ProfessorMariAttachedFiles({
  attachments,
  onRemove,
}: {
  attachments: ProfessorMariAttachment[];
  onRemove?: (index: number) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment, index) =>
        isProfessorMariImageAttachment(attachment) ? (
          <div key={`${attachment.name}-${index}`} className="relative">
            <a
              href={attachment.data}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]/70"
              title={attachment.name}
            >
              <img
                src={attachment.data}
                alt={attachment.name || "Attached image"}
                className="h-24 w-24 object-cover sm:h-28 sm:w-28"
                draggable={false}
              />
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 rounded bg-[var(--background)]/80 p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:text-[var(--primary)]"
                aria-label={localizeUi("ui.chat.homeprofessormarichat.removeAttachment")}
                title={localizeUi("ui.chat.homeprofessormarichat.removeAttachment")}
              >
                <X size="0.75rem" />
              </button>
            )}
          </div>
        ) : (
          <div key={`${attachment.name}-${index}`} className="relative max-w-[14rem]">
            <a
              href={attachment.data}
              target="_blank"
              rel="noreferrer"
              download={attachment.name}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)]/70 px-2.5 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
                onRemove && "pr-8",
              )}
              title={attachment.name}
            >
              <FileText size="0.875rem" className="shrink-0 text-[var(--primary)]" />
              <span className="min-w-0 truncate">{attachment.name}</span>
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:text-[var(--primary)]"
                aria-label={localizeUi("ui.chat.homeprofessormarichat.removeAttachment")}
                title={localizeUi("ui.chat.homeprofessormarichat.removeAttachment")}
              >
                <X size="0.75rem" />
              </button>
            )}
          </div>
        ),
      )}
    </div>
  );
}

/** R11: files ride in the composer's top row as chips (thumbnail or file icon, name, ×), before "Aware of". */
function ProfessorMariAttachmentPreviews({
  attachments,
  isReading,
  onRemove,
}: {
  attachments: ProfessorMariAttachment[];
  isReading: boolean;
  onRemove: (index: number) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <>
      {attachments.map((attachment, index) => (
        <span key={`${attachment.name}-${index}`} className="mari-composer-chip" title={attachment.name}>
          {isProfessorMariImageAttachment(attachment) ? (
            <img src={attachment.data} alt="" className="mari-composer-chip__thumb" draggable={false} />
          ) : (
            <FileText aria-hidden="true" />
          )}
          <span className="mari-composer-chip__text">{attachment.name}</span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="mari-workspace-context-chip__remove"
            aria-label={localizeUi("ui.chat.professormariattachmentpreviews.removeValue1", { value1: attachment.name })}
            title={localizeUi("ui.chat.professormariattachmentpreviews.removeFile")}
          >
            <X size="0.625rem" aria-hidden="true" />
          </button>
        </span>
      ))}
      {isReading ? (
        <span className="mari-composer-chip">
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="mari-composer-chip__text">{localizeUi("ui.chat.chatinput.readingFile")}</span>
        </span>
      ) : null}
    </>
  );
}

function MariReasoningPanel({
  thinking,
  live,
  forceOpen,
  seconds,
}: {
  thinking: string;
  live?: boolean;
  forceOpen?: boolean;
  /** How long she thought, when the stream timed it. Older saved runs fall back to a line count. */
  seconds?: number | null;
}) {
  const { t: localizeUi } = useUiTranslation();
  const lines = thinking.trim().split(/\n+/);
  const lineCount = Math.max(1, lines.length);
  const latestThought = lines.at(-1)?.trim() ?? "";
  return (
    <details
      open={forceOpen || undefined}
      className="mari-reasoning-panel group text-[0.8125rem] text-[var(--muted-foreground)]"
      data-live={live ? "true" : "false"}
    >
      {/* Direction A: a quiet one-line disclosure, like a finished step. */}
      <summary
        className={cn(
          "-ml-2 flex min-h-[1.9rem] max-w-full cursor-pointer list-none items-center gap-2 rounded-lg px-2 marker:hidden hover:bg-[var(--mari-hover)] hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden",
          live ? "w-full" : "w-fit",
        )}
      >
        <Sparkles
          size="0.72rem"
          className={cn("mari-reasoning-panel__star shrink-0", live && "mari-reasoning-panel__star--live")}
          aria-hidden="true"
        />
        {live ? null : (
          <span>
            {seconds != null
              ? localizeUi("mari.workCard.thoughtFor", { seconds })
              : localizeUi("ui.chat.marireasoningpanel.reasoning")}
          </span>
        )}
        {live ? (
          <span className="mari-reasoning-panel__ticker" role="status">
            <span key={latestThought}>{latestThought || localizeUi("ui.chat.marireasoningpanel.live")}</span>
          </span>
        ) : seconds != null ? null : (
          <span className="rounded-md bg-[var(--background)]/70 px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.12em] opacity-75">
            {localizeUi("ui.chat.marireasoningpanel.value1LineValue2", {
              value1: lineCount,
              value2: lineCount === 1 ? "" : localizeUi("ui.noodle.stageprofileview.s"),
            })}
          </span>
        )}
        <ChevronRight
          size="0.75rem"
          className="shrink-0 opacity-70 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words py-1 pl-5 text-[0.6875rem] italic leading-relaxed text-[var(--muted-foreground)]">
        {thinking.trimEnd()}
      </pre>
    </details>
  );
}

/**
 * Ticks while the run is active. Anchored to the run's own start when the steps carry one, so
 * closing and reopening the omnibar mid-run resumes the count instead of restarting at zero.
 */
function useWorkspaceElapsedSeconds(active: boolean, startedAtMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      mountedAtRef.current = null;
      return;
    }
    mountedAtRef.current ??= Date.now();
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [active]);

  if (!active) return 0;
  const anchor = startedAtMs ?? mountedAtRef.current;
  return anchor ? Math.max(0, Math.floor((now - anchor) / 1_000)) : 0;
}

type WorkspaceToolItem = Extract<WorkspaceTimelineItem, { type: "tool" }>;

/**
 * What the live line says between steps depends on where she is and how long you have waited, not on a
 * timer: a fresh start, going over what she just found (naming it when she can), a longer wait, a very
 * long one, or writing her answer. Sizes of each `mari.workCard.phrases.<group>.pN` group in en.json.
 */
const MARI_PHRASE_GROUPS = { start: 6, review: 6, reviewSubject: 4, long: 7, veryLong: 5, replying: 7 } as const;
const MARI_LONG_WAIT_SECONDS = 15;
const MARI_VERY_LONG_WAIT_SECONDS = 45;

/** A little pixel Mari. The inner span is keyed by scene, so a new scene pops in instead of cutting. */
function MariSprite({
  scene,
  role,
  pullTarget = true,
}: {
  scene: MariWorkAnimation;
  role: "working";
  /** D1: suppressed while an appended arrival at the bottom of the transcript owns the marker instead. */
  pullTarget?: boolean;
}) {
  const appearance = useMariAppearancePack();
  return (
    <span
      className="mari-live-work__sprite"
      data-scene={scene.id}
      data-role={role}
      data-appearance-pack={appearance.id}
      data-mari-pull-target={pullTarget ? "mari-current" : undefined}
      aria-hidden="true"
    >
      <span
        key={`${appearance.id}:${scene.id}`}
        style={{ "--mari-work-sprite": `url(${scene.src})` } as CSSProperties}
      />
    </span>
  );
}

/**
 * What Mari is doing right now, as one line. A new phrase writes itself in letter by letter while
 * the old one lifts away; screen readers get the plain text once.
 */
function MariLiveHeadline({ text, subject }: { text: string; subject?: string | null }) {
  const reduceMotion = useReducedMotion();
  const letters = (value: string, offset: number) =>
    [...value].map((char, index) => (
      <span
        key={index}
        className="mari-work-timeline__char"
        style={{ "--i": Math.min(offset + index, 40) } as CSSProperties}
      >
        {char}
      </span>
    ));
  return (
    <span className="mari-work-timeline__phrase" role="status">
      <AnimatePresence initial={false}>
        <motion.span
          key={`${text}\u0000${subject ?? ""}`}
          className="mari-work-timeline__line"
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="sr-only">{subject ? [text, subject].join(" ") : text}</span>
          <span aria-hidden="true">
            {letters(text, 0)}
            {subject ? (
              <span className="mari-work-timeline__subject-text">{letters(` ${subject}`, [...text].length)}</span>
            ) : null}
          </span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A finished step's icon comes from its verb: read, search, create, delete, edit, or a command. */
const STEP_ICONS: Record<StepVerbClass, LucideIcon> = {
  search: Search,
  create: Plus,
  delete: Trash2,
  edit: Pencil,
  read: FileText,
};

function stepIcon(title: string): LucideIcon {
  const verb = stepVerbClass(title);
  return verb ? STEP_ICONS[verb] : Terminal;
}

const PHASE_ICONS: Record<RunPhaseKind, LucideIcon> = { look: FileText, change: Pencil, other: Terminal };

/**
 * Her reply column: the words and what they made, indented by an avatar gutter that is always there (so
 * nothing reflows when she arrives). On her newest finished reply she rests in it beside the first line.
 */
function MariAnswer({
  restStory,
  pullTarget = true,
  children,
}: {
  restStory: MariStoryState | null;
  /** D1: suppressed while an appended arrival at the bottom of the transcript owns the marker instead. */
  pullTarget?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mari-answer" data-sprite={restStory ? "true" : undefined}>
      {restStory ? (
        <span className="mari-answer__sprite">
          <MariStorySprite
            key={restStory}
            state={restStory}
            settleTo={restStory === "success" ? "idle" : undefined}
            pullTarget={pullTarget}
          />
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** The green "done" check: it draws itself once when it mounts. */
function MariDoneMark({ className }: { className?: string }) {
  return (
    <svg className={cn("mari-work-timeline__done-mark", className)} viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="8" transform="rotate(-90 9 9)" />
      <path d="M5.5 9.2l2.3 2.2 4.6-4.8" />
    </svg>
  );
}

/** R14 (item 3): the face of the record a step read directly (a character, a lorebook, an entry's lorebook…). */
function stepRecordFace(
  tool: WorkspaceToolCall,
  characterPreviews?: ReadonlyMap<string, CharacterPreviewModel>,
  lorebookPreviews?: ReadonlyMap<string, LorebookPreviewModel>,
) {
  const record = collectMariReferencedResources([tool]).find((resource) => !resource.fromList);
  if (!record || record.kind === "setting") return null;
  const character = record.kind === "character" ? characterPreviews?.get(record.id) : undefined;
  const lorebook = lorebookPreviews?.get(record.kind === "lorebookEntry" ? (record.parentId ?? "") : record.id);
  return {
    type: resourceResultType(record.kind),
    src: character?.avatarSrc ?? (record.kind === "lorebook" ? lorebook?.imageSrc : undefined),
    avatarCropStyle: character?.avatarCropStyle,
  };
}

function MariWorkTimeline({
  items,
  character,
  lorebook,
  active = true,
  restStory = null,
  goal = null,
  pullTarget = true,
  runFailed = false,
  startedAtMs = null,
  endedAtMs = null,
  characterPreviews,
  lorebookPreviews,
  children,
}: {
  items: WorkspaceTimelineItem[];
  character?: CharacterPreviewModel | null;
  lorebook?: LorebookPreviewModel | null;
  active?: boolean;
  /** R14: the run itself failed (a provider error, no answer), whatever its steps did. */
  runFailed?: boolean;
  /** R14 (item 7): when you sent the message, so the timer and "Worked for" never restart on a step. */
  startedAtMs?: number | null;
  /** When the run ended (her saved reply), for "Worked for". */
  endedAtMs?: number | null;
  /** Faces for the records a step names (R14 item 3). */
  characterPreviews?: ReadonlyMap<string, CharacterPreviewModel>;
  lorebookPreviews?: ReadonlyMap<string, LorebookPreviewModel>;
  /** D1: suppressed while an appended arrival at the bottom of the transcript owns the marker instead. */
  pullTarget?: boolean;
  /** M5a: the request she reported acting on, as one muted line above the run. */
  goal?: ReactNode;
  /** On the newest finished turn, Mari stands on the "Worked for" line in this story. */
  restStory?: MariStoryState | null;
  /** What she made (tiles, references), between her answer and the "Worked for" line. */
  children?: ReactNode;
}) {
  const { t } = useUiTranslation();
  const [folded, setFolded] = useState(false);
  const reduceMotion = useReducedMotion();
  const appearance = useMariAppearancePack();
  const toolItems = items.filter((item): item is WorkspaceToolItem => item.type === "tool");
  // Her thinking is part of the run too, so it counts toward "Worked for".
  const runTimings = items.flatMap((item): RunStepTiming[] =>
    item.type === "tool" ? [item.tool] : item.type === "thinking" ? [item] : [],
  );
  const runAnchorMs = resolveRunAnchorMs(startedAtMs, runTimings);
  const liveElapsedSeconds = useWorkspaceElapsedSeconds(active, runAnchorMs);
  const elapsedSeconds = active
    ? liveElapsedSeconds
    : resolveRunSeconds(runTimings, { startMs: runAnchorMs, endMs: endedAtMs });
  // R13: "Still on it" counts from her last visible change (a step, a thought), not from the run's start,
  // so each new round first names what she just did instead of a generic waiting line.
  const lastChangeMs = runTimings.reduce(
    (latest, timing) => Math.max(latest, timing.updatedAt || timing.startedAt || 0),
    0,
  );
  const quietSeconds =
    active && lastChangeMs ? Math.max(0, Math.floor((Date.now() - lastChangeMs) / 1_000)) : elapsedSeconds;
  // A finished run that failed, or still holds a failed step, is not a success, whatever the last step was.
  const failed = !active && (runFailed || toolItems.some(({ tool }) => tool.status === "error"));
  // The running step is the live line itself, so it is not also a row in the list.
  const shownItems = active ? items.filter((item) => item.type !== "tool" || item.tool.status !== "running") : items;
  // M5a: what came before her first step, her steps as phases (all open while she runs, R13), then
  // her answer.
  const { intro, phases, tail } = groupRunPhases(shownItems, {
    active,
    describe: (tool) => ({ title: inferToolPresentation(tool).title, failed: tool.status === "error" }),
  });
  const introBlocks = buildWorkTimelineBlocks(intro);
  const tailBlocks = buildWorkTimelineBlocks(tail);
  const lastBlock = tailBlocks.at(-1);
  // Her words (and what they made) sit in one column with her avatar gutter on the left; a thought she
  // had before them stays with the work above.
  const answerStart = tailBlocks.findIndex((block) => block.kind === "text");
  const answerBlocks = answerStart < 0 ? [] : tailBlocks.slice(answerStart);
  // On the newest finished turn she rests beside her reply, like an avatar beside a bubble.
  const spriteBesideAnswer = !active && Boolean(restStory) && answerBlocks.length > 0;
  const runningTool = active ? [...toolItems].reverse().find(({ tool }) => tool.status === "running") : undefined;
  // One scene per step, so the Mari who worked a step is the one left beside it when it is done.
  const stepAnimation = ({ tool }: WorkspaceToolItem) =>
    selectMariWorkAnimation({
      activity: inferToolPresentation(tool).title,
      toolNames: [tool.name],
      packId: appearance.id,
    });
  const runningPresentation = runningTool ? inferToolPresentation(runningTool.tool) : null;
  const replying = lastBlock?.kind === "text";
  const lastDoneSubject = [...toolItems].reverse().find(({ tool }) => tool.status === "done");
  const lastSubject = lastDoneSubject ? inferToolPresentation(lastDoneSubject.tool).detail : null;
  const phraseGroup: keyof typeof MARI_PHRASE_GROUPS = replying
    ? "replying"
    : quietSeconds >= MARI_VERY_LONG_WAIT_SECONDS
      ? "veryLong"
      : quietSeconds >= MARI_LONG_WAIT_SECONDS
        ? "long"
        : toolItems.length > 0
          ? lastSubject
            ? "reviewSubject"
            : "review"
          : "start";
  // Stable for the run and group: the phrase changes when her situation does, never on its own.
  const phraseIndex = (stableHash(`${phraseGroup}:${items[0]?.id ?? "mari"}`) % MARI_PHRASE_GROUPS[phraseGroup]) + 1;
  const headline = runningPresentation
    ? { text: runningPresentation.title, subject: runningPresentation.detail }
    : {
        text: t(`mari.workCard.phrases.${phraseGroup}.p${phraseIndex}`, { subject: lastSubject ?? "" }),
        subject: null,
      };
  // While she works, one scene plays on the live line: the running step's, or a thinking one between steps.
  const liveScene = !active
    ? null
    : runningTool
      ? stepAnimation(runningTool)
      : selectMariWorkAnimation({
          // A long wait grows a seed; otherwise she thinks or edits.
          activity: replying ? "write" : quietSeconds >= MARI_LONG_WAIT_SECONDS ? "wait" : "think",
          toolNames: [],
          packId: appearance.id,
        });
  const renderBlock = (block: (typeof tailBlocks)[number]) => {
    if (block.kind !== "steps") {
      return block.kind === "text" ? (
        <CompactMarkdown
          key={block.id}
          // A finished answer's trailing "Why" list folds into one line under the outcome.
          content={!active && block === lastBlock ? splitMariAnswerWhy(block.content).answer : block.content}
          streaming={active && block === lastBlock}
        />
      ) : (
        <MariReasoningPanel
          key={block.id}
          thinking={block.content}
          seconds={block.seconds}
          live={active && block === lastBlock}
        />
      );
    }
    return (
      <ol key={block.id} className="mari-live-work__steps" aria-label={t("mari.workCard.progress")}>
        <AnimatePresence initial={false}>
          {block.steps.map((step) => {
            const { id, tool } = step;
            const presentation = inferToolPresentation(tool);
            const running = tool.status === "running";
            const stepFailed = tool.status === "error";
            const stepSeconds = resolveStepSeconds({
              running,
              startedAt: tool.startedAt,
              durationMs: tool.durationMs,
              updatedAt: tool.updatedAt,
              now: Date.now(),
            });
            const StepIcon = stepFailed ? AlertTriangle : stepIcon(presentation.title);
            const face = stepRecordFace(tool, characterPreviews, lorebookPreviews);
            return (
              // M3: append-only - no layout animation (it fought MariSmoothGrow's height transition and
              // produced a frame of overlapping/ghost rows). Still true here: no `layout` prop, no height
              // animation, the row never moves. The key includes status so a step's running->done/error
              // transition remounts just that row (a "changed" plop); an unrelated re-render (duration
              // ticking, sibling update) keeps the same key and replays nothing.
              <motion.li
                key={`${id}:${tool.status}`}
                data-status={tool.status}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.22, bounce: 0.25 }}
              >
                <details className="mari-live-work__step-details group">
                  <summary>
                    <StepIcon size="0.9rem" className="mari-live-work__step-icon shrink-0" aria-hidden="true" />
                    <span className="mari-live-work__step-label">
                      {pastTenseStepTitle(presentation.title)}
                      {presentation.detail ? (
                        <span className="mari-live-work__step-subject">
                          {face ? (
                            <ResultTypeIcon
                              type={face.type}
                              src={face.src}
                              kind="avatar"
                              avatarCropStyle={face.avatarCropStyle}
                              className="mari-step-face"
                            />
                          ) : null}
                          {presentation.detail}
                        </span>
                      ) : null}
                    </span>
                    <span className="mari-live-work__step-duration">
                      {stepSeconds === null ? "—" : t("mari.workCard.stepSeconds", { seconds: stepSeconds })}
                    </span>
                    {tool.status === "done" ? <MariDoneMark className="mari-done-mark--step" /> : null}
                    <ChevronRight size="0.7rem" className="mari-live-work__step-chevron shrink-0" aria-hidden="true" />
                  </summary>
                  <div className="mari-live-work__step-details-body">
                    <div className="mari-live-work__step-details-label">
                      <Terminal size="0.7rem" aria-hidden="true" />
                      {t("mari.workCard.technicalDetails")}
                    </div>
                    <code>{formatToolName(tool.name)}</code>
                    {tool.input !== undefined ? <pre>{previewValue(tool.input, 240)}</pre> : null}
                    {tool.output !== null && tool.output !== undefined ? (
                      <pre>{previewValue(tool.output, 320)}</pre>
                    ) : null}
                  </div>
                </details>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    );
  };
  // Consecutive work blocks (thoughts and steps) share one rail; her words sit at full width between them.
  const renderSegments = (list: typeof tailBlocks) => {
    const out: ReactNode[] = [];
    let rail: ReactNode[] = [];
    const flush = () => {
      if (!rail.length) return;
      out.push(
        <div key={`rail-${out.length}`} className="mari-work-timeline__rail">
          {rail}
        </div>,
      );
      rail = [];
    };
    for (const block of list) {
      if (block.kind === "text") {
        flush();
        out.push(renderBlock(block));
      } else rail.push(renderBlock(block));
    }
    flush();
    return out;
  };
  const workedFor = t("mari.workCard.workedFor", { seconds: elapsedSeconds, count: toolItems.length });
  // R14: "Worked for" folds the work only when there is more than one group to fold; one phase already
  // opens and closes on its own line, so a toggle there would reveal nothing new.
  const foldableGroups =
    phases.length +
    [...introBlocks, ...tailBlocks.slice(0, answerStart < 0 ? undefined : answerStart)].filter(
      (block) => block.kind !== "text",
    ).length;
  const workedForMark = failed ? (
    <AlertTriangle size="0.8rem" className="mari-live-work__failed-icon" aria-hidden="true" />
  ) : (
    <MariDoneMark />
  );
  const restStoryText =
    restStory && restStory !== "idle" && restStory !== "success" ? t(`mari.stories.${restStory}`) : null;

  return (
    <TranscriptRow layout="document" marker={null}>
      <section
        className="mari-work-timeline"
        data-active={active ? "true" : "false"}
        data-outcome={failed ? "failed" : undefined}
        data-folded={folded ? "true" : undefined}
        aria-label={t("mari.workCard.label")}
        aria-busy={active}
      >
        <MariResourceSubject character={character} lorebook={lorebook} className="mari-work-timeline__subject" />

        {goal}
        {renderSegments(introBlocks)}
        {phases.length > 0 ? (
          <div className="mari-work-timeline__rail">
            {phases.map((phase) => {
              const PhaseIcon = PHASE_ICONS[phase.kind];
              return (
                <details
                  key={phase.id}
                  className="mari-phase"
                  open={phase.open}
                  data-state={phase.live ? "live" : "done"}
                >
                  <summary className="mari-disclosure">
                    <PhaseIcon size="0.85rem" className="shrink-0" aria-hidden="true" />
                    <span>
                      {phase.live
                        ? t(`mari.workCard.phase.${phase.kind}Live`)
                        : t(`mari.workCard.phase.${phase.kind}`, { count: phase.steps })}
                    </span>
                    {phase.live ? <span className="mari-phase__count">{phase.steps}</span> : null}
                    {!phase.live && phase.failed === 0 ? <MariDoneMark className="mari-done-mark--step" /> : null}
                    {phase.failed > 0 ? (
                      <span className="mari-phase__failed">
                        {t("mari.workCard.phase.failed", { count: phase.failed })}
                      </span>
                    ) : null}
                    <ChevronRight size="0.7rem" className="mari-disclosure__chevron shrink-0" aria-hidden="true" />
                  </summary>
                  <div className="mari-phase__body">{buildWorkTimelineBlocks(phase.items).map(renderBlock)}</div>
                </details>
              );
            })}
          </div>
        ) : null}
        {renderSegments(answerStart < 0 ? tailBlocks : tailBlocks.slice(0, answerStart))}
        {answerBlocks.length > 0 || children ? (
          <MariAnswer restStory={spriteBesideAnswer ? restStory : null} pullTarget={pullTarget}>
            {renderSegments(answerBlocks)}
            {children}
          </MariAnswer>
        ) : null}

        {active ? (
          // The live line is always the last line, and working Mari leads it on the left: new work lands above
          // it and pushes the older lines up, so she is never left behind on an old step or clipped.
          <div className="mari-work-timeline__live">
            {liveScene ? <MariSprite scene={liveScene} role="working" pullTarget={pullTarget} /> : null}
            <MariLiveHeadline text={headline.text} subject={headline.subject} />
            <span
              className="mari-work-timeline__timer"
              aria-label={t("mari.workCard.elapsed", { seconds: elapsedSeconds })}
            >
              {[...String(elapsedSeconds), "s"].map((char, index, chars) => (
                // Keyed by place and value, so only the digit that changed rolls in.
                <span key={`${chars.length - index}:${char}`} aria-hidden="true">
                  {char}
                </span>
              ))}
            </span>
          </div>
        ) : toolItems.length > 0 || answerBlocks.length > 0 || (restStory && (!spriteBesideAnswer || restStoryText)) ? (
          // Done: where the live line was, one line says how long she worked and folds the work away. On the
          // newest turn she rests beside her reply; only a turn without words keeps her on this line. Older
          // turns keep only the words.
          <div className="mari-work-timeline__live" data-past={restStory && !spriteBesideAnswer ? undefined : "true"}>
            {restStory && !spriteBesideAnswer ? (
              <MariStorySprite
                key={restStory}
                state={restStory}
                settleTo={restStory === "success" ? "idle" : undefined}
                pullTarget={pullTarget}
              />
            ) : null}
            {toolItems.length === 0 ? (
              restStoryText ? (
                <span className="text-xs text-[var(--muted-foreground)]">{restStoryText}</span>
              ) : answerBlocks.length > 0 ? (
                // R13: an answer without steps still ends on a small done check.
                <span className="mari-work-timeline__done">
                  <MariDoneMark />
                  {t("mari.workCard.done")}
                </span>
              ) : null
            ) : foldableGroups > 1 ? (
              <button
                type="button"
                className="mari-work-timeline__header"
                aria-expanded={!folded}
                onClick={() => setFolded((current) => !current)}
              >
                {workedForMark}
                <span className="mari-work-timeline__status">{workedFor}</span>
                <ChevronRight size="0.75rem" className="mari-work-timeline__chevron" aria-hidden="true" />
              </button>
            ) : (
              <span className="mari-work-timeline__header" data-static="true">
                {workedForMark}
                <span className="mari-work-timeline__status">{workedFor}</span>
              </span>
            )}
          </div>
        ) : null}
      </section>
    </TranscriptRow>
  );
}

const MARI_MESSAGE_ACTIONS_CLASS =
  "mt-1 flex gap-1.5 opacity-100 transition-opacity [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-focus-within:opacity-100 [@media(pointer:fine)]:group-hover:opacity-100";
const MARI_MESSAGE_ACTION_BUTTON_CLASS =
  "rounded p-1 text-[var(--marinara-chat-chrome-panel-muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:text-[var(--primary)]";

/** Copy, regenerate and delete under one of her replies: shown on hover with a mouse, always on touch. */
function MariReplyActions({
  content,
  onRegenerate,
  onDelete,
}: {
  content: string;
  onRegenerate?: () => void;
  onDelete?: () => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copyLabel = localizeUi(copied ? "markdown.copied" : "markdown.copy");
  return (
    <div className={MARI_MESSAGE_ACTIONS_CLASS}>
      {content.trim() ? (
        <button
          type="button"
          onClick={() =>
            void copyToClipboard(content).then((ok) =>
              ok ? setCopied(true) : toast.error(localizeUi("markdown.copyFailed")),
            )
          }
          className={MARI_MESSAGE_ACTION_BUTTON_CLASS}
          aria-label={copyLabel}
          title={copyLabel}
        >
          {copied ? <Check size="0.8rem" /> : <Copy size="0.8rem" />}
        </button>
      ) : null}
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className={MARI_MESSAGE_ACTION_BUTTON_CLASS}
          aria-label={localizeUi("ui.chat.chatmessage.regenerate")}
          title={localizeUi("ui.chat.chatmessage.regenerate")}
        >
          <RefreshCw size="0.8rem" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={MARI_MESSAGE_ACTION_BUTTON_CLASS}
          aria-label={localizeUi("lorebook.editor.batch.delete")}
          title={localizeUi("lorebook.editor.batch.delete")}
        >
          <Trash2 size="0.8rem" />
        </button>
      )}
    </div>
  );
}

/**
 * I3 / R10: something she made or changed, as a row of the outcome group: its face, its name (with "New"
 * when she made it), one fact in words ("Changed description", "New lorebook · 4 entries") and › to open.
 */
function MariWorkspaceActionResultRow({
  result,
  onOpen,
  character,
  lorebook,
}: {
  result: MariWorkspaceActionResult;
  onOpen: (result: MariWorkspaceActionResult) => void;
  character?: CharacterPreviewModel | null;
  lorebook?: LorebookPreviewModel | null;
}) {
  const { t: localizeUi, i18n } = useUiTranslation();
  const characterPreview =
    result.resource.kind === "character" && character?.id === result.resource.id ? character : null;
  const lorebookPreview = result.resource.kind === "lorebook" && lorebook?.id === result.resource.id ? lorebook : null;
  const name = characterPreview?.name ?? lorebookPreview?.name ?? result.resource.label ?? result.summary;
  const created = result.status === "created";
  const fact = created
    ? [
        localizeUi("ui.chat.homeprofessormarichat.resultFact.new", {
          type: localizeUi(`omnibar.categories.${result.resource.kind}`).toLocaleLowerCase(),
        }),
        typeof lorebookPreview?.entryCount === "number"
          ? localizeUi("ui.chat.homeprofessormarichat.refFact.entries", { count: lorebookPreview.entryCount })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : result.changedFields.length > 0
      ? localizeUi("ui.chat.homeprofessormarichat.changedFields", {
          fields: new Intl.ListFormat(i18n.resolvedLanguage ?? "en", { type: "conjunction" }).format(
            result.changedFields.slice(0, 3),
          ),
        })
      : result.summary;
  return (
    <MariRow
      slot={
        <ResultTypeIcon
          type={resourceResultType(result.resource.kind)}
          src={characterPreview?.avatarSrc ?? lorebookPreview?.imageSrc}
          kind={characterPreview ? "avatar" : "image"}
          avatarCropStyle={characterPreview?.avatarCropStyle}
        />
      }
      title={name}
      badge={
        created ? <span className="mari-new-badge">{localizeUi("ui.chat.mariediteasyviewer.actionNew")}</span> : null
      }
      fact={fact}
      trail="open"
      trailLabel={localizeUi("ui.chat.homeprofessormarichat.openResult")}
      onClick={() => onOpen(result)}
    />
  );
}

/**
 * What her answer is about, as rows of one group right under her words (R10): a face or type icon, the
 * name and one fact about that thing (never its type), and › to open it at once. The description is the
 * row's tooltip. `bare` returns the rows only, for a group the caller already draws (the arrival).
 */
function MariReferencedResources({
  resources,
  characterPreviews,
  lorebookPreviews,
  onOpen,
  bare = false,
  skipName,
}: {
  resources: readonly MariReferencedResource[];
  characterPreviews: ReadonlyMap<string, CharacterPreviewModel>;
  lorebookPreviews: ReadonlyMap<string, LorebookPreviewModel>;
  onOpen: (resource: MariReferencedResource) => void;
  bare?: boolean;
  /** A name the line above already shows: its row stays only when it adds a fact. */
  skipName?: string;
}) {
  const { t: localizeUi } = useUiTranslation();
  const localize = useLocalizedUiText();
  const hasAgents = resources.some((resource) => resource.kind === "agent");
  // The live config says whether an agent is on now; what she read may be older.
  const { data: agentConfigs } = useAgentConfigs(hasAgents);
  // A chat row shows its mode badge (Q6) and when it last moved; the list is usually cached already.
  const { data: chatList } = useChats({
    enabled: resources.some((resource) => resource.kind === "chat"),
    refetchOnMount: false,
  });
  const settings = getOmnibarSettingsDestinations();
  const rows = resources.flatMap((resource) => {
    // A row that cannot open anything (an entry without its lorebook, a renamed setting) is not shown.
    if (!mariReferenceTarget(resource, settings)) return [];
    const character = resource.kind === "character" ? characterPreviews.get(resource.id) : undefined;
    const lorebook = resource.kind === "lorebook" ? lorebookPreviews.get(resource.id) : undefined;
    const agent = resource.kind === "agent" ? agentConfigs?.find((row) => row.type === resource.id) : undefined;
    const builtInAgent = resource.kind === "agent" ? BUILT_IN_AGENTS.find((row) => row.id === resource.id) : undefined;
    const setting = resource.kind === "setting" ? settings.find((row) => row.id === resource.id) : undefined;
    const chat = resource.kind === "chat" ? chatList?.find((row) => row.id === resource.id) : undefined;
    const name =
      character?.name ??
      lorebook?.name ??
      agent?.name ??
      (setting ? localize(setting.title) : null) ??
      resource.name ??
      builtInAgent?.name;
    // A record she read that no longer exists (or never loaded) has nothing to show.
    if (!name) return [];
    const description =
      character?.summary ??
      character?.description ??
      lorebook?.description ??
      agent?.description ??
      (setting ? localize(setting.description) : undefined) ??
      resource.detail ??
      builtInAgent?.description;
    const agentState =
      resource.state === "failed"
        ? "failed"
        : agent
          ? agent.enabled === "true"
            ? "on"
            : "off"
          : (resource.state ?? null);
    const lastMoved = chat ? (chat.lastMessageAt ?? chat.updatedAt) : null;
    const people = (chat?.characterIds ?? []).flatMap((id) => {
      const person = characterPreviews.get(id);
      return person ? [{ name: person.name, src: person.avatarSrc, avatarCropStyle: person.avatarCropStyle }] : [];
    });
    const fact = mariReferenceFact(
      resource.kind,
      {
        description,
        agentState,
        entryCount: lorebook?.entryCount,
        lorebookName:
          lorebookPreviews.get(resource.parentId ?? "")?.name ??
          // The lorebook she read the entry from, when it is not loaded here.
          resources.find((other) => other.kind === "lorebook" && other.id === resource.parentId)?.name ??
          undefined,
        entryKey: resource.key,
        people: people
          .slice(0, 2)
          .map((person) => person.name)
          .join(", "),
        time: lastMoved ? formatRelativeContact(lastMoved) : null,
        section: setting ? localize(setting.sectionLabel) : undefined,
      },
      localizeUi,
    );
    return [
      {
        resource,
        key: `${resource.kind}:${resource.id}`,
        name,
        fact,
        description,
        failed: resource.state === "failed",
        // A chat shows who is in it (Q6 stacked faces), with its mode as the badge.
        faces: people,
        src: character?.avatarSrc ?? lorebook?.imageSrc ?? agent?.imagePath ?? people[0]?.src,
        avatarCropStyle: character?.avatarCropStyle ?? people[0]?.avatarCropStyle,
        type: resource.kind === "chat" ? chatResultType(chat?.mode) : resourceResultType(resource.kind),
      },
    ];
  });
  // Two records with the same name read as a glitch in a list; the first one stands for both. The
  // arrival does not repeat a name its line already shows unless the row adds a fact.
  const seenNames = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const nameKey = `${row.resource.kind}:${row.name.toLocaleLowerCase()}`;
    if (seenNames.has(nameKey)) return false;
    seenNames.add(nameKey);
    return !(skipName && row.name === skipName && !row.fact);
  });
  if (uniqueRows.length === 0) return null;
  const items = uniqueRows.map((row) => (
    <MariRow
      key={row.key}
      compact={!bare}
      slot={
        <ResultTypeIcon
          type={row.type}
          src={row.src}
          kind="avatar"
          avatarCropStyle={row.avatarCropStyle}
          faces={row.faces}
        />
      }
      title={row.name}
      fact={row.fact}
      hint={row.description}
      state={row.failed ? "failed" : undefined}
      trail="open"
      trailLabel={localizeUi("ui.chat.marisuggestionchips.actsNow")}
      onClick={() => onOpen(row.resource)}
    />
  ));
  if (bare) return <>{items}</>;
  return (
    <MariList cols={items.length > 1} data-cards="refs">
      {items}
    </MariList>
  );
}

function MariResourceSubject({
  character,
  lorebook,
  compact = true,
  className,
}: {
  character?: CharacterPreviewModel | null;
  lorebook?: LorebookPreviewModel | null;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useUiTranslation();
  if (character) {
    return (
      <CharacterSubject
        character={character}
        label={t("ui.chat.homeprofessormarichat.aboutCharacter")}
        compact={compact}
        className={cn("w-fit max-w-full border-0 bg-[var(--primary)]/6", className)}
      />
    );
  }
  if (lorebook) {
    return (
      <LorebookSubject
        lorebook={lorebook}
        label={t("ui.chat.homeprofessormarichat.aboutLorebook")}
        compact={compact}
        className={cn("w-fit max-w-full border-0 bg-[var(--primary)]/6", className)}
      />
    );
  }
  return null;
}

/**
 * The reviews a turn holds, split by whether they already changed something or wait for your answer.
 * `records` names what they show (`review:<id>`, `<type>:<record id>`), so a turn draws one row per record.
 */
type MariTurnReviews = { changed: ReactNode[]; needsOk: ReactNode[]; records: ReadonlySet<string> };

/**
 * M5a / R10: what a run needs from you and what it changed, as two groups after her answer. What needs
 * you comes first. The labels show only when both kinds are there; one kind needs no heading.
 */
function MariOutcomeGroup({ changed, needsOk }: Pick<MariTurnReviews, "changed" | "needsOk">) {
  const { t: localizeUi } = useUiTranslation();
  if (changed.length === 0 && needsOk.length === 0) return null;
  const labelled = changed.length > 0 && needsOk.length > 0;
  const section = (label: string, rows: ReactNode[]) =>
    rows.length > 0 ? (
      <MariList head={labelled ? label : undefined} role="group" aria-label={label}>
        {rows}
      </MariList>
    ) : null;
  return (
    <div className="mari-list-stack" data-cards="outcome">
      {section(localizeUi("ui.chat.homeprofessormarichat.outcomeNeedsYou"), needsOk)}
      {section(localizeUi("ui.chat.homeprofessormarichat.outcomeChanged"), changed)}
    </div>
  );
}

/** Her reasons, folded to one "Why" line you can open (the server asks for at most three). */
function MariWhyDisclosure({ points }: { points: string[] }) {
  const { t: localizeUi } = useUiTranslation();
  if (points.length === 0) return null;
  return (
    <details className="mari-why">
      <summary className="mari-disclosure">
        {localizeUi("ui.chat.homeprofessormarichat.why")}
        <ChevronRight size="0.7rem" className="mari-disclosure__chevron shrink-0" aria-hidden="true" />
      </summary>
      <CompactMarkdown content={points.map((point) => `- ${point}`).join("\n")} />
    </details>
  );
}

/** What a finished run made, under her answer: reference cards, the outcome group, her reasons, then the
 * reply actions. Shared by the historic-turn render and the active turn's own timeline (M3) so the two
 * never diverge. */
function MariWorkTimelineOutcome({
  content,
  items,
  actionResults,
  characterPreviews,
  lorebookPreviews,
  onOpenResource,
  onOpenActionResult,
  onRegenerate,
  onDelete,
  reviews,
}: {
  content: string;
  items: WorkspaceTimelineItem[];
  actionResults: MariWorkspaceActionResult[];
  characterPreviews: ReadonlyMap<string, CharacterPreviewModel>;
  lorebookPreviews: ReadonlyMap<string, LorebookPreviewModel>;
  onOpenResource: (resource: MariReferencedResource) => void;
  onOpenActionResult: (result: MariWorkspaceActionResult) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  reviews?: MariTurnReviews;
}) {
  const references = selectMariReplyReferences(
    [
      ...collectMariReferencedResources(items.flatMap((item) => (item.type === "tool" ? [item.tool] : []))),
      ...findMariSettingReferences(content, getOmnibarSettingsDestinations()),
    ],
    content,
  ).filter(
    (resource) =>
      !actionResults.some((result) => result.resource.kind === resource.kind && result.resource.id === resource.id),
  );
  return (
    <div className="mari-run-outcome">
      <MariReferencedResources
        resources={references}
        characterPreviews={characterPreviews}
        lorebookPreviews={lorebookPreviews}
        onOpen={onOpenResource}
      />
      <MariOutcomeGroup
        changed={[
          ...(reviews?.changed ?? []),
          // R10: one row per record. A review of the same record already shows it, with its Undo.
          ...withoutReviewedResults(actionResults, reviews?.records ?? new Set()).map((result) => (
            <MariWorkspaceActionResultRow
              key={`${result.status}-${result.resource.kind}-${result.resource.id}`}
              result={result}
              onOpen={onOpenActionResult}
              character={characterPreviews.get(result.resource.id)}
              lorebook={lorebookPreviews.get(result.resource.id)}
            />
          )),
        ]}
        needsOk={reviews?.needsOk ?? []}
      />
      <MariWhyDisclosure points={splitMariAnswerWhy(stripProfessorMariSpeakerPrefix(content)).why} />
      <MariReplyActions
        content={stripProfessorMariSpeakerPrefix(content)}
        onRegenerate={onRegenerate}
        onDelete={onDelete}
      />
    </div>
  );
}

const CompactMariMessage = memo(function CompactMariMessage({
  message,
  thinking,
  onDelete,
  onEdit,
  onEditAndResend,
  onRegenerate,
  canRegenerate = false,
  onRemoveAttachment,
  onOpenActionResult,
  onOpenResource,
  characterSubject,
  lorebookSubject,
  characterPreviews,
  lorebookPreviews,
  messageContext,
  restStory = null,
  pullTarget = true,
  reviews,
  goal = null,
  runStartedAtMs = null,
}: {
  message: Message;
  thinking?: string | null;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  /** Only on your latest message: save the edit and run Mari again from it, like Claude and Gemini. */
  onEditAndResend?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  canRegenerate?: boolean;
  onRemoveAttachment?: (messageId: string, attachmentIndex: number) => void;
  onOpenActionResult: (result: MariWorkspaceActionResult) => void;
  onOpenResource: (resource: MariReferencedResource) => void;
  characterSubject?: CharacterPreviewModel | null;
  lorebookSubject?: LorebookPreviewModel | null;
  characterPreviews: ReadonlyMap<string, CharacterPreviewModel>;
  lorebookPreviews: ReadonlyMap<string, LorebookPreviewModel>;
  /** What was sent with this message, so its chip (C2) survives the send. */
  messageContext?: ProfessorMariAskContext | null;
  /** Only on the newest finished turn: the story Mari plays on its "Worked for" line. */
  restStory?: MariStoryState | null;
  /** D1: suppressed while an appended arrival at the bottom of the transcript owns the marker instead. */
  pullTarget?: boolean;
  /** The reviews this turn holds, in its outcome group before the "Worked for" line. */
  reviews?: MariTurnReviews;
  /** M5a: the request she reported acting on, as the turn's first line. */
  goal?: ReactNode;
  /** R14 (item 7): when you sent the message this reply answers, so "Worked for" counts from there. */
  runStartedAtMs?: number | null;
}) {
  const { t: localizeUi } = useUiTranslation();
  const content = message.content ?? "";
  const attachments = getProfessorMariAttachments(message);
  const actionResults = getMessageWorkspaceActionResults(message);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const messageTime = formatMariMessageTime(message.createdAt);

  if (message.role === "user") {
    // Your side is a plain bubble on the right, like Claude and Gemini: no avatar and no name label.
    return (
      <TranscriptRow layout="document" className="mari-user-request group" marker={null}>
        {isEditing ? (
          <div className="mt-1 w-full">
            <MacroTextarea
              value={editContent}
              onChange={setEditContent}
              rows={8}
              title={localizeUi("ui.chat.homeprofessormarichat.editMessage")}
              ariaLabel={localizeUi("ui.chat.homeprofessormarichat.editMessage")}
              showMacroReference={false}
              showMarkdownPreview={false}
              className="w-full"
            />
            <div className="mt-1 flex justify-end gap-2">
              {onEditAndResend ? (
                <button
                  type="button"
                  disabled={!editContent.trim()}
                  onClick={() => {
                    onEditAndResend(message.id, editContent);
                    setIsEditing(false);
                  }}
                  className="rounded bg-[var(--primary)] px-2 py-1 text-xs text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {localizeUi("ui.chat.homeprofessormarichat.saveAndSend")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!editContent.trim()}
                onClick={() => {
                  onEdit?.(message.id, editContent);
                  setIsEditing(false);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50",
                  onEditAndResend
                    ? "text-[var(--foreground)] hover:bg-[var(--accent)]"
                    : "bg-[var(--primary)] text-[var(--primary-foreground)]",
                )}
              >
                {localizeUi("ui.noodle.noodlehome.save")}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              >
                {localizeUi("ui.chat.homeprofessormarichat.cancelSelection")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mari-user-request__bubble" title={messageTime ?? undefined}>
            <CompactMarkdown content={content} />
          </div>
        )}
        <MariContextFacetChips facets={professorMariContextFacets(messageContext)} className="mt-1 justify-end" />
        <ProfessorMariAttachedFiles
          attachments={attachments}
          onRemove={onRemoveAttachment ? (index) => onRemoveAttachment(message.id, index) : undefined}
        />
        {/* M3: the row's own existence (not just its buttons) is reserved regardless of busy state -
          onEdit/onDelete only go from disabled to enabled, so this row never pops in and pushes the
          timeline below it down the instant a run finishes. */}
        <div className={MARI_MESSAGE_ACTIONS_CLASS}>
          <button
            type="button"
            onClick={() => {
              if (!onEdit) return;
              setEditContent(content);
              setIsEditing(true);
            }}
            disabled={!onEdit}
            className={cn(MARI_MESSAGE_ACTION_BUTTON_CLASS, "disabled:cursor-not-allowed disabled:opacity-40")}
            aria-label={localizeUi("ui.chat.homeprofessormarichat.editMessage")}
            title={localizeUi("ui.chat.homeprofessormarichat.editMessage")}
          >
            <Pencil size="0.8rem" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(message.id)}
            disabled={!onDelete}
            className={cn(MARI_MESSAGE_ACTION_BUTTON_CLASS, "disabled:cursor-not-allowed disabled:opacity-40")}
            aria-label={localizeUi("ui.chat.homeprofessormarichat.deleteMessage")}
            title={localizeUi("ui.chat.homeprofessormarichat.deleteMessage")}
          >
            <Trash2 size="0.8rem" />
          </button>
        </div>
      </TranscriptRow>
    );
  }

  const workspaceTrace = getMessageWorkspaceTrace(message);
  if (workspaceTrace) {
    const traceItems = timelineItemsFromTrace(workspaceTrace, message);
    return (
      <div className="group">
        <MariWorkTimeline
          items={traceItems}
          character={characterSubject}
          lorebook={lorebookSubject}
          active={false}
          restStory={restStory}
          pullTarget={pullTarget}
          goal={goal}
          runFailed={Boolean(getMessageRunError(message, { includeDismissed: true }))}
          // ponytail: a retry that reused your saved message counts from your first send; a per-attempt
          // start would need the server to stamp each run. Add it if long retries make this misleading.
          startedAtMs={runStartedAtMs}
          endedAtMs={Date.parse(message.createdAt) || null}
          characterPreviews={characterPreviews}
          lorebookPreviews={lorebookPreviews}
        >
          <MariWorkTimelineOutcome
            content={content}
            items={traceItems}
            actionResults={actionResults}
            characterPreviews={characterPreviews}
            lorebookPreviews={lorebookPreviews}
            onOpenResource={onOpenResource}
            onOpenActionResult={onOpenActionResult}
            onRegenerate={onRegenerate && canRegenerate ? () => onRegenerate(message.id) : undefined}
            onDelete={onDelete ? () => onDelete(message.id) : undefined}
            reviews={reviews}
          />
        </MariWorkTimeline>
      </div>
    );
  }

  return (
    <>
      <TranscriptRow layout="document" className="group" marker={null}>
        <MariResourceSubject character={characterSubject} lorebook={lorebookSubject} className="mb-2" />
        {goal}
        <MariAnswer restStory={restStory} pullTarget={pullTarget}>
          <CompactMarkdown content={splitMariAnswerWhy(stripProfessorMariSpeakerPrefix(content)).answer} />
          <MariWorkTimelineOutcome
            content={content}
            items={[]}
            actionResults={actionResults}
            characterPreviews={characterPreviews}
            lorebookPreviews={lorebookPreviews}
            onOpenResource={onOpenResource}
            onOpenActionResult={onOpenActionResult}
            onRegenerate={onRegenerate && canRegenerate ? () => onRegenerate(message.id) : undefined}
            onDelete={onDelete ? () => onDelete(message.id) : undefined}
            reviews={reviews}
          />
        </MariAnswer>
      </TranscriptRow>
      {thinking && (
        <TranscriptRow layout="document" marker={null}>
          <MariReasoningPanel thinking={thinking} />
        </TranscriptRow>
      )}
    </>
  );
});

function LoadingHistoryState() {
  return (
    <div className="flex h-full flex-col justify-end gap-2 px-1 pb-2" aria-live="polite">
      <TranscriptRow layout="document" marker={null}>
        <div className="space-y-1.5 py-1">
          <div className="h-2 w-24 rounded-full bg-[var(--muted)]/45 animate-pulse" />
          <div className="h-2 w-full rounded-full bg-[var(--muted)]/35 animate-pulse" />
          <div className="h-2 w-3/4 rounded-full bg-[var(--muted)]/30 animate-pulse" />
        </div>
      </TranscriptRow>
    </div>
  );
}

type ProfessorMariRecovery = {
  text: string;
  attachments: ProfessorMariAttachment[];
  context: ProfessorMariAskContext | null;
  kind: "provider" | "tool" | "context" | "general";
  /** What the provider or server said, shown under the error. */
  detail?: string;
  /** The optimistic bubble of the failed message, replaced when you retry. */
  localMessageId?: string;
};

function classifyProfessorMariFailure(error: unknown): ProfessorMariRecovery["kind"] {
  const kinds = new Set<ProfessorMariRecovery["kind"]>(["provider", "tool", "context", "general"]);
  const explicitKind = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const kind = (value as Record<string, unknown>).kind;
    return typeof kind === "string" && kinds.has(kind as ProfessorMariRecovery["kind"])
      ? (kind as ProfessorMariRecovery["kind"])
      : null;
  };
  const structuredKind = explicitKind(error) ?? (error instanceof ApiError ? explicitKind(error.payload) : null);
  if (structuredKind) return structuredKind;
  const message = getPrivilegedActionErrorMessage(error, "").toLowerCase();
  if (/context|token|prompt|too large|limit/.test(message)) return "context";
  if (/tool|sandbox|capability|permission|workspace|shell|file/.test(message)) return "tool";
  if (/connection|provider|model|api|network|timeout|timed out|remote/.test(message)) return "provider";
  return "general";
}

export function ProfessorMariPixelScene({ active }: { active: boolean }) {
  const { poses } = useMariAppearancePack();
  return (
    <div className="mari-professor-pixel-scene" data-state={active ? "active" : "idle"} aria-hidden="true">
      <div data-part="glow" />
      <div data-part="desk" />
      <img
        src={poses.chibi}
        {...mariImgLoading(MARI_ASSET_TIER.poses.chibi)}
        width={94}
        height={128}
        alt=""
        data-part="sprite"
        draggable={false}
      />
      <div data-part="laptop">
        <div data-part="screen">
          <span />
          <span />
          <span />
        </div>
        <div data-part="base">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

type HomeProfessorMariChatProps = {
  pageActive?: boolean;
  attachedFooter?: boolean;
  chatWindowOpen?: boolean;
  embeddedTab?: boolean;
  omnibarMode?: boolean;
  launchHidden?: boolean;
  initialAskContext?: ProfessorMariAskContext | null;
  /** Increments on every omnibar handoff that should send its query at once. */
  submitDraftRequest?: number;
  /** A past Mari conversation to open, handed in from the omnibar. */
  openChatId?: string | null;
  pendingReviewRequest?: number;
  /** The specific review `pendingReviewRequest` should jump to, or null for the first one (R9). */
  pendingReviewId?: string | null;
  omnibarHeaderSlot?: HTMLElement | null;
  /** Her status line under "Professor Mari" in the omnibar header's first row. */
  omnibarStatusSlot?: HTMLElement | null;
  /** R11: the first header row's spot for the destinations menu while a phone keyboard is open. */
  omnibarMenuSlot?: HTMLElement | null;
  /** M9: what the empty pane says about the screen she was opened from; null keeps the generic welcome. */
  arrival?: MariArrival | null;
  /**
   * D1: increments on every arrival-door open (⌘J, the pull, the drag, Home's "Ask Professor
   * Mari"). When her chat already has messages, this appends the same arrival content at the
   * bottom of the transcript instead of only showing it on an empty chat.
   */
  arrivalAppendRequest?: number;
  /**
   * R7: the context of the screen an arrival door opened her from. With it, each arrival continues
   * the newest thread for that context, starts one, or asks when another thread was just in use.
   */
  arrivalThread?: MariThreadContext | null;
  /** Runs the arrival cards only the omnibar can (back to its settings search, K5's Undo). */
  onArrivalAction?: (action: MariArrivalAction) => void;
  /** N6 (R22): the handoff an arrival Fix card sends with; the only arrival path that carries the error text. */
  arrivalFixContext?: ProfessorMariAskContext | null;
  onChatWindowOpenChange?: (open: boolean) => void;
  onChatWindowExitComplete?: () => void;
};

export function HomeProfessorMariChat({
  pageActive = true,
  attachedFooter = false,
  chatWindowOpen: controlledChatWindowOpen,
  embeddedTab = false,
  omnibarMode = false,
  launchHidden = false,
  initialAskContext = null,
  submitDraftRequest = 0,
  openChatId = null,
  pendingReviewRequest = 0,
  pendingReviewId = null,
  omnibarHeaderSlot = null,
  omnibarStatusSlot = null,
  omnibarMenuSlot = null,
  arrival = null,
  arrivalAppendRequest = 0,
  arrivalThread = null,
  onArrivalAction,
  arrivalFixContext = null,
  onChatWindowOpenChange,
  onChatWindowExitComplete,
}: HomeProfessorMariChatProps) {
  const appearance = useMariAppearancePack();
  const { t: localizeUi } = useUiTranslation();
  const localize = useLocalizedUiText();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: connectionsRaw, isLoading: connectionsLoading } = useConnections();
  const sidecarModelDownloaded = useSidecarStore((state) => state.modelDownloaded);
  const sidecarModelDisplayName = useSidecarStore((state) => state.modelDisplayName);
  const sidecarNativeToolCalls = useSidecarStore((state) => state.config.enableNativeToolCalls);
  const fetchSidecarStatus = useSidecarStore((state) => state.fetchStatus);
  const trackAchievement = useTrackAchievement();
  const [chatId, setChatId] = useState<string | null>(null);
  const { data: attachedContext } = useMariWorkspaceContext(chatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const draft = useChatStore((state) => state.inputDrafts.get(PROFESSOR_MARI_DRAFT_KEY) ?? "");
  const setInputDraft = useChatStore((state) => state.setInputDraft);
  const enterToSend = useUIStore((state) => state.enterToSendProfessorMari);
  const setDraft = useCallback(
    (next: string | ((current: string) => string)) => {
      const current = useChatStore.getState().inputDrafts.get(PROFESSOR_MARI_DRAFT_KEY) ?? "";
      setInputDraft(PROFESSOR_MARI_DRAFT_KEY, typeof next === "function" ? next(current) : next);
    },
    [setInputDraft],
  );
  // Ghost-text completion for the composer: the user's own names first, because
  // "tell me about cel|" almost always means one of their characters.
  const completionCharacters = useCharacters();
  const completionPersonas = usePersonas();
  const completionLorebooks = useLorebooks();
  const completionPresets = usePresets();
  const completionCandidates = useMemo(
    () => [
      // A character's display name lives inside its card data, not on the row —
      // reading `.name` here returned nothing, which is why characters never
      // completed.
      ...(completionCharacters.data ?? []).map((item) => {
        const record = item as Record<string, unknown>;
        return getCharacterDisplayIdentity({ data: record.data, comment: record.comment as string | null | undefined });
      }),
      ...[completionPersonas.data, completionLorebooks.data, completionPresets.data].flatMap((list) =>
        (list ?? []).map((item) => (item as { name?: string }).name ?? ""),
      ),
    ],
    [completionCharacters.data, completionLorebooks.data, completionPersonas.data, completionPresets.data],
  );
  const characterPreviewById = useMemo(() => {
    const previews = new Map<string, CharacterPreviewModel>();
    for (const item of completionCharacters.data ?? []) {
      const preview = buildCharacterPreviewModel(item);
      if (preview) previews.set(preview.id, preview);
    }
    return previews;
  }, [completionCharacters.data]);
  const lorebookPreviewById = useMemo(
    () =>
      new Map(
        (completionLorebooks.data ?? []).map((item) => {
          const preview = buildLorebookPreviewModel(item);
          return [preview.id, preview] as const;
        }),
      ),
    [completionLorebooks.data],
  );
  const draftSuffix = useMemo(() => completeInline(draft, completionCandidates), [completionCandidates, draft]);
  const acceptDraftCompletion = useCallback(() => {
    if (draftSuffix) setDraft((current) => current + draftSuffix);
  }, [draftSuffix, setDraft]);
  const [attachments, setAttachments] = useState<ProfessorMariAttachment[]>([]);
  const [composerScroll, setComposerScroll] = useState({ left: 0, top: 0 });
  const [handoffContext, setHandoffContext] = useState<ProfessorMariAskContext | null>(() => initialAskContext ?? null);
  const characterFallbackName = t("omnibar.categories.character", "Character");
  const focusedCharacter = resolveContextCharacter(handoffContext, characterPreviewById, characterFallbackName);
  const lorebookFallbackName = t("omnibar.categories.lorebook", "Lorebook");
  const focusedLorebook = resolveContextLorebook(handoffContext, lorebookPreviewById, lorebookFallbackName);
  const [isReadingAttachments, setIsReadingAttachments] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(() => readStoredConnectionId());
  const [workspaceStatus, setWorkspaceStatus] = useState<MariWorkspaceStatus | null>(null);
  /** R14 (item 7): when this client's newest run started and ended; the live timer and "Worked for" read it. */
  const [workspaceRunClock, setWorkspaceRunClock] = useState<{ startedAt: number; endedAt: number | null } | null>(
    null,
  );
  const [workspaceActive, setWorkspaceActive] = useState(false);
  const [workspaceTimeline, setWorkspaceTimeline] = useState<WorkspaceTimelineItem[]>([]);
  const [workspaceReviewActionId, setWorkspaceReviewActionId] = useState<string | null>(null);
  const [workspaceDestination, setWorkspaceDestination] = useState<ProfessorMariWorkspaceDestination>("chat");
  const [chatRowMenuId, setChatRowMenuId] = useState<string | null>(null);
  const chatRowMenuRef = useRef<HTMLDivElement>(null);
  const chatRowPopoverRef = useRef<HTMLDivElement>(null);
  // R11: while a phone keyboard is open the header is one line and the destinations sit in a menu. An open
  // menu keeps it compact (moving focus into the menu closes the keyboard); closing the menu restores it.
  const keyboardOpen = useChatKeyboardOpen();
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerCompact = keyboardOpen || headerMenuOpen;
  const chatHistoryOpen = workspaceDestination === "chats";
  // R52: the slot is empty by default. A user who never opens a panel sees a
  // stream and a composer, and nothing else exists for them.
  const [chatHistory, setChatHistory] = useState<ProfessorMariChatSummary[]>([]);
  const [chatHistoryQuery, setChatHistoryQuery] = useState("");
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatHistorySelectionMode, setChatHistorySelectionMode] = useState(false);
  const [selectedChatHistoryIds, setSelectedChatHistoryIds] = useState<Set<string>>(new Set());
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const skillsMenuOpen = workspaceDestination === "skills";
  const [skills, setSkills] = useState<MariWorkspaceSkillDetail[]>([]);
  const [skillsDiagnostics, setSkillsDiagnostics] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsSaving, setSkillsSaving] = useState(false);
  const [skillsQuery, setSkillsQuery] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState<SkillDraftState>({ name: "", description: "", content: "" });
  const memoriesMenuOpen = workspaceDestination === "memories";
  const [memories, setMemories] = useState<MariInstructionDetail[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [memoriesSaving, setMemoriesSaving] = useState(false);
  const [memoriesQuery, setMemoriesQuery] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState<MemoryDraftState>({ name: "", description: "", content: "" });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadedMessagesChatId, setLoadedMessagesChatId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cancelledChatId, setCancelledChatId] = useState<string | null>(null);
  const [recovery, setRecoveryState] = useState<ProfessorMariRecovery | null>(null);
  // F10: the top-bar edge reads this too, so a client-side failure (404/network before the server
  // ever saw the run) turns it red the same as a server-recorded one.
  const setRecovery = useCallback((value: ProfessorMariRecovery | null) => {
    setRecoveryState(value);
    useChatStore.getState().setMariClientRunFailed(value !== null);
  }, []);
  // Direction A / R10: an answered prompt or review folds to one row ("✓ Kept") until the next send.
  const [resolvedPrompts, setResolvedPrompts] = useState<
    Array<{
      chatId: string | null;
      approval: MariWorkspacePendingApproval;
      outcome: "applied" | "discarded";
    }>
  >([]);
  const [connectionMenuOpen, setConnectionMenuOpen] = useState(false);
  const [permissionsMenuOpen, setPermissionsMenuOpen] = useState(false);
  // #5740: keyed by messageId so expansion never carries over when a new
  // round's record replaces the old one under a different reply.
  const [expandedUnderstoodRequestMessageId, setExpandedUnderstoodRequestMessageId] = useState<string | null>(null);
  const permissionsModeWriteSeqRef = useRef(0);
  // Chat id of pending mode writes (null = none): polls hold mode fields only
  // for the chat the write targets, and count tracks overlapping writes.
  const permissionsModeWritePendingChatRef = useRef<string | null>(null);
  const permissionsModeWritePendingCountRef = useRef(0);

  const permissionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const permissionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [contextViewerOpen, setContextViewerOpen] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [internalChatWindowOpen, setInternalChatWindowOpen] = useState(false);
  const [mobileFocusMode, setMobileFocusMode] = useState(false);
  const hasLoadedRef = useRef(false);
  const notifiedApprovalIdsRef = useRef<Set<string>>(new Set());
  const lastAutoOpenedApprovalKeyRef = useRef("");
  const activeChatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const messageLoadAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptScrollFrameRef = useRef<number | null>(null);
  const suggestionFocusFrameRef = useRef<number | null>(null);
  const transcriptFollowOutputRef = useRef(true);
  // M4: right after reserving the turn's height, "top of the question" and "bottom of the page" can be
  // only a few px apart (the reservation IS the viewport height), so the native "scroll" event OUR OWN
  // placement scroll fires would otherwise read as the reader already being near the bottom and re-arm
  // following before a single token has streamed. Swallow exactly that one event.
  const suppressNextScrollEventRef = useRef(false);
  const connectionButtonRef = useRef<HTMLButtonElement>(null);
  const connectionMenuRef = useRef<HTMLDivElement>(null);
  const skillFileInputRef = useRef<HTMLInputElement>(null);
  const memoryFileInputRef = useRef<HTMLInputElement>(null);
  const lastSyncedMemoryIdRef = useRef<string | null>(null);
  const lastSyncedSkillIdRef = useRef<string | null>(null);
  const hasLoadedSkillsRef = useRef(false);
  const hasLoadedMemoriesRef = useRef(false);
  const memoriesLoadSeqRef = useRef(0);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const embeddedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const floatingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const workspaceAbortRef = useRef<AbortController | null>(null);
  const workspaceRunIdRef = useRef(0);
  const pendingWorkspaceTextRef = useRef("");
  const handledWorkspaceRefreshIdsRef = useRef<Set<string>>(new Set());
  const latestConnectionSelectionRef = useRef<string | null>(selectedConnectionId);
  const pendingConnectionPersistRef = useRef<string | null>(null);
  const connectionPersistInFlightRef = useRef(false);
  const attachmentRemovalInFlightRef = useRef<Set<string>>(new Set());
  const regenerationInFlightRef = useRef(false);
  const messageMutationBusyRef = useRef(false);

  const appendPendingWorkspaceText = useCallback(() => {
    const pendingText = pendingWorkspaceTextRef.current;
    pendingWorkspaceTextRef.current = "";
    if (pendingText) setWorkspaceTimeline((current) => appendTextTimeline(current, pendingText));
  }, []);
  const workspaceTextThrottle = useMemo(
    () => rafThrottle<void>(appendPendingWorkspaceText),
    [appendPendingWorkspaceText],
  );

  useEffect(() => () => workspaceTextThrottle.cancel(), [workspaceTextThrottle]);

  useEffect(
    () => () => {
      messageLoadAbortRef.current?.abort();
      messageLoadAbortRef.current = null;
      if (transcriptScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(transcriptScrollFrameRef.current);
        transcriptScrollFrameRef.current = null;
      }
      if (suggestionFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(suggestionFocusFrameRef.current);
        suggestionFocusFrameRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setActiveChatId = useCallback((id: string) => {
    activeChatIdRef.current = id;
    setChatId(id);
  }, []);

  // This ref callback is recreated (and so re-invoked by React on the SAME node) whenever any of its
  // deps change, not only when a chat is freshly opened - e.g. once more when the initial load of a
  // brand-new chat catches up to a chatId that handleSubmit's own send already moved past. Landing on
  // the bottom must happen once per chat, not every time those deps happen to realign.
  const scrolledToBottomForChatRef = useRef<string | null>(null);
  const setTranscriptScrollNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (transcriptScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(transcriptScrollFrameRef.current);
        transcriptScrollFrameRef.current = null;
      }
      scrollRef.current = node;
      if (!node || loadingHistory || !chatId || loadedMessagesChatId !== chatId) return;
      if (scrolledToBottomForChatRef.current === chatId) return;
      scrolledToBottomForChatRef.current = chatId;
      transcriptFollowOutputRef.current = true;
      transcriptScrollFrameRef.current = window.requestAnimationFrame(() => {
        transcriptScrollFrameRef.current = null;
        if (scrollRef.current === node) scrollProfessorMariTranscriptToBottom(node);
      });
    },
    [chatId, loadedMessagesChatId, loadingHistory],
  );

  // The composer floats over the transcript (M1); the transcript's bottom padding and fade both
  // need the dock's live height, kept on the shared pane as a CSS var so both can read it in CSS.
  const transcriptPaneRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    const pane = transcriptPaneRef.current;
    const dock = composerDockRef.current;
    if (!pane || !dock) return;
    const sync = () => pane.style.setProperty("--mari-dock-h", `${dock.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  // M4: the newest turn (the local user message plus everything that follows it) reserves the
  // transcript's visible height so her reply grows into empty space instead of changing the
  // scrollable height, and the question is placed under the header exactly once, on send.
  const activeTurnRef = useRef<HTMLDivElement>(null);
  const [turnStartMessageId, setTurnStartMessageId] = useState<string | null>(null);

  // R11: grow without a jump. Measure at `auto`, put the old height back and set the new one, so the CSS
  // height transition runs; the cap is the field's max-height (8 lines, 6 on touch, in globals.css).
  const resizeComposer = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    const from = textarea.offsetHeight;
    const scrollTop = textarea.scrollTop;
    textarea.style.height = "auto";
    const cap = Number.parseFloat(getComputedStyle(textarea).maxHeight);
    const to = Number.isFinite(cap) ? Math.min(textarea.scrollHeight, cap) : textarea.scrollHeight;
    textarea.style.height = `${from}px`;
    void textarea.offsetHeight;
    textarea.style.height = `${to}px`;
    textarea.scrollTop = scrollTop;
    textarea.toggleAttribute("data-scrolled", textarea.scrollTop > 0);
  }, []);

  const focusComposer = useCallback(() => {
    if (suggestionFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(suggestionFocusFrameRef.current);
    }
    suggestionFocusFrameRef.current = window.requestAnimationFrame(() => {
      suggestionFocusFrameRef.current = null;
      const textarea = floatingTextareaRef.current ?? embeddedTextareaRef.current;
      textarea?.focus();
    });
  }, []);

  useEffect(() => {
    if (controlledChatWindowOpen) focusComposer();
  }, [controlledChatWindowOpen, focusComposer]);

  useLayoutEffect(() => {
    resizeComposer(embeddedTextareaRef.current);
    resizeComposer(floatingTextareaRef.current);
  }, [draft, resizeComposer]);

  const hasActiveGeneration = useChatStore((state) => (chatId ? state.abortControllers.has(chatId) : false));
  const reduceMotion = useReducedMotion();
  const reduceAmbientEffects = useReducedAmbientEffects();
  // The omnibar already has a fixed shell. Destination animation makes its
  // contents appear to reload and moves the composer while switching tabs.
  const paneTransition = omnibarMode
    ? { duration: 0 }
    : reduceMotion
      ? { duration: 0 }
      : PROFESSOR_MARI_PANE_TRANSITION;
  const mariPhase = useChatStore((state) => (chatId ? (state.mariPhaseByChatId.get(chatId) ?? null) : null));
  const mariChips = useAgentStore((state) => state.mariChips);
  const mariChipsChatId = useAgentStore((state) => state.mariChipsChatId);
  const setMariChips = useAgentStore((state) => state.setMariChips);
  const clearMariChips = useAgentStore((state) => state.clearMariChips);
  const mariPlan = useAgentStore((state) => state.mariPlan);
  const mariPlanChatId = useAgentStore((state) => state.mariPlanChatId);
  const mariPlanCursor = useAgentStore((state) => state.mariPlanCursor);
  const setMariPlan = useAgentStore((state) => state.setMariPlan);
  const recordMariPlanAnswer = useAgentStore((state) => state.recordMariPlanAnswer);
  const clearMariPlan = useAgentStore((state) => state.clearMariPlan);
  const professorMariSuggestionsEnabled = useUIStore((state) => state.professorMariSuggestionsEnabled);
  const showContextUsage = useUIStore((state) => state.showContextUsage);

  const languageConnections = useMemo<ProfessorMariConnectionOption[]>(
    () => filterLanguageGenerationConnections((connectionsRaw ?? []) as APIConnection[]),
    [connectionsRaw],
  );
  const connectionOptions = useMemo<ProfessorMariConnectionOption[]>(() => {
    if (!sidecarModelDownloaded) return languageConnections;
    return [
      ...languageConnections,
      {
        id: LOCAL_SIDECAR_CONNECTION_ID,
        name: sidecarModelDisplayName ? `Local Model (${sidecarModelDisplayName})` : "Local Model (sidecar)",
        model: sidecarModelDisplayName ?? "local-sidecar",
        provider: "local_sidecar",
        isDefault: languageConnections.length === 0,
      },
    ];
  }, [languageConnections, sidecarModelDisplayName, sidecarModelDownloaded]);
  const selectedConnection = useMemo(
    () => connectionOptions.find((connection) => connection.id === selectedConnectionId) ?? null,
    [connectionOptions, selectedConnectionId],
  );
  const effectiveConnection =
    selectedConnection ??
    // `/connections` sends isDefault as "true"/"false"; a bare truthy check took "false" too.
    connectionOptions.find((connection) => String(connection.isDefault) === "true") ??
    connectionOptions[0] ??
    null;
  const effectiveConnectionId = effectiveConnection?.id ?? null;
  const persistentContextCount = professorMariContextCount(attachedContext?.length ?? 0, handoffContext);
  const oneShotContext = handoffContext && !isPersistentProfessorMariContext(handoffContext) ? handoffContext : null;
  const oneShotContextFacets = useMemo(() => professorMariContextFacets(oneShotContext), [oneShotContext]);
  // R14: the composer's context row shows everything she is using - the one-shot facets and her lasting
  // focus (a character or lorebook) - so it stays after the first send instead of vanishing.
  const composerContextFacets = useMemo(() => professorMariContextFacets(handoffContext), [handoffContext]);
  const removeOneShotFacet = useCallback(
    (facet: ProfessorMariContextFacet) =>
      setHandoffContext((current) => withoutProfessorMariContextFacet(current, facet.kind)),
    [],
  );
  const contextBudget = useMemo(
    () => resolveProfessorMariContextBudget(messages, workspaceStatus?.connection?.maxContext),
    [messages, workspaceStatus?.connection?.maxContext],
  );
  const isBusy = sending || hasActiveGeneration || workspaceActive;
  useEffect(() => {
    messageMutationBusyRef.current = isBusy;
  }, [isBusy]);
  const canSubmitMessage = (draft.trim().length > 0 || attachments.length > 0) && !isReadingAttachments;
  const starterSuggestionsAvailable = shouldOfferProfessorMariStarterSuggestions({
    chatId,
    loadedMessagesChatId,
    messageCount: messages.length,
    busy: isBusy,
  });
  // #5748: re-derive the Accept chip from the persisted deferral flag, because the
  // shared chips slot is ephemeral and a reload or unrelated run clears it.
  const lastLoadedMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const lastLoadedMessageExtra =
    lastLoadedMessage && typeof lastLoadedMessage.extra === "object" ? lastLoadedMessage.extra : null;
  const pendingDeferredMutations =
    chatId !== null &&
    loadedMessagesChatId === chatId &&
    !isBusy &&
    lastLoadedMessage?.role === "assistant" &&
    lastLoadedMessageExtra?.mariDeferredMutations === true;
  const storeChipsForChat = mariChipsChatId === chatId ? mariChips : [];
  const visibleSuggestionChips =
    pendingDeferredMutations && !storeChipsForChat.some((chip) => chip.id === MARI_AUTHORIZATION_ACCEPT_CHIP.id)
      ? withHeldChangeDeclineChip([
          MARI_AUTHORIZATION_ACCEPT_CHIP,
          ...(professorMariSuggestionsEnabled ? storeChipsForChat : []),
        ])
      : storeChipsForChat.some((chip) => chip.id === "authorization-accept")
        ? withHeldChangeDeclineChip(
            storeChipsForChat.filter((chip) => professorMariSuggestionsEnabled || chip.id === "authorization-accept"),
          )
        : professorMariSuggestionsEnabled && storeChipsForChat.length > 0
          ? storeChipsForChat
          : professorMariSuggestionsEnabled && starterSuggestionsAvailable
            ? MARI_STARTER_CHIPS
            : [];
  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId, skills],
  );
  const activeSkillCount = skills.filter((skill) => skill.enabled).length;
  const selectedMemory = useMemo(
    () => memories.find((memory) => memory.id === selectedMemoryId) ?? null,
    [selectedMemoryId, memories],
  );
  const activeMemoryCount = memories.filter((memory) => memory.enabled).length;
  const chatHistorySortMode = useUIStore((state) => state.mariPanelSortMode);
  const setChatHistorySortMode = useUIStore((state) => state.setMariPanelSortMode);
  const displayedChatHistory = useMemo(() => {
    const normalizedQuery = chatHistoryQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? chatHistory.filter((item) =>
          // R7: a thread is also found by what it is about.
          `${item.name ?? ""} ${readMariThread(item).contextLabel ?? ""}`.toLowerCase().includes(normalizedQuery),
        )
      : chatHistory;
    return [...filtered].sort((left, right) =>
      compareMariPanelItems(
        { name: left.name ?? "", createdAt: left.createdAt },
        { name: right.name ?? "", createdAt: right.createdAt },
        chatHistorySortMode,
      ),
    );
  }, [chatHistory, chatHistoryQuery, chatHistorySortMode]);
  const desktopChatWindowOpen = controlledChatWindowOpen ?? internalChatWindowOpen;
  const chatWindowOpen = desktopChatWindowOpen || mobileFocusMode;
  const setChatWindowOpen = useCallback(
    (open: boolean) => {
      setInternalChatWindowOpen(open);
      onChatWindowOpenChange?.(open);
    },
    [onChatWindowOpenChange],
  );

  const applyHandoff = useCallback(
    (handoff: ProfessorMariHandoff) => {
      if (handoff.draft !== undefined) setDraft(handoff.draft);
      setHandoffContext(handoff.context ?? null);
      if (handoff.completion?.kind === "return-to-source") {
        setRecovery(null);
      }
      setChatWindowOpen(true);
      focusComposer();
    },
    [focusComposer, setChatWindowOpen, setDraft, setRecovery],
  );

  useEffect(() => {
    const destination = omnibarMode ? "omnibar" : "home";
    const pending = consumeProfessorMariOpenRequest(destination);
    if (pending) applyHandoff(pending);
    const handleOpen = (event: Event) => {
      const handoff = (event as CustomEvent<ProfessorMariOpenDetail>).detail;
      if ((handoff.destination ?? "home") !== destination) return;
      applyHandoff(consumeProfessorMariOpenRequest(destination) ?? handoff);
    };
    window.addEventListener(PROFESSOR_MARI_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(PROFESSOR_MARI_OPEN_EVENT, handleOpen);
  }, [applyHandoff, omnibarMode]);

  // Direct prop channel (e.g. the omnibar Mari pane) — avoids the global open
  // event so a co-mounted Home instance never steals the handoff context.
  // Read when the history load lands, not when it starts: M9's arrival context can come in a commit
  // after this pane mounted, and the load must not then restore an older focus over it.
  const initialAskContextRef = useRef(initialAskContext);
  useEffect(() => {
    initialAskContextRef.current = initialAskContext;
    if (initialAskContext) setHandoffContext(initialAskContext);
  }, [initialAskContext]);

  const loadMessages = useCallback(
    async (id: string, options: { restoreFocus?: boolean | (() => boolean); shouldApply?: () => boolean } = {}) => {
      messageLoadAbortRef.current?.abort();
      const controller = new AbortController();
      messageLoadAbortRef.current = controller;
      try {
        const items = await api.get<Message[]>(`/chats/${id}/messages?limit=80`, {
          signal: controller.signal,
        });
        if (
          controller.signal.aborted ||
          messageLoadAbortRef.current !== controller ||
          activeChatIdRef.current !== id ||
          options.shouldApply?.() === false
        ) {
          return;
        }
        const normalizedMessages = items.map((message) => ({ ...message, extra: toMessageExtra(message) }));
        setMessages(normalizedMessages);
        let restoredContext: ProfessorMariAskContext | null = null;
        for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
          const messageContext = getProfessorMariMessageContext(normalizedMessages[index]!);
          if (messageContext === undefined) continue;
          restoredContext = messageContext;
          break;
        }
        const restoreFocus =
          typeof options.restoreFocus === "function" ? options.restoreFocus() : options.restoreFocus !== false;
        if (restoreFocus) setHandoffContext(persistentResourceContext(restoredContext));
        setLoadedMessagesChatId(id);
        return normalizedMessages;
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      } finally {
        if (messageLoadAbortRef.current === controller) messageLoadAbortRef.current = null;
      }
    },
    [],
  );

  const loadChatHistory = useCallback(async () => {
    setChatHistoryLoading(true);
    try {
      const items = await api.get<ProfessorMariChatSummary[]>("/chats/internal/professor-mari/chats");
      setChatHistory(items);
      setSelectedChatHistoryIds((current) => {
        const availableIds = new Set(items.map((item) => item.id));
        return new Set([...current].filter((id) => availableIds.has(id)));
      });
    } finally {
      setChatHistoryLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    if (hasLoadedSkillsRef.current && skills.length > 0) return;
    setSkillsLoading(true);
    try {
      const response = await api.get<MariWorkspaceSkillsResponse>("/professor-mari/workspace/skills");
      setSkills(response.skills);
      setSkillsDiagnostics(response.diagnostics);
      const isInitialSkillsLoad = !hasLoadedSkillsRef.current;
      hasLoadedSkillsRef.current = true;
      setSelectedSkillId((current) => {
        if (current && response.skills.some((skill) => skill.id === current)) return current;
        // Only auto-expand the first row on the very first load. On later refreshes, keep the user's
        // choice: a null (collapsed) selection stays collapsed, and a removed selection falls back to
        // null instead of reopening the first row.
        return isInitialSkillsLoad ? (response.skills[0]?.id ?? null) : null;
      });
    } finally {
      setSkillsLoading(false);
    }
  }, [skills.length]);

  const loadMemories = useCallback(async () => {
    if (hasLoadedMemoriesRef.current && memories.length > 0) return;
    const seq = ++memoriesLoadSeqRef.current;
    setMemoriesLoading(true);
    try {
      const response = await api.get<MariInstructionsResponse>("/professor-mari/workspace/instructions");
      // Ignore a stale response that resolved after a newer load (mount load vs post-write refresh),
      // so an older list can't overwrite the newer one or reset the selection.
      if (seq !== memoriesLoadSeqRef.current) return;
      setMemories(response.instructions);
      hasLoadedMemoriesRef.current = true;
      // Memories open collapsed; only a row the user opened stays open across refreshes.
      setSelectedMemoryId((current) =>
        current && response.instructions.some((memory) => memory.id === current) ? current : null,
      );
    } finally {
      if (seq === memoriesLoadSeqRef.current) setMemoriesLoading(false);
    }
  }, [memories.length]);

  const ensureProfessorMariChat = useCallback(
    async (connectionId: string | null) => {
      const params = new URLSearchParams();
      if (connectionId) params.set("connectionId", connectionId);
      const query = params.toString();
      const chat = await api.get<Chat>(`/chats/internal/professor-mari${query ? `?${query}` : ""}`);
      setActiveChatId(chat.id);
      // The ensure/restart/activate writes in this file are deliberately
      // unguarded (#5641): each loads or switches to a Mari chat whose id is
      // unknown before the request, with no concurrent local metadata edits
      // to protect.
      qc.setQueryData(chatKeys.detail(chat.id), chat);
      return chat;
    },
    [qc, setActiveChatId],
  );

  /** A fresh thread about `context` ("+", or an arrival with no thread for its screen yet). The open one is kept. */
  const startMariThread = useCallback(
    async (context: MariThreadContext | null) => {
      const params = new URLSearchParams();
      // The ref, not the render's effectiveConnectionId: the first-load arrival starts a thread right
      // after restoring her connection, before a re-render, and the stale fallback (the default
      // connection, often a chat's small one) would move her thread onto it.
      const latest = latestConnectionSelectionRef.current;
      const connectionId =
        latest && connectionOptions.some((connection) => connection.id === latest) ? latest : effectiveConnectionId;
      if (connectionId) params.set("connectionId", connectionId);
      if (context) params.set("contextKey", context.key);
      if (context?.label) params.set("contextLabel", context.label);
      const chat = await api.post<Chat>(`/chats/internal/professor-mari/restart?${params.toString()}`);
      setActiveChatId(chat.id);
      qc.setQueryData(chatKeys.detail(chat.id), chat);
      return chat;
    },
    [connectionOptions, effectiveConnectionId, qc, setActiveChatId],
  );

  // R7: route an arrival to its context's thread before that thread's messages load, so the old one never flashes.
  const arrivalThreadRef = useRef(arrivalThread);
  arrivalThreadRef.current = arrivalThread;
  const arrivalAppendRequestRef = useRef(arrivalAppendRequest);
  arrivalAppendRequestRef.current = arrivalAppendRequest;
  const handledArrivalRouteRef = useRef(0);
  const [routedArrivalRequest, setRoutedArrivalRequest] = useState(0);
  /** The thread an arrival offered "Continue here / New about ..." in, while that choice is open. */
  const [arrivalChoiceChatId, setArrivalChoiceChatId] = useState<string | null>(null);
  const routeArrivalThread = useCallback(
    async (currentId: string): Promise<string> => {
      const request = arrivalAppendRequestRef.current;
      const context = arrivalThreadRef.current;
      if (!context || request <= handledArrivalRouteRef.current) return currentId;
      handledArrivalRouteRef.current = request;
      try {
        const threads = await api.get<ProfessorMariChatSummary[]>("/chats/internal/professor-mari/chats");
        const choice = chooseMariThread({
          threads: threads.map(readMariThread),
          contextKey: context.key,
          continuedThereId: continuedThereByContext.get(context.key),
        });
        if (choice.kind === "new") return (await startMariThread(context)).id;
        const targetId = choice.kind === "continue" ? choice.chatId : choice.recentChatId;
        setArrivalChoiceChatId(choice.kind === "ask" ? targetId : null);
        if (targetId !== currentId) {
          const chat = await api.post<Chat>(`/chats/internal/professor-mari/chats/${targetId}/activate`);
          setActiveChatId(chat.id);
          qc.setQueryData(chatKeys.detail(chat.id), chat);
        }
        return targetId;
      } catch (error) {
        // The open thread is still a fine place to land.
        console.error("[Professor Mari] Failed to pick the thread for this screen", error);
        return currentId;
      } finally {
        setRoutedArrivalRequest(request);
      }
    },
    [qc, setActiveChatId, startMariThread],
  );

  // #5073: attaching chat history needs a Mari workspace chat to attach TO; create one if the user
  // hasn't sent a message yet, then open the picker (the picker itself is gated on a live chatId).
  const handleOpenHistoryPicker = useCallback(async () => {
    if (!activeChatIdRef.current) {
      try {
        await ensureProfessorMariChat(effectiveConnectionId);
      } catch {
        toast.error(localizeUi("ui.chat.homeprofessormarichat.attachChatHistoryNeedsChat"));
        return;
      }
    }
    setHistoryPickerOpen(true);
  }, [ensureProfessorMariChat, effectiveConnectionId, localizeUi]);

  // The Context Viewer is gated on a live chatId too (attachModals), so ensure one before opening —
  // otherwise the menu item would be a silent no-op when the user hasn't sent a message yet.
  const handleOpenContextViewer = useCallback(async () => {
    if (!activeChatIdRef.current) {
      try {
        await ensureProfessorMariChat(effectiveConnectionId);
      } catch {
        toast.error(localizeUi("ui.chat.homeprofessormarichat.attachChatHistoryNeedsChat"));
        return;
      }
    }
    setContextViewerOpen(true);
  }, [ensureProfessorMariChat, effectiveConnectionId, localizeUi]);

  const refreshWorkspaceStatus = useCallback(
    async (shouldApply?: () => boolean) => {
      // #5725: the server resolves the EFFECTIVE mode (chat override ?? global
      // default) for the chat we name here - so a response is only valid for
      // the chat that was active when the request STARTED.
      const chatIdAtStart = activeChatIdRef.current;
      const params = new URLSearchParams();
      if (effectiveConnectionId) params.set("connectionId", effectiveConnectionId);
      if (chatIdAtStart) params.set("chatId", chatIdAtStart);
      const query = params.toString();
      const writeSeqAtStart = permissionsModeWriteSeqRef.current;
      const status = await api.get<MariWorkspaceStatus>(`/professor-mari/workspace/status${query ? `?${query}` : ""}`);
      if (shouldApply?.() === false || activeChatIdRef.current !== chatIdAtStart) return status;
      // A mode write that landed while this poll was in flight is newer than
      // the polled value - keep the current mode fields, apply the rest.
      setWorkspaceStatus((current) =>
        current &&
        (permissionsModeWriteSeqRef.current !== writeSeqAtStart ||
          (permissionsModeWritePendingCountRef.current > 0 &&
            permissionsModeWritePendingChatRef.current === chatIdAtStart))
          ? {
              ...status,
              permissionsMode: current.permissionsMode,
              permissionsModeDefault: current.permissionsModeDefault,
              permissionsModeSource: current.permissionsModeSource,
            }
          : status,
      );
      return status;
    },
    [effectiveConnectionId],
  );

  const refreshApprovalSurfaces = useCallback(async () => {
    await refreshWorkspaceStatus().catch(() => undefined);
    // Refresh the Memories panel after a keep or restore: a kept memory has to show
    // up, and reverting a memory insert deletes the row, so the panel would keep
    // rendering a stale client-side entry.
    await loadMemories().catch(() => undefined);
  }, [loadMemories, refreshWorkspaceStatus]);

  // #5725: the status payload is CHAT-SCOPED (effective mode for the active
  // chat), so a chat switch must refetch it immediately - the 15s interval
  // alone leaves the shield showing the PREVIOUS chat's mode in exactly the
  // window where the user reads it and decides to send. The guard drops the
  // response if the user switched again while it was in flight.
  useEffect(() => {
    if (!chatId) return;
    const id = chatId;
    void refreshWorkspaceStatus(() => activeChatIdRef.current === id).catch(() => undefined);
  }, [chatId, refreshWorkspaceStatus]);

  const invalidateWorkspaceData = useCallback(async () => {
    // Invalidation marks every query stale either way; the default 'active'
    // refetch pulls only what is mounted now, and everything else refreshes on
    // its next mount. refetchType:'all' here made every cached chat re-drain
    // its full message page history on each Mari workspace change (#4703).
    await qc.invalidateQueries();
  }, [qc]);

  const invalidateActionResult = useCallback(
    async (result: MariWorkspaceActionResult) => {
      if (result.resource.kind === "character") {
        await Promise.all([
          qc.invalidateQueries({ queryKey: characterKeys.all }),
          qc.invalidateQueries({ queryKey: characterKeys.detail(result.resource.id) }),
        ]);
      } else if (result.resource.kind === "persona") {
        await Promise.all([
          qc.invalidateQueries({ queryKey: characterKeys.personas }),
          qc.invalidateQueries({ queryKey: characterKeys.personaDetail(result.resource.id) }),
        ]);
      } else if (result.resource.kind === "lorebook") {
        await qc.invalidateQueries({ queryKey: lorebookKeys.all });
      } else {
        await qc.invalidateQueries({ queryKey: presetKeys.all });
      }
    },
    [qc],
  );

  useEffect(() => {
    void fetchSidecarStatus();
  }, [fetchSidecarStatus]);

  useEffect(() => {
    const workspaceHistory = workspaceStatus?.history ?? [];
    const visibleHistoryIds = new Set(workspaceHistory.map((entry) => entry.id));
    for (const id of handledWorkspaceRefreshIdsRef.current) {
      if (!visibleHistoryIds.has(id)) handledWorkspaceRefreshIdsRef.current.delete(id);
    }

    const appliedChanges = workspaceHistory.filter((entry) => {
      if (entry.status !== "approved") return false;
      return !handledWorkspaceRefreshIdsRef.current.has(entry.id);
    });
    if (appliedChanges.length === 0) return;
    for (const entry of appliedChanges) {
      handledWorkspaceRefreshIdsRef.current.add(entry.id);
    }
    void invalidateWorkspaceData().catch((error) => {
      console.error("[Professor Mari] Failed to refresh app data after workspace change", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariAppliedAWorkspaceChangeButAppData"), {
        description: describeProfessorMariError(error),
        duration: 12_000,
      });
    });
  }, [invalidateWorkspaceData, workspaceStatus?.history, localizeUi]);

  useEffect(() => {
    latestConnectionSelectionRef.current = selectedConnectionId;
  }, [selectedConnectionId]);

  useEffect(() => {
    if (hasLoadedRef.current || connectionsLoading) return;
    hasLoadedRef.current = true;
    setLoadingHistory(true);
    const storedConnectionExists =
      !!selectedConnectionId && connectionOptions.some((connection) => connection.id === selectedConnectionId);
    ensureProfessorMariChat(storedConnectionExists ? selectedConnectionId : null)
      .then(async (chat) => {
        const restoredConnectionId =
          typeof chat.connectionId === "string" && chat.connectionId ? chat.connectionId : null;
        if (restoredConnectionId) {
          setSelectedConnectionId(restoredConnectionId);
          latestConnectionSelectionRef.current = restoredConnectionId;
          rememberConnectionId(restoredConnectionId);
        }
        const targetId = await routeArrivalThread(chat.id);
        return loadMessages(targetId, { restoreFocus: () => !initialAskContextRef.current });
      })
      .catch((error) => {
        console.error("[Professor Mari] Failed to load home assistant", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotLoad"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
      })
      .finally(() => setLoadingHistory(false));
  }, [
    connectionOptions,
    connectionsLoading,
    ensureProfessorMariChat,
    loadMessages,
    routeArrivalThread,
    selectedConnectionId,
    localizeUi,
  ]);

  // Missing workspace tools (often just no admin secret) are a calm note in the transcript, not a toast
  // that covers her header every time she opens. Status, skills and memories all report here once.
  const [workspaceToolsIssue, setWorkspaceToolsIssue] = useState<string | null>(null);
  const reportWorkspaceToolsIssue = useCallback(
    (error: unknown, fallback?: string) =>
      setWorkspaceToolsIssue(
        (current) =>
          current ??
          (error instanceof ApiError && (error.status === 401 || error.status === 403)
            ? localizeUi("ui.chat.homeprofessormarichat.professorMariWorkspaceToolsNeedAdminAccess")
            : (fallback ?? describeProfessorMariError(error))),
      ),
    [localizeUi],
  );
  useEffect(() => {
    if (!pageActive) return;
    void refreshWorkspaceStatus().catch((error) => {
      setWorkspaceStatus((current) => current && { ...current, error: "Workspace status unavailable" });
      reportWorkspaceToolsIssue(
        error,
        localizeUi("ui.chat.homeprofessormarichat.workspaceImportsAndChangesMayNotShowLiveProgress"),
      );
    });
    const refreshVisibleWorkspaceStatus = () => {
      if (document.hidden) return;
      void refreshWorkspaceStatus().catch(() => undefined);
    };
    const timer = window.setInterval(refreshVisibleWorkspaceStatus, 15_000);
    document.addEventListener("visibilitychange", refreshVisibleWorkspaceStatus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisibleWorkspaceStatus);
    };
  }, [pageActive, refreshWorkspaceStatus, localizeUi, reportWorkspaceToolsIssue]);

  // Recovery for runs this client is no longer attached to (#5719): if the
  // status poll watches a server-side run finish while no local send closure
  // is driving it — the stream died, or Mini-Mari was closed and reopened —
  // reload the persisted reply so it does not sit invisible until a manual
  // chat switch. Arming requires TWO status writes observing the run active
  // with no local closure (a single observation is routinely the STALE
  // active:true a local run's finally leaves behind for one render before
  // refreshAfterWorkspaceRun's own refresh lands — firing on that duplicated
  // the reload and the app-wide invalidation for every long local run), and
  // both the fire and the reload's shouldApply are pinned to the armed run id
  // so a new local send cancels the recovery instead of racing it. Deps use
  // the status OBJECT deliberately: each poll writes a fresh object, and the
  // observation count must advance on same-value active readings.
  const detachedRunArmingRef = useRef<{ observations: number; runId: number } | null>(null);
  useEffect(() => {
    const remoteActive = workspaceStatus?.active === true;
    if (remoteActive && !workspaceActive) {
      const runId = workspaceRunIdRef.current;
      const current = detachedRunArmingRef.current;
      detachedRunArmingRef.current =
        current && current.runId === runId
          ? { observations: current.observations + 1, runId }
          : { observations: 1, runId };
      return;
    }
    const armed = detachedRunArmingRef.current;
    detachedRunArmingRef.current = null;
    if (
      !remoteActive &&
      !workspaceActive &&
      armed &&
      armed.observations >= 2 &&
      armed.runId === workspaceRunIdRef.current
    ) {
      const chatIdToReload = activeChatIdRef.current;
      const armedRunId = armed.runId;
      if (chatIdToReload) {
        void loadMessages(chatIdToReload, {
          shouldApply: () => activeChatIdRef.current === chatIdToReload && workspaceRunIdRef.current === armedRunId,
        }).catch((error) => {
          console.error("[Professor Mari] Failed to reload messages after a detached workspace run", error);
        });
        void invalidateWorkspaceData();
      }
    }
  }, [workspaceStatus, workspaceActive, loadMessages, invalidateWorkspaceData]);

  useEffect(() => {
    void loadSkills().catch((error) => {
      console.error("[Professor Mari] Failed to load skills", error);
      setSkillsDiagnostics(["Professor Mari skills unavailable"]);
      reportWorkspaceToolsIssue(error);
    });
  }, [loadSkills, reportWorkspaceToolsIssue]);

  useEffect(() => {
    if (!chatHistoryOpen) return;
    void loadChatHistory().catch((error) => {
      console.error("[Professor Mari] Failed to load chats", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotLoadHerPreviousChats"), {
        description: describeProfessorMariError(error),
        duration: 12_000,
      });
    });
  }, [chatHistoryOpen, loadChatHistory, localizeUi]);

  useEffect(() => {
    if (chatHistoryOpen) return;
    setChatHistorySelectionMode(false);
    setSelectedChatHistoryIds(new Set());
  }, [chatHistoryOpen]);

  useEffect(() => {
    const id = selectedSkill?.id ?? null;
    // Only reload the draft when the SELECTED skill changes, not when the same skill's row ref
    // changes because the enabled toggle refetched it, which would silently clobber unsaved
    // name/description/content edits (the toggle sits on the row, above the open editor).
    if (id === lastSyncedSkillIdRef.current) return;
    lastSyncedSkillIdRef.current = id;
    if (!selectedSkill) {
      setSkillDraft({ name: "", description: "", content: "" });
      return;
    }
    setSkillDraft({
      name: selectedSkill.name,
      description: selectedSkill.description,
      content: selectedSkill.content,
    });
  }, [selectedSkill]);

  useEffect(() => {
    void loadMemories().catch((error) => {
      console.error("[Professor Mari] Failed to load memories", error);
      reportWorkspaceToolsIssue(error);
    });
  }, [loadMemories, reportWorkspaceToolsIssue]);

  useEffect(() => {
    const id = selectedMemory?.id ?? null;
    // Only reload the draft when the SELECTED memory changes, not when the same memory's row
    // ref changes because a flag toggle (enable/Persistent) refetched it, which would silently
    // clobber unsaved name/description/content edits, since the Persistent toggle sits in the pane.
    if (id === lastSyncedMemoryIdRef.current) return;
    lastSyncedMemoryIdRef.current = id;
    if (!selectedMemory) {
      setMemoryDraft({ name: "", description: "", content: "" });
      return;
    }
    setMemoryDraft({
      name: selectedMemory.name,
      description: selectedMemory.description,
      content: selectedMemory.content,
    });
  }, [selectedMemory]);

  const pendingChangeReviews = useMemo(
    () => workspaceStatus?.pendingApprovals ?? [],
    [workspaceStatus?.pendingApprovals],
  );

  // Alert the user when Professor Mari finished her work and is now blocked
  // waiting on an approval. The notification helpers no-op while the app is
  // focused, so a present user just sees the in-app review card. Reviews are
  // re-fetched from the workspace service on re-entry, so the card is already waiting too.
  useEffect(() => {
    const fresh = pendingChangeReviews.filter((approval) => !notifiedApprovalIdsRef.current.has(approval.id));
    const liveIds = new Set(pendingChangeReviews.map((approval) => approval.id));
    for (const id of notifiedApprovalIdsRef.current) if (!liveIds.has(id)) notifiedApprovalIdsRef.current.delete(id);
    if (fresh.length === 0) return;
    for (const approval of fresh) notifiedApprovalIdsRef.current.add(approval.id);
    const uiState = useUIStore.getState();
    const notification = {
      characterName: "Professor Mari",
      title: "Professor Mari needs your approval",
      tag: "marinara-mari-approval",
    };
    void showLocalMessageNotification({ ...notification, enabled: uiState.generationBrowserNotifications });
    showNativeMessageNotification({ ...notification, enabled: uiState.generationMobileNotifications });
  }, [pendingChangeReviews]);

  const workspaceTimelineActive = workspaceActive || hasActiveGeneration;
  // When a run ends, the composer halo flashes once and lets go instead of vanishing mid-turn. Set while
  // rendering (not in an effect), so the arrival routing below never sees the end of a run without it.
  const [composerHaloEnding, setComposerHaloEnding] = useState(false);
  const [haloSeenActive, setHaloSeenActive] = useState(workspaceTimelineActive);
  if (haloSeenActive !== workspaceTimelineActive) {
    setHaloSeenActive(workspaceTimelineActive);
    setComposerHaloEnding(!workspaceTimelineActive);
  }
  useEffect(() => {
    if (!composerHaloEnding) return;
    // Long enough for the faint green glow to sink out of view (mari-glow-settle) and her success story
    // to finish on the "Worked for" line before she rests.
    const timer = window.setTimeout(() => setComposerHaloEnding(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [composerHaloEnding]);
  const emptyStateReady =
    omnibarMode && messages.length === 0 && !isBusy && chatId !== null && loadedMessagesChatId === chatId;
  // D1: an arrival door (⌘J, the pull, the drag, Home's "Ask Professor Mari") opened into a chat that
  // already has history. Append the same arrival content (`buildMariArrival`'s output, unchanged) at
  // the bottom of the transcript instead of only showing it on an empty chat, so the door's "ask Mari
  // about this" promise still holds on a return visit. Local UI only: never persisted, no model call.
  const appendedArrivalReady = shouldAppendMariArrival({
    omnibarMode,
    messageCount: messages.length,
    chatId,
    loadedMessagesChatId,
  });
  const [appendedArrival, setAppendedArrival] = useState<MariArrival | null>(null);
  const handledArrivalAppendRequestRef = useRef(0);
  // R7: an arrival after the first load (the pane was already open) routes here.
  useEffect(() => {
    if (!arrivalThread || arrivalAppendRequest <= handledArrivalRouteRef.current) return;
    // R13: an arrival during a run waits until the finished run (its done marks, "Worked for") has been on
    // screen for the halo's settle time; rerouting the moment isBusy cleared wiped it unseen.
    if (loadingHistory || isBusy || composerHaloEnding || !chatId || loadedMessagesChatId !== chatId) return;
    void routeArrivalThread(chatId).then((targetId) => {
      if (targetId === chatId) return;
      setWorkspaceTimeline([]);
      setWorkspaceRunClock(null);
      return loadMessages(targetId);
    });
  }, [
    arrivalAppendRequest,
    arrivalThread,
    chatId,
    composerHaloEnding,
    isBusy,
    loadMessages,
    loadedMessagesChatId,
    loadingHistory,
    routeArrivalThread,
  ]);
  useEffect(() => {
    if (arrivalAppendRequest <= handledArrivalAppendRequestRef.current) return;
    // R7: wait for the arrival's thread, so it is not appended to the one being left.
    if (arrivalThread && routedArrivalRequest < arrivalAppendRequest) return;
    if (!appendedArrivalReady || !arrival) return;
    handledArrivalAppendRequestRef.current = arrivalAppendRequest;
    setAppendedArrival(arrival);
  }, [arrivalAppendRequest, appendedArrivalReady, arrival, arrivalThread, routedArrivalRequest]);
  // R7: "New about <context>" from the arrival's choice: a fresh thread for this screen, the open one kept.
  const handleNewAboutContext = useCallback(async () => {
    const context = arrivalThreadRef.current;
    if (!context || isBusy) return;
    try {
      const chat = await startMariThread(context);
      setArrivalChoiceChatId(null);
      setAppendedArrival(null);
      setMessages([]);
      setLoadedMessagesChatId(chat.id);
      setWorkspaceTimeline([]);
      setWorkspaceRunClock(null);
      if (chatHistoryOpen) await loadChatHistory();
    } catch (error) {
      console.error("[Professor Mari] Failed to start a thread for this screen", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotOpenThatChat"), {
        description: describeProfessorMariError(error),
      });
    }
  }, [chatHistoryOpen, isBusy, loadChatHistory, localizeUi, startMariThread]);
  const appendedArrivalNodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (appendedArrival) appendedArrivalNodeRef.current?.scrollIntoView({ block: "nearest" });
  }, [appendedArrival]);
  // M4/M3: the timeline stays mounted (and keeps the transcript's height) through the reload that
  // applies the reply, and keeps showing workspaceTimeline (now with active=false) as the turn's
  // permanent record afterward - it is only cleared when the next send or chat switch starts a new run.
  const workspaceTimelineVisible = workspaceTimelineActive || workspaceTimeline.length > 0;
  const visiblePendingChangeReviews = useMemo(
    () => (!sending && !workspaceTimelineActive ? pendingChangeReviews : []),
    [pendingChangeReviews, sending, workspaceTimelineActive],
  );
  const visiblePendingChangeReviewKey = visiblePendingChangeReviews.map((approval) => approval.id).join("|");
  const latestMessage = messages[messages.length - 1];
  const lastUserMessage = messages.findLast((message) => message.role === "user");
  // R14: the one unresolved failure - this session's, or the one saved on the newest turn (after a reload,
  // or when the stream died before it could say so). She stays red until Retry, another model, a new
  // message or Dismiss; there is no timer.
  const savedRunError = latestMessage ? getMessageRunError(latestMessage) : null;
  const activeRunError = isBusy
    ? null
    : recovery
      ? { kind: recovery.kind, detail: recovery.detail }
      : savedRunError
        ? { kind: classifyProfessorMariFailure(new Error(savedRunError.message)), detail: savedRunError.message }
        : null;
  const latestActionResults = useMemo(
    () => (latestMessage ? getMessageWorkspaceActionResults(latestMessage) : []),
    [latestMessage],
  );
  const mariPresentationState = resolveProfessorMariPresentationState({
    hasRecovery: Boolean(activeRunError),
    hasWorkspaceError: Boolean(workspaceStatus?.error),
    pendingReviewCount: countBlockingReviews(visiblePendingChangeReviews),
    working: workspaceTimelineActive,
    hasDraft: Boolean(draft.trim()),
    attachmentCount: attachments.length,
    hasActionResult: latestActionResults.length > 0,
    messageCount: messages.length,
  });
  // Outcomes come from runtime state, never from words in the assistant's reply.
  const latestTraceFailed = latestMessage
    ? (getMessageWorkspaceTrace(latestMessage) ?? []).some(
        (item) => item.type === "tool" && item.tool.status === "error",
      )
    : false;
  // A reply with a stored run shows Mari on its own timeline line; one without needs her line below it.
  const latestTurnHasTrace = Boolean(latestMessage && getMessageWorkspaceTrace(latestMessage));
  const restingStory = resolveMariRestStory({
    working: workspaceTimelineActive,
    failed: Boolean(activeRunError || workspaceStatus?.error) || latestTraceFailed,
    cancelled: Boolean(chatId && cancelledChatId === chatId),
    needsApproval: visiblePendingChangeReviews.length > 0 || Boolean(pendingDeferredMutations),
    hasAppliedChanges: latestActionResults.length > 0,
  });
  // I4: on the newest finished turn Mari stands on the "Worked for" line: her story (success just after
  // the run, then idle), or the retry / stopped / approval story while that is her state.
  const latestTurnRestStory: MariStoryState | null = workspaceTimelineActive
    ? null
    : restingStory && restingStory !== "success"
      ? restingStory
      : composerHaloEnding
        ? "success"
        : "idle";
  // The glow behind the composer takes her state's color: cyan while she thinks, pink while she writes,
  // her full logo while a tool runs, gold when she waits for you, red when something broke.
  const lastWorkItemType = workspaceTimeline.at(-1)?.type;
  const composerGlowTone =
    mariPresentationState !== "working"
      ? mariPresentationState
      : lastWorkItemType === "text"
        ? "writing"
        : lastWorkItemType === "tool"
          ? "working"
          : "thinking";
  const composerWorkingState = workspaceTimelineActive
    ? "true"
    : composerHaloEnding && composerGlowTone !== "broken"
      ? "ending"
      : undefined;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const decision = transcriptScrollAction({
      event: "grow",
      nearBottom: isProfessorMariTranscriptNearBottom(node),
      following: transcriptFollowOutputRef.current,
    });
    if (decision.scrollTo === "bottom") scrollProfessorMariTranscriptToBottom(node);
  }, [messages, workspaceTimeline, visiblePendingChangeReviewKey, workspaceStatus?.error, activeRunError?.detail]);

  // Scrolled up to read: a small round arrow above the composer brings you back to the newest line.
  // Same-value state updates bail out, so this re-renders only when the pill appears or leaves.
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const transcriptGlideCleanupRef = useRef<(() => void) | null>(null);
  const setTranscriptStackNode = useCallback((node: HTMLDivElement | null) => {
    transcriptGlideCleanupRef.current?.();
    transcriptGlideCleanupRef.current = node?.parentElement
      ? followTranscriptGrowth(
          node.parentElement,
          node,
          () => transcriptFollowOutputRef.current,
          (newerBelow) => {
            if (newerBelow) setShowJumpToLatest(true);
          },
        )
      : null;
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (suppressNextScrollEventRef.current) {
      suppressNextScrollEventRef.current = false;
      return;
    }
    const decision = transcriptScrollAction({
      event: "user-scroll",
      nearBottom: isProfessorMariTranscriptNearBottom(node),
      following: transcriptFollowOutputRef.current,
    });
    transcriptFollowOutputRef.current = decision.following;
    setShowJumpToLatest(!transcriptFollowOutputRef.current);
  }, []);
  const jumpToLatest = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    transcriptFollowOutputRef.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    setShowJumpToLatest(false);
  }, [reduceMotion]);

  // M4: the instant the local user message commits, put its top under the header once and reserve the
  // turn's height so her reply grows into empty space - following starts false, the opposite of "stay
  // pinned to the bottom", until the reader scrolls there themselves.
  useLayoutEffect(() => {
    if (!turnStartMessageId) return;
    const node = scrollRef.current;
    const turn = activeTurnRef.current;
    if (!node || !turn) return;
    const dockHeight = composerDockRef.current?.offsetHeight ?? 0;
    turn.style.minHeight = `${Math.max(0, node.clientHeight - dockHeight)}px`;
    const decision = transcriptScrollAction({
      event: "send",
      nearBottom: isProfessorMariTranscriptNearBottom(node),
      following: transcriptFollowOutputRef.current,
    });
    transcriptFollowOutputRef.current = decision.following;
    setShowJumpToLatest(false);
    if (decision.scrollTo === "top") {
      // Instant, not smooth: a multi-frame animation would fire more than the one "scroll" event the
      // suppress guard below swallows. The guard self-clears next frame too, in case the target position
      // equals the current one and the browser never fires a "scroll" event to consume it.
      suppressNextScrollEventRef.current = true;
      node.scrollTo({ top: turn.offsetTop - 16, behavior: "auto" });
      window.requestAnimationFrame(() => {
        suppressNextScrollEventRef.current = false;
      });
    }
  }, [turnStartMessageId]);

  // Opening a different chat is not a send: drop the reservation and land on its history as before.
  useLayoutEffect(() => {
    setTurnStartMessageId(null);
    activeTurnRef.current?.style.removeProperty("min-height");
  }, [chatId]);

  const displayMessages = messages;
  const lastUserMessageId = messages.findLast((message) => message.role === "user")?.id;
  // M4: everything from the newest user message onward is "the active turn" - it reserves height and
  // never re-mounts mid-run (unlike the rest of the history, which renders plainly above it).
  const activeTurnStartIndex = lastUserMessageId
    ? displayMessages.findIndex((message) => message.id === lastUserMessageId)
    : displayMessages.length;
  const transcriptHeadMessages = displayMessages.slice(0, activeTurnStartIndex);
  const activeTurnMessages = displayMessages.slice(activeTurnStartIndex);
  const showConnectionFirstHint = shouldShowProfessorMariConnectionHint({
    chatId,
    loadedMessagesChatId,
    sending,
    effectiveConnectionId,
  });

  useEffect(() => {
    if (!mobileFocusMode) return;
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const previousOverflow = document.body.style.overflow;
    const syncScrollLock = () => {
      if (!mediaQuery.matches) {
        setMobileFocusMode(false);
        document.body.style.overflow = previousOverflow;
        return;
      }
      document.body.style.overflow = "hidden";
    };
    syncScrollLock();
    mediaQuery.addEventListener("change", syncScrollLock);
    return () => {
      mediaQuery.removeEventListener("change", syncScrollLock);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFocusMode]);

  useEffect(() => {
    if (!connectionMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (connectionButtonRef.current?.contains(target) || connectionMenuRef.current?.contains(target)) return;
      setConnectionMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [connectionMenuOpen]);

  useEffect(() => {
    if (!permissionsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (permissionsButtonRef.current?.contains(target) || permissionsMenuRef.current?.contains(target)) return;
      setPermissionsMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [permissionsMenuOpen]);

  // The composer's mode and connection menus sit inside the omnibar dialog:
  // Escape closes the menu first, and only a second Escape reaches the dialog.
  const onPermissionsMenuKeyDown = useInDialogFocusScope(
    permissionsMenuRef,
    () => setPermissionsMenuOpen(false),
    permissionsMenuOpen,
  );
  const onConnectionMenuKeyDown = useInDialogFocusScope(
    connectionMenuRef,
    () => setConnectionMenuOpen(false),
    connectionMenuOpen,
  );
  // M6: a Chats row's Rename/Delete live in its own ⋮ menu.
  const onChatRowMenuKeyDown = useInDialogFocusScope(
    chatRowPopoverRef,
    () => setChatRowMenuId(null),
    chatRowMenuId !== null,
  );
  const onHeaderMenuKeyDown = useInDialogFocusScope(headerMenuRef, () => setHeaderMenuOpen(false), headerMenuOpen);
  useEffect(() => {
    if (!headerMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !headerMenuRef.current?.parentElement?.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [headerMenuOpen]);
  useEffect(() => {
    if (!chatRowMenuId) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !chatRowMenuRef.current?.contains(event.target)) setChatRowMenuId(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [chatRowMenuId]);

  // #5725: the server-authoritative Permissions Mode. Display rides the status
  // payload; writes go through the dedicated validated PUT. The change applies
  // to Mari's NEXT run - an in-flight turn is never aborted by a mode switch.
  const permissionsMode: MariPermissionsMode = workspaceStatus?.permissionsMode ?? DEFAULT_MARI_PERMISSIONS_MODE;
  const permissionsModeDefault: MariPermissionsMode =
    workspaceStatus?.permissionsModeDefault ?? DEFAULT_MARI_PERMISSIONS_MODE;
  const permissionsModeOverridden = workspaceStatus?.permissionsModeSource === "chat";
  // #5725 per-chat: the header picker writes THIS chat's override; null clears
  // it back to the global default (which Settings -> Application sets).
  const changePermissionsMode = useCallback(
    async (mode: MariPermissionsMode | null) => {
      setPermissionsMenuOpen(false);
      const chatIdForMode = activeChatIdRef.current;
      if (!chatIdForMode) return;
      const writeSeq = ++permissionsModeWriteSeqRef.current;
      // No same-value short-circuits: the check state can be stale for up to
      // one poll after a chat switch, and silently dropping the user's click
      // (especially a "Use default" de-escalation) is worse than sending an
      // idempotent write that converges via the refetch below.
      setWorkspaceStatus((current) =>
        current
          ? {
              ...current,
              permissionsMode: mode ?? current.permissionsModeDefault,
              permissionsModeSource: mode === null ? "default" : "chat",
            }
          : current,
      );
      permissionsModeWritePendingChatRef.current = chatIdForMode;
      permissionsModeWritePendingCountRef.current += 1;
      // Chained on the SHARED coordinator, not concurrent: rapid A-then-B
      // selections must persist in click order, and the chain also covers the
      // Settings panel's global-default writes.
      const write = enqueueMariPermissionsModeWrite(async () => {
        try {
          await api.put("/professor-mari/workspace/permissions-mode", { mode, chatId: chatIdForMode });
          // A status poll that was in flight during the PUT resolves with the
          // OLD mode and would clobber the optimistic patch - refetch so the
          // panel converges on the server value. Guarded: a chat switch or a
          // newer mode write while the refetch is in flight drops it.
          void refreshWorkspaceStatus(
            () => activeChatIdRef.current === chatIdForMode && permissionsModeWriteSeqRef.current === writeSeq,
          ).catch(() => undefined);
        } catch (error) {
          // Only the LATEST write may surface - a stale failure must not
          // clobber a newer selection that already succeeded. Refetch the
          // authoritative state rather than restoring a rendered snapshot
          // (which can itself be an optimistic value or another chat's).
          if (permissionsModeWriteSeqRef.current !== writeSeq) return;
          console.error("[Professor Mari] Failed to change permissions mode", error);
          toast.error(localizeUi("ui.chat.homeprofessormarichat.couldNotChangeThePermissionsMode"));
          void refreshWorkspaceStatus(
            () => activeChatIdRef.current === chatIdForMode && permissionsModeWriteSeqRef.current === writeSeq,
          ).catch(() => undefined);
        } finally {
          permissionsModeWritePendingCountRef.current -= 1;
          if (permissionsModeWritePendingCountRef.current <= 0) {
            permissionsModeWritePendingCountRef.current = 0;
            permissionsModeWritePendingChatRef.current = null;
          }
        }
      });
      await write;
    },
    [localizeUi, refreshWorkspaceStatus],
  );

  const persistLatestConnectionSelection = useCallback(() => {
    if (connectionPersistInFlightRef.current) return;
    connectionPersistInFlightRef.current = true;

    void (async () => {
      try {
        while (pendingConnectionPersistRef.current) {
          const id = pendingConnectionPersistRef.current;
          pendingConnectionPersistRef.current = null;
          try {
            await ensureProfessorMariChat(id);
          } catch (error) {
            if (!pendingConnectionPersistRef.current && latestConnectionSelectionRef.current === id) {
              console.error("[Professor Mari] Failed to save selected connection", error);
              toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRememberThatConnection"), {
                description: describeProfessorMariError(error),
                duration: 12_000,
              });
            }
          }
        }
      } finally {
        connectionPersistInFlightRef.current = false;
      }
    })();
  }, [ensureProfessorMariChat, localizeUi]);

  const handleConnectionChange = (id: string) => {
    setSelectedConnectionId(id);
    latestConnectionSelectionRef.current = id;
    pendingConnectionPersistRef.current = id;
    rememberConnectionId(id);
    setConnectionMenuOpen(false);
    persistLatestConnectionSelection();
  };

  const closeChatWindow = useCallback(() => {
    setConnectionMenuOpen(false);
    setWorkspaceDestination("chat");
    setMobileFocusMode(false);
    setChatWindowOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [setChatWindowOpen]);

  useDialogFocusScope(chatWindowOpen && mobileFocusMode && !embeddedTab, mobileDialogRef, floatingTextareaRef);

  const openChatWindow = useCallback(() => {
    setWorkspaceDestination("chat");
    setConnectionMenuOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (window.matchMedia("(max-width: 639px)").matches) {
      setMobileFocusMode(true);
      return;
    }
    setChatWindowOpen(true);
  }, [setChatWindowOpen]);

  const toggleSkillsMenu = useCallback(() => {
    const next = !skillsMenuOpen;
    if (next) {
      setConnectionMenuOpen(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    setWorkspaceDestination(next ? "skills" : "chat");
  }, [skillsMenuOpen]);

  const toggleMemoriesMenu = useCallback(() => {
    const next = !memoriesMenuOpen;
    if (next) {
      setConnectionMenuOpen(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    setWorkspaceDestination(next ? "memories" : "chat");
  }, [memoriesMenuOpen]);

  const toggleChatHistory = useCallback(() => {
    if (!chatHistoryOpen && isBusy) {
      toast.info(localizeUi("ui.chat.homeprofessormarichat.waitForProfessorMariToFinishBeforeSwitchingChats"));
      return;
    }
    const next = !chatHistoryOpen;
    if (next) {
      setConnectionMenuOpen(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    setWorkspaceDestination(next ? "chats" : "chat");
  }, [chatHistoryOpen, isBusy, localizeUi]);

  useEffect(() => {
    window.addEventListener("marinara:home-professor-mari-close", closeChatWindow);
    return () => window.removeEventListener("marinara:home-professor-mari-close", closeChatWindow);
  }, [closeChatWindow]);

  // The omnibar can hand us a past conversation to open. The effect lives after
  // handleSelectProfessorChat so it can call it directly.
  const requestedChatIdRef = useRef<string | null>(null);

  // R7: "+" always starts fresh, about the screen she was opened from.
  const handleRestart = useCallback(async () => {
    const chat = await startMariThread(arrivalThreadRef.current ?? null);
    await api.post("/professor-mari/workspace/reset", { clearHistory: true });
    setMessages([]);
    setLoadedMessagesChatId(chat.id);
    setDraft("");
    clearMariChips();
    setWorkspaceActive(false);
    useChatStore.getState().clearStreamBuffer(chat.id);
    useChatStore.getState().clearThinkingBuffer(chat.id);
    useChatStore.getState().setAbortController(chat.id, null);
    useChatStore.getState().setMariPhase(chat.id, "idle");
    setWorkspaceTimeline([]);
    setWorkspaceRunClock(null);
    if (chatHistoryOpen) await loadChatHistory();
    await qc.invalidateQueries({ queryKey: chatKeys.messages(chat.id) });
    toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariSPreviousChatWasSaved"));
  }, [chatHistoryOpen, clearMariChips, loadChatHistory, qc, setDraft, startMariThread, localizeUi]);

  const guidedPlan = professorMariSuggestionsEnabled && mariPlanChatId === chatId ? mariPlan : null;
  const guidedPlanStep = guidedPlan ? (guidedPlan[mariPlanCursor] ?? null) : null;
  const chipRowChips = guidedPlanStep ? guidedPlanStep.chips : visibleSuggestionChips;
  // #5820: the Accept action for held edits is NOT a suggestion. Captioning
  // the row "Suggestions only" told users the one control that applies Mari's
  // pending changes was optional flavour text, so they concluded she had
  // silently done nothing - the visible half of the defer-and-approve
  // mechanism read as a failure of it.
  const chipRowAwaitsApproval = chipRowChips.some(isMariHeldChangeApprovalChip);
  const suggestionQuestion = guidedPlanStep
    ? guidedPlanStep.question
    : chipRowAwaitsApproval
      ? localizeUi("ui.chat.homeprofessormarichat.awaitingApprovalHint")
      : chipRowChips.length > 0
        ? messages.length === 0
          ? localizeUi("ui.chat.homeprofessormarichat.suggestions.start")
          : latestActionResults.length > 0
            ? localizeUi("ui.chat.homeprofessormarichat.suggestions.afterChange")
            : localizeUi("ui.chat.homeprofessormarichat.suggestions.next")
        : null;
  // Held changes stay answerable while the user types; ordinary suggestions step aside.
  const suggestionsSuppressed =
    !chipRowAwaitsApproval && !["empty", "history", "completed"].includes(mariPresentationState);
  const showSuggestionPrompt = !suggestionsSuppressed && Boolean(suggestionQuestion) && chipRowChips.length > 0;
  // M5b: plain next steps are cards under the turn; a plan step or a held change keeps its answer chips by the composer.
  const showNextStepCards = showSuggestionPrompt && messages.length > 0 && !guidedPlanStep && !chipRowAwaitsApproval;

  const runRestart = useCallback(async () => {
    if (isBusy) return;
    setSending(true);
    try {
      await handleRestart();
      clearMariPlan();
    } catch (error) {
      console.error("[Professor Mari] Failed to restart", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRestartHerNotes"));
    } finally {
      setSending(false);
    }
  }, [clearMariPlan, handleRestart, isBusy, localizeUi]);

  // Keep and restore live in a shared hook so the omnibar's approval rows do the
  // same thing, with the same toasts, as this pane.
  const {
    keepApproval: keepWorkspaceChange,
    restoreApproval: restoreWorkspaceChange,
    pendingId: sharedApprovalPendingId,
  } = useMariApprovals({ onRefresh: refreshApprovalSurfaces });
  // Single-row reject still runs from this component, so the busy state is the
  // union of both in-flight ids.
  const approvalBusyId = sharedApprovalPendingId ?? workspaceReviewActionId;

  // #4931: reject a single reviewed row (revert just that lorebook entry). Mirrors
  // restoreWorkspaceChange but posts the row's diffPreview index + identity tuple; the server reverts
  // only that row and either shrinks the pending card or resolves it.
  const rejectWorkspaceRows = useCallback(
    async (id: string, rows: Array<{ index: number; table: string; id: string; action: string }>): Promise<boolean> => {
      if (approvalBusyId) return false;
      setWorkspaceReviewActionId(id);
      try {
        const result = await api.post<{
          ok?: boolean;
          outcome?: string;
          error?: string | null;
          rejected?: number;
          remaining?: number;
          completed?: boolean;
        }>(`/professor-mari/workspace/approvals/${id}/reject-rows`, { rows });
        await refreshWorkspaceStatus().catch(() => undefined);
        // A rejected entry is deleted, so refresh any panel that mirrors app data.
        await loadMemories().catch(() => undefined);
        if (result.ok) {
          await invalidateWorkspaceData();
          toast.success(localizeUi("ui.chat.homeprofessormarichat.revertedTheSelectedEntry"));
          return true;
        }
        if (result.outcome === "state_changed") {
          toast.error(
            localizeUi("ui.chat.homeprofessormarichat.theWorkspaceChangedAfterProfessorMariStagedThisProposal"),
            { description: result.error ?? undefined, duration: 12_000 },
          );
        } else {
          toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRejectThatEntry"), {
            description: result.error ?? undefined,
            duration: 12_000,
          });
        }
        return false;
      } catch (error) {
        console.error("[Professor Mari] Failed to reject workspace rows", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRejectThatEntry"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
        return false;
      } finally {
        setWorkspaceReviewActionId((current) => (current === id ? null : current));
      }
    },
    [approvalBusyId, invalidateWorkspaceData, loadMemories, refreshWorkspaceStatus, localizeUi],
  );

  // #4931: fetch the synthetic Peek-Prompt render of one reviewed character/preset row. Read-only,
  // so it needs no review-action lock and can run while other reviews are in flight.
  const renderWorkspacePrompt = useCallback(
    async (id: string, row: { index: number; table: string; id: string; action: string }) => {
      try {
        const result = await api.post<{
          ok?: boolean;
          before?: MariPromptRenderSide;
          after?: MariPromptRenderSide;
        }>(`/professor-mari/workspace/approvals/${id}/render-prompt`, row);
        if (!result.ok) return null;
        return { before: result.before ?? null, after: result.after ?? null };
      } catch (error) {
        console.error("[Professor Mari] Failed to render workspace prompt", error);
        return null;
      }
    },
    [],
  );

  const stopWorkspace = useCallback(async () => {
    setCancelledChatId(chatId);
    workspaceAbortRef.current?.abort();
    clearMariChips();
    clearMariPlan();
    try {
      await api.post("/professor-mari/workspace/abort");
    } catch (error) {
      setCancelledChatId(null);
      console.error("[Professor Mari] Failed to stop workspace task", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotStopTheWorkspaceTask"), {
        description: describeProfessorMariError(error),
        duration: 12_000,
      });
    }
  }, [chatId, clearMariChips, clearMariPlan, localizeUi]);

  const createSkillFromContent = useCallback(
    async (input: { content: string; fileName?: string; name?: string; description?: string }) => {
      setSkillsSaving(true);
      try {
        const result = await api.post<WorkspaceSkillMutationResponse>("/professor-mari/workspace/skills", {
          ...input,
          enabled: true,
        });
        await loadSkills();
        setSelectedSkillId(result.skill.id);
        setWorkspaceDestination("skills");
        await refreshWorkspaceStatus().catch(() => undefined);
        toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariSkillAdded"));
      } finally {
        setSkillsSaving(false);
      }
    },
    [loadSkills, refreshWorkspaceStatus, localizeUi],
  );

  const handleNewSkill = useCallback(() => {
    void createSkillFromContent({
      name: "custom-skill",
      description: "User-defined Professor Mari skill.",
      content: NEW_SKILL_CONTENT,
    }).catch((error) => {
      console.error("[Professor Mari] Failed to create skill", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotAddThatSkill"));
    });
  }, [createSkillFromContent, localizeUi]);

  const handleSkillUploadClick = useCallback(() => {
    skillFileInputRef.current?.click();
  }, []);

  const handleSkillFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) return;
      void file
        .text()
        .then((content) => createSkillFromContent({ content, fileName: file.name }))
        .catch((error) => {
          console.error("[Professor Mari] Failed to upload skill", error);
          toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotUploadThatSkill"));
        });
    },
    [createSkillFromContent, localizeUi],
  );

  const handleSaveSkill = useCallback(async () => {
    if (!selectedSkill) return;
    setSkillsSaving(true);
    try {
      const result = await api.put<WorkspaceSkillMutationResponse>(
        `/professor-mari/workspace/skills/${selectedSkill.id}`,
        {
          name: skillDraft.name,
          description: skillDraft.description,
          content: skillDraft.content,
        },
      );
      await loadSkills();
      setSelectedSkillId(result.skill.id);
      await refreshWorkspaceStatus().catch(() => undefined);
      toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariSkillSaved"));
    } catch (error) {
      console.error("[Professor Mari] Failed to save skill", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotSaveThatSkill"));
    } finally {
      setSkillsSaving(false);
    }
  }, [loadSkills, refreshWorkspaceStatus, selectedSkill, skillDraft, localizeUi]);

  const handleToggleSkill = useCallback(
    async (skill: MariWorkspaceSkillDetail) => {
      setSkillsSaving(true);
      try {
        await api.put<WorkspaceSkillMutationResponse>(`/professor-mari/workspace/skills/${skill.id}`, {
          enabled: !skill.enabled,
        });
        await loadSkills();
        await refreshWorkspaceStatus().catch(() => undefined);
      } catch (error) {
        console.error("[Professor Mari] Failed to toggle skill", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotUpdateThatSkill"));
      } finally {
        setSkillsSaving(false);
      }
    },
    [loadSkills, refreshWorkspaceStatus, localizeUi],
  );

  const handleDeleteSkill = useCallback(
    async (id: string) => {
      const skill = skills.find((entry) => entry.id === id);
      if (!skill) return;
      if (!window.confirm(localizeUi("ui.chat.homeprofessormarichat.deleteValue1", { value1: skill.name }))) return;
      setSkillsSaving(true);
      try {
        await api.delete(`/professor-mari/workspace/skills/${id}`);
        setSelectedSkillId((current) => (current === id ? null : current));
        await loadSkills();
        await refreshWorkspaceStatus().catch(() => undefined);
        toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariSkillDeleted"));
      } catch (error) {
        console.error("[Professor Mari] Failed to delete skill", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotDeleteThatSkill"));
      } finally {
        setSkillsSaving(false);
      }
    },
    [loadSkills, refreshWorkspaceStatus, skills, localizeUi],
  );

  // #4851: Memories panel handlers. Direct writes to /instructions (reset-free); new
  // memories default disabled (the user enables them from the row switch).
  const createMemory = useCallback(
    async (input: { content: string; name?: string; description?: string }) => {
      setMemoriesSaving(true);
      try {
        const result = await api.post<MariInstructionMutationResponse>("/professor-mari/workspace/instructions", {
          name: input.name?.trim() || "New memory",
          description: input.description ?? "",
          content: input.content,
        });
        await loadMemories();
        setSelectedMemoryId(result.instruction.id);
        setWorkspaceDestination("memories");
        toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariMemoryAdded"));
      } finally {
        setMemoriesSaving(false);
      }
    },
    [loadMemories, localizeUi],
  );

  const handleNewMemory = useCallback(() => {
    void createMemory({
      name: "New memory",
      content: "Describe a preference or instruction for Professor Mari.",
    }).catch((error) => {
      console.error("[Professor Mari] Failed to create memory", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotAddThatMemory"));
    });
  }, [createMemory, localizeUi]);

  const handleMemoryUploadClick = useCallback(() => {
    memoryFileInputRef.current?.click();
  }, []);

  const handleMemoryFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) return;
      // A memory's content is capped server-side at 20k CHARS. UTF-8 chars are up to 4 bytes, so use a
      // generous byte ceiling just to avoid reading a huge file, then validate the exact character
      // length after reading (so a valid multibyte memory, e.g. emoji, is not wrongly rejected).
      const MEMORY_CONTENT_CHAR_CAP = 20_000;
      if (file.size > 4 * MEMORY_CONTENT_CHAR_CAP) {
        toast.error(localizeUi("ui.chat.homeprofessormarichat.thatMemoryFileIsTooLarge"));
        return;
      }
      const baseName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      void file
        .text()
        .then((content) => {
          if (content.trim().length > MEMORY_CONTENT_CHAR_CAP) {
            toast.error(localizeUi("ui.chat.homeprofessormarichat.thatMemoryFileIsTooLarge"));
            return undefined;
          }
          return createMemory({ content, name: baseName || undefined });
        })
        .catch((error) => {
          console.error("[Professor Mari] Failed to upload memory", error);
          toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotUploadThatMemory"));
        });
    },
    [createMemory, localizeUi],
  );

  const handleSaveMemory = useCallback(async () => {
    if (!selectedMemory) return;
    setMemoriesSaving(true);
    try {
      const result = await api.put<MariInstructionMutationResponse>(
        `/professor-mari/workspace/instructions/${selectedMemory.id}`,
        { name: memoryDraft.name, description: memoryDraft.description, content: memoryDraft.content },
      );
      await loadMemories();
      setSelectedMemoryId(result.instruction.id);
      toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariMemorySaved"));
    } catch (error) {
      console.error("[Professor Mari] Failed to save memory", error);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotSaveThatMemory"));
    } finally {
      setMemoriesSaving(false);
    }
  }, [loadMemories, selectedMemory, memoryDraft, localizeUi]);

  const patchMemoryFlag = useCallback(
    async (memory: MariInstructionDetail, patch: { enabled?: boolean; persistent?: boolean }) => {
      setMemoriesSaving(true);
      try {
        await api.put<MariInstructionMutationResponse>(`/professor-mari/workspace/instructions/${memory.id}`, patch);
        await loadMemories();
      } catch (error) {
        console.error("[Professor Mari] Failed to update memory", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotUpdateThatMemory"));
      } finally {
        setMemoriesSaving(false);
      }
    },
    [loadMemories, localizeUi],
  );

  const handleToggleMemoryEnabled = useCallback(
    (memory: MariInstructionDetail) => void patchMemoryFlag(memory, { enabled: !memory.enabled }),
    [patchMemoryFlag],
  );

  const handleToggleMemoryPersistent = useCallback(
    (memory: MariInstructionDetail) => void patchMemoryFlag(memory, { persistent: !memory.persistent }),
    [patchMemoryFlag],
  );

  const handleDeleteMemory = useCallback(
    async (id: string) => {
      const memory = memories.find((entry) => entry.id === id);
      if (!memory) return;
      if (!window.confirm(localizeUi("ui.chat.homeprofessormarichat.deleteValue1", { value1: memory.name }))) return;
      setMemoriesSaving(true);
      try {
        await api.delete(`/professor-mari/workspace/instructions/${id}`);
        setSelectedMemoryId((current) => (current === id ? null : current));
        await loadMemories();
        toast.success(localizeUi("ui.chat.homeprofessormarichat.professorMariMemoryDeleted"));
      } catch (error) {
        console.error("[Professor Mari] Failed to delete memory", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotDeleteThatMemory"));
      } finally {
        setMemoriesSaving(false);
      }
    },
    [loadMemories, memories, localizeUi],
  );

  const handleSelectProfessorChat = useCallback(
    async (id: string) => {
      if (isBusy) {
        toast.info(localizeUi("ui.chat.homeprofessormarichat.waitForProfessorMariToFinishBeforeSwitchingChats"));
        return false;
      }
      try {
        const chat = await api.post<Chat>(`/chats/internal/professor-mari/chats/${id}/activate`);
        setActiveChatId(chat.id);
        qc.setQueryData(chatKeys.detail(chat.id), chat);
        setWorkspaceDestination("chat");
        setWorkspaceTimeline([]);
        setWorkspaceRunClock(null);
        useChatStore.getState().clearStreamBuffer(chat.id);
        useChatStore.getState().clearThinkingBuffer(chat.id);
        await loadMessages(chat.id);
        await loadChatHistory();
        return true;
      } catch (error) {
        console.error("[Professor Mari] Failed to open previous chat", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotOpenThatChat"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
        return false;
      }
    },
    [isBusy, loadChatHistory, loadMessages, qc, setActiveChatId, localizeUi],
  );

  useEffect(() => {
    if (isBusy || !openChatId || openChatId === chatId || requestedChatIdRef.current === openChatId) return;
    requestedChatIdRef.current = openChatId;
    void handleSelectProfessorChat(openChatId).then((selected) => {
      if (!selected && requestedChatIdRef.current === openChatId) requestedChatIdRef.current = null;
    });
  }, [chatId, handleSelectProfessorChat, isBusy, openChatId]);

  const handleRenameProfessorChat = useCallback(
    async (id: string) => {
      const name = renameDraft.trim();
      if (!name) return;
      try {
        await api.patch(`/chats/internal/professor-mari/chats/${id}`, { name });
        setRenamingChatId(null);
        setRenameDraft("");
        await Promise.all([
          loadChatHistory(),
          qc.invalidateQueries({ queryKey: chatKeys.detail(id) }),
          qc.invalidateQueries({ queryKey: chatKeys.list() }),
          qc.invalidateQueries({ queryKey: homeFeedKeys.all }),
        ]);
      } catch (error) {
        console.error("[Professor Mari] Failed to rename chat", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRenameThatChat"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
      }
    },
    [loadChatHistory, qc, renameDraft, localizeUi],
  );

  const handleTitleCommand = useCallback(
    async (messageText: string) => {
      const match = /^\/title(?:\s+(.*))?$/iu.exec(messageText);
      if (!match) return false;
      const name = match[1]?.trim() ?? "";
      if (!name) {
        toast.info(localizeUi("ui.chat.homeprofessormarichat.titleCommandUsage"));
        return true;
      }
      if (!chatId) {
        toast.error(localizeUi("ui.chat.homeprofessormarichat.titleCommandNoActiveChat"));
        return true;
      }
      try {
        await api.patch(`/chats/internal/professor-mari/chats/${chatId}`, { name });
        setDraft("");
        await Promise.all([
          loadChatHistory(),
          qc.invalidateQueries({ queryKey: chatKeys.detail(chatId) }),
          qc.invalidateQueries({ queryKey: chatKeys.list() }),
          qc.invalidateQueries({ queryKey: homeFeedKeys.all }),
        ]);
        toast.success(localizeUi("ui.chat.homeprofessormarichat.titleCommandRenamed", { name }));
      } catch (error) {
        console.error("[Professor Mari] Failed to rename chat with /title", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRenameThatChat"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
      }
      return true;
    },
    [chatId, loadChatHistory, qc, setDraft, localizeUi],
  );

  const handleDeleteProfessorChat = useCallback(
    async (id: string) => {
      const item = chatHistory.find((chat) => chat.id === id);
      if (!item) return;
      const confirmed = await showConfirmDialog({
        title: localizeUi("ui.chat.homeprofessormarichat.deleteValue1", {
          value1: item.name || localizeUi("ui.chat.homeprofessormarichat.thisProfessorMariChat"),
        }),
        message: localizeUi("ui.chat.homeprofessormarichat.deleteSelectedChatsConfirmation", { count: 1 }),
        confirmLabel: localizeUi("lorebook.editor.batch.delete"),
        tone: "destructive",
      });
      if (!confirmed) return;
      try {
        await api.delete(`/chats/internal/professor-mari/chats/${id}`);
        if (id === chatId) {
          const chat = await ensureProfessorMariChat(effectiveConnectionId);
          setActiveChatId(chat.id);
          await loadMessages(chat.id);
        }
        await loadChatHistory();
      } catch (error) {
        console.error("[Professor Mari] Failed to delete chat", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotDeleteThatChat"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
      }
    },
    [
      chatHistory,
      chatId,
      effectiveConnectionId,
      ensureProfessorMariChat,
      loadChatHistory,
      loadMessages,
      setActiveChatId,
      localizeUi,
    ],
  );

  const toggleProfessorChatSelection = useCallback((id: string) => {
    setSelectedChatHistoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDeleteProfessorChats = useCallback(async () => {
    if (selectedChatHistoryIds.size === 0) return;
    const confirmed = await showConfirmDialog({
      title: localizeUi("ui.chat.homeprofessormarichat.deleteSelectedChats"),
      message: localizeUi("ui.chat.homeprofessormarichat.deleteSelectedChatsConfirmation", {
        count: selectedChatHistoryIds.size,
      }),
      confirmLabel: localizeUi("lorebook.editor.batch.delete"),
      tone: "destructive",
    });
    if (!confirmed) return;

    const selectedIds = [...selectedChatHistoryIds];
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => api.delete(`/chats/internal/professor-mari/chats/${id}`)),
      );
      const deletedIds = new Set(selectedIds.filter((_, index) => results[index]?.status === "fulfilled"));
      const failedDeletion = results.find((result) => result.status === "rejected");
      setChatHistorySelectionMode(false);
      setSelectedChatHistoryIds(new Set());
      if (chatId && deletedIds.has(chatId)) {
        const chat = await ensureProfessorMariChat(effectiveConnectionId);
        setActiveChatId(chat.id);
        await loadMessages(chat.id);
      }
      await loadChatHistory();
      if (failedDeletion?.status === "rejected") throw failedDeletion.reason;
    } catch (error) {
      console.error("[Professor Mari] Failed to delete selected chats", error);
      await loadChatHistory().catch(() => undefined);
      toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotDeleteSelectedChats"), {
        description: describeProfessorMariError(error),
        duration: 12_000,
      });
    }
  }, [
    chatId,
    effectiveConnectionId,
    ensureProfessorMariChat,
    loadChatHistory,
    loadMessages,
    setActiveChatId,
    localizeUi,
    selectedChatHistoryIds,
  ]);

  const handleAttachmentUpload = useCallback(
    async (files: FileList | null) => {
      const acceptedFiles = Array.from(files ?? []).filter((file) => {
        if (file.size > PROFESSOR_MARI_ATTACHMENT_MAX_BYTES) {
          toast.error(localizeUi("ui.chat.homeprofessormarichat.value1IsTooLargeMax20Mb", { value1: file.name }));
          return false;
        }
        if (!isSupportedProfessorMariAttachment(file)) {
          toast.error(
            localizeUi("ui.chat.homeprofessormarichat.value1IsNotSupportedHereAttachImagesPdfsOr", {
              value1: file.name || localizeUi("ui.chat.chatinput.thatFile"),
            }),
          );
          return false;
        }
        return true;
      });
      if (acceptedFiles.length === 0) return;

      setIsReadingAttachments(true);
      const prepared: ProfessorMariAttachment[] = [];
      try {
        for (const file of acceptedFiles) {
          const displayName = file.name || "attached-file";
          if (file.type.startsWith("image/")) {
            prepared.push(await prepareImageAttachment(file, displayName));
            continue;
          }
          prepared.push({
            type: inferProfessorMariAttachmentType(file),
            data: await readProfessorMariFileAsDataUrl(file),
            name: displayName,
          });
        }
      } catch (error) {
        console.error("[Professor Mari] Failed to prepare attachment", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotAttachThatFile"), {
          description:
            error instanceof Error ? error.message : localizeUi("ui.chat.homeprofessormarichat.theFileCouldNotBeRead"),
          duration: PROFESSOR_MARI_ERROR_TOAST_DURATION_MS,
        });
      } finally {
        if (prepared.length > 0) {
          setAttachments((current) => [...current, ...prepared]);
        }
        const resizedCount = prepared.filter((attachment) => attachment.resized).length;
        if (resizedCount > 0) {
          toast.info(
            localizeUi("ui.chat.homeprofessormarichat.value1ImageValue2ResizedForProfessorMariSVision", {
              value1: resizedCount,
              value2: resizedCount === 1 ? "" : localizeUi("ui.noodle.stageprofileview.s"),
            }),
          );
        }
        setIsReadingAttachments(false);
      }
    },
    [localizeUi],
  );

  // R14: every way a run can fail (an HTTP error from the provider, a timeout, no answer, a dropped
  // stream, a failed regenerate or edited resend) ends here, so each one turns her red with the same
  // card, Retry and "Retry with another model". Your own Stop is not a failure.
  const failRun = useCallback(
    (error: unknown, retry: Pick<ProfessorMariRecovery, "text" | "attachments" | "context" | "localMessageId">) => {
      if (isProfessorMariAbortError(error)) return;
      console.error("[Professor Mari] Run failed", error);
      setRecovery({ ...retry, kind: classifyProfessorMariFailure(error), detail: describeProfessorMariError(error) });
      // F15: the server already saved this failure on the message; without a reload the local copy
      // still lacks mariRunError, so an OLDER failure in the same session loses its quiet line until
      // the next full reload.
      if (chatId) void loadMessages(chatId, { restoreFocus: false });
    },
    [chatId, loadMessages, setRecovery],
  );
  const retryOf = (message: Message | undefined) => ({
    text: message?.content ?? "",
    attachments: message ? getProfessorMariAttachments(message) : [],
    context: (message && getProfessorMariMessageContext(message)) ?? null,
  });

  const sendWorkspaceMessage = useCallback(
    async (
      chat: Pick<Chat, "id">,
      text: string,
      attachments: ProfessorMariAttachment[] = [],
      existingUserMessageId?: string,
      context: ProfessorMariAskContext | null = handoffContext,
    ) => {
      // A mode change immediately before send must not race its PUTs: the run
      // resolves the mode server-side, so the WHOLE shared write chain - the
      // per-chat picker AND Settings' global default - lands first.
      await awaitMariPermissionsModeWrites();
      setCancelledChatId(null);
      const runId = ++workspaceRunIdRef.current;
      const controller = new AbortController();
      workspaceAbortRef.current = controller;
      workspaceTextThrottle.cancel();
      pendingWorkspaceTextRef.current = "";
      setWorkspaceActive(true);
      // R14 (item 7): the run's clock starts here, once, so steps, rounds and re-renders never restart it.
      setWorkspaceRunClock({ startedAt: Date.now(), endedAt: null });
      // The shared status query only refreshes on its own poll or on the
      // end-of-run invalidation below - closing the omnibar within that
      // window left the top-bar line with no "active" signal to start from.
      qc.setQueryData(professorMariWorkspaceStatusKeys.all, (data: MariWorkspaceStatus | undefined) =>
        data ? { ...data, active: true } : data,
      );
      setWorkspaceTimeline([]);
      setMariChips(chat.id, []);
      useChatStore.getState().setAbortController(chat.id, controller);
      useChatStore.getState().clearStreamBuffer(chat.id);
      useChatStore.getState().clearThinkingBuffer(chat.id);
      useChatStore.getState().setMariPhase(chat.id, "thinking");
      let received = false;
      let sawDone = false;
      // Mirror use-generate's backgrounding bookkeeping: Android browsers tear
      // down a hidden tab's connection with a plain TypeError, and the shared
      // classifier needs to know the page was hidden to call that passive.
      let pageWasHiddenDuringStream = typeof document !== "undefined" && document.visibilityState !== "visible";
      const markPageHidden = () => {
        pageWasHiddenDuringStream = true;
      };
      const recordBackgroundedStream = () => {
        if (document.visibilityState !== "visible") markPageHidden();
      };
      const canTrackVisibility = typeof document !== "undefined" && typeof window !== "undefined";
      if (canTrackVisibility) {
        document.addEventListener("visibilitychange", recordBackgroundedStream);
        window.addEventListener("pagehide", markPageHidden);
      }
      try {
        for await (const event of api.streamEvents(
          "/professor-mari/workspace/prompt",
          {
            chatId: chat.id,
            message: text,
            connectionId: effectiveConnectionId,
            debugMode: useUIStore.getState().debugMode,
            attachments,
            context: context ?? undefined,
            existingUserMessageId,
          },
          controller.signal,
          // Backgrounding leaves the socket half-open; detach on resume. The
          // server keeps the run going and persists it, so we reload the result
          // (and pending approvals) on return instead of hanging.
          { disconnectOnResume: true },
        )) {
          if (event.type === "token" && typeof event.data === "string") {
            received = true;
            pendingWorkspaceTextRef.current += event.data;
            workspaceTextThrottle.call(undefined);
            useChatStore.getState().appendStreamBuffer(event.data, chat.id);
            continue;
          }
          workspaceTextThrottle.flush();
          if (event.type === "thinking" && typeof event.data === "string") {
            setWorkspaceTimeline((current) => appendThinkingTimeline(current, event.data as string));
            useChatStore.getState().appendThinkingBuffer(event.data, chat.id);
          } else if (event.type === "status") {
            const data = asRecord(event.data);
            const content =
              typeof event.data === "string"
                ? event.data
                : typeof data?.content === "string"
                  ? data.content
                  : "Working...";
            setWorkspaceTimeline((current) => appendStatusTimeline(current, content));
          } else if (event.type === "tool_start") {
            const data = asRecord(event.data);
            const name = typeof data?.name === "string" ? data.name : "tool";
            const toolCall: WorkspaceToolCall = {
              id: getToolCallId(data, name),
              name,
              status: "running",
              input: data?.input,
              detail: previewValue(data?.input),
              output: null,
              startedAt: Date.now(),
              updatedAt: Date.now(),
            };
            setWorkspaceTimeline((current) => upsertToolTimeline(current, toolCall));
            useChatStore.getState().setMariPhase(chat.id, "updating");
          } else if (event.type === "tool_update") {
            const data = asRecord(event.data);
            const name = typeof data?.name === "string" ? data.name : "tool";
            const toolCall: WorkspaceToolCall = {
              id: getToolCallId(data, name),
              name,
              status: "running",
              detail: null,
              output: outputValue(data?.output),
              startedAt: Date.now(),
              updatedAt: Date.now(),
            };
            setWorkspaceTimeline((current) => upsertToolTimeline(current, toolCall));
          } else if (event.type === "tool_end") {
            const data = asRecord(event.data);
            const name = typeof data?.name === "string" ? data.name : "tool";
            const isError = data?.isError === true;
            const toolCall: WorkspaceToolCall = {
              id: getToolCallId(data, name),
              name,
              status: isError ? "error" : "done",
              detail: null,
              output: outputValue(data?.output),
              startedAt: Date.now(),
              durationMs: typeof data?.durationMs === "number" ? data.durationMs : undefined,
              updatedAt: Date.now(),
            };
            setWorkspaceTimeline((current) => upsertToolTimeline(current, toolCall));
          } else if (event.type === "suggestions") {
            const chips = Array.isArray(event.data) ? (event.data as MariSuggestionChip[]) : [];
            if (
              useUIStore.getState().professorMariSuggestionsEnabled ||
              chips.some((chip) => chip.id === "authorization-accept")
            ) {
              setMariChips(chat.id, chips);
            }
          } else if (event.type === "plan") {
            if (useUIStore.getState().professorMariSuggestionsEnabled) {
              const steps = Array.isArray(event.data) ? (event.data as MariGuidedPlanStep[]) : [];
              if (steps.length > 0) setMariPlan(chat.id, steps);
              else clearMariPlan();
            }
          } else if (event.type === "metadata") {
            const data = asRecord(event.data);
            if (isMariWorkspaceActionResult(data?.actionResult)) {
              void invalidateActionResult(data.actionResult).catch((error) => {
                console.error("[Professor Mari] Failed to refresh action result", error);
              });
            }
          } else if (event.type === "done") {
            received = true;
            sawDone = true;
          } else if (event.type === "error") {
            // The SERVER reported this over a live stream — the run itself
            // failed. It must never be mistaken for a transport death below.
            throw new MariWorkspaceRunError(
              typeof event.data === "string" ? event.data : "Workspace generation failed",
            );
          }
        }
        if (!sawDone && !controller.signal.aborted) {
          // The stream closed CLEANLY without her "done" — mobile browsers and
          // proxies can shut a socket down without an error while the server
          // keeps running (#5719), also after her first round already spoke.
          // If the status endpoint confirms a live run, this was a passive
          // disconnect: wait it out and let the caller reload what the server
          // saved (her reply, or the failure it recorded - R14) instead of
          // ending the turn as if she had simply stopped.
          received = (await waitForWorkspaceRunToSettle(effectiveConnectionId, controller.signal)) || received;
        }
      } catch (error) {
        if (error instanceof MariWorkspaceRunError) throw error;
        if (!isPassiveStreamDisconnect(error, pageWasHiddenDuringStream, controller.signal)) throw error;
        // Detached by backgrounding (the resume watchdog, or the browser
        // killing the hidden tab's socket outright), not a failure — the run
        // continues and persists server-side. Wait for it to actually settle
        // before reporting success, so handleSubmit reloads the finished
        // reply and approvals rather than a half-written state.
        await waitForWorkspaceRunToSettle(effectiveConnectionId, controller.signal);
        received = true;
      } finally {
        if (canTrackVisibility) {
          document.removeEventListener("visibilitychange", recordBackgroundedStream);
          window.removeEventListener("pagehide", markPageHidden);
        }
        workspaceTextThrottle.flush();
        workspaceAbortRef.current = null;
        setWorkspaceActive(false);
        setWorkspaceRunClock((clock) => clock && { ...clock, endedAt: Date.now() });
        useChatStore.getState().setAbortController(chat.id, null);
        useChatStore.getState().setMariPhase(chat.id, "idle");
        // The omnibar's working rings read the status poll; refresh it now so they stop with her.
        void qc.invalidateQueries({ queryKey: professorMariWorkspaceStatusKeys.all });
      }
      // hiddenDuringStream lets callers suppress the "no reply" toast when the
      // page's visibility history makes a false negative likely (the run may
      // have finished before the settle poll could observe it active) — the
      // authoritative reload either shows the persisted reply or the user
      // retries; a red toast beside a visible reply is worse than silence.
      return { received, runId, hiddenDuringStream: pageWasHiddenDuringStream };
    },
    [
      clearMariPlan,
      effectiveConnectionId,
      handoffContext,
      invalidateActionResult,
      qc,
      setMariChips,
      setMariPlan,
      workspaceTextThrottle,
    ],
  );

  const refreshAfterWorkspaceRun = useCallback(
    async (completedChatId: string, runId: number) => {
      let messagesReloaded = false;
      try {
        if (workspaceRunIdRef.current !== runId || activeChatIdRef.current !== completedChatId) return;
        // M3: workspaceTimeline is left as the frozen record of this run - the active turn's
        // MariWorkTimeline call site keeps reading it (now with active=false) instead of swapping to a
        // second, freshly-mounted instance. The next send (or a chat switch) resets it for the next run.
        await loadMessages(completedChatId, {
          shouldApply: () => workspaceRunIdRef.current === runId && activeChatIdRef.current === completedChatId,
        });
        messagesReloaded = true;
      } catch (error) {
        console.error("[Professor Mari] Failed to reload messages after completed workspace run", error);
      }
      if (workspaceRunIdRef.current !== runId || activeChatIdRef.current !== completedChatId) return;
      if (messagesReloaded) {
        useChatStore.getState().clearStreamBuffer(completedChatId);
        useChatStore.getState().clearThinkingBuffer(completedChatId);
      }
      await Promise.allSettled([
        refreshWorkspaceStatus(
          () => workspaceRunIdRef.current === runId && activeChatIdRef.current === completedChatId,
        ),
        invalidateWorkspaceData(),
      ]);
    },
    [invalidateWorkspaceData, loadMessages, refreshWorkspaceStatus],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!chatId || isBusy) return;
      const confirmed = await showConfirmDialog({
        title: localizeUi("ui.chat.homeprofessormarichat.deleteMessage"),
        message: localizeUi("ui.chat.homeprofessormarichat.deleteMessageConfirmation"),
        confirmLabel: localizeUi("lorebook.editor.batch.delete"),
        tone: "destructive",
      });
      if (!confirmed || messageMutationBusyRef.current) return;
      messageLoadAbortRef.current?.abort();
      // Optimistic update from local state
      setMessages((current) => current.filter((m) => m.id !== messageId));
      try {
        await api.delete(`/chats/${chatId}/messages/${messageId}?trash=false`);
      } catch (error) {
        console.error("[Professor Mari] Failed to delete message", error);
        await loadMessages(chatId).catch(() => undefined);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotDeleteThatMessage"), {
          description: describeProfessorMariError(error),
        });
      }
    },
    [chatId, isBusy, loadMessages, localizeUi],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!chatId || isBusy) return;
      messageLoadAbortRef.current?.abort();
      setMessages((current) => current.map((m) => (m.id === messageId ? { ...m, content } : m)));
      try {
        await api.patch(`/chats/${chatId}/messages/${messageId}`, { content });
      } catch (error) {
        console.error("[Professor Mari] Failed to edit message", error);
        await loadMessages(chatId).catch(() => undefined);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotSaveThatEdit"), {
          description: describeProfessorMariError(error),
        });
      }
    },
    [chatId, isBusy, loadMessages, localizeUi],
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      if (isBusy || regenerationInFlightRef.current || !chatId) return;
      if (!effectiveConnectionId) {
        // Fix inside the Mari pane, not the right panel: that panel renders behind
        // the omnibar (z-100) and would silently swallow this request.
        setConnectionMenuOpen(true);
        return;
      }
      const initialMessages = messagesRef.current;
      const initialIndex = initialMessages.findIndex((message) => message.id === messageId);
      if (
        initialIndex <= 0 ||
        initialIndex !== initialMessages.length - 1 ||
        initialMessages[initialIndex]?.role !== "assistant" ||
        initialMessages[initialIndex - 1]?.role !== "user"
      )
        return;

      regenerationInFlightRef.current = true;
      setSending(true);
      try {
        const confirmed = await showConfirmDialog({
          title: localizeUi("ui.chat.homeprofessormarichat.regenerateResponse"),
          message: localizeUi("ui.chat.homeprofessormarichat.regenerateResponseConfirmation"),
          confirmLabel: localizeUi("ui.chat.chatmessage.regenerate"),
          tone: "destructive",
        });
        if (!confirmed || activeChatIdRef.current !== chatId) return;

        const currentMessages = messagesRef.current;
        const index = currentMessages.findIndex((message) => message.id === messageId);
        if (index <= 0 || index !== currentMessages.length - 1 || currentMessages[index]?.role !== "assistant") return;
        const userMessage = currentMessages[index - 1];
        if (userMessage.role !== "user") return;

        messageLoadAbortRef.current?.abort();
        setMessages((current) => current.filter((message) => message.id !== messageId));
        await api.delete(`/chats/${chatId}/messages/${messageId}?trash=false`);
        const { received, runId, hiddenDuringStream } = await sendWorkspaceMessage(
          { id: chatId },
          userMessage.content,
          getProfessorMariAttachments(userMessage),
          userMessage.id,
          getProfessorMariMessageContext(userMessage) ?? null,
        );
        if (!received && !hiddenDuringStream) throw new Error("Professor Mari did not return a regenerated response");
        void refreshAfterWorkspaceRun(chatId, runId);
      } catch (error) {
        void loadMessages(chatId).catch(() => undefined);
        failRun(error, retryOf(initialMessages[initialIndex - 1]));
      } finally {
        regenerationInFlightRef.current = false;
        setSending(false);
      }
    },
    [
      chatId,
      effectiveConnectionId,
      failRun,
      isBusy,
      loadMessages,
      localizeUi,
      refreshAfterWorkspaceRun,
      sendWorkspaceMessage,
    ],
  );

  const handleEditAndResend = useCallback(
    async (messageId: string, content: string) => {
      if (isBusy || regenerationInFlightRef.current || !chatId || !content.trim()) return;
      if (!effectiveConnectionId) {
        setConnectionMenuOpen(true);
        return;
      }
      const initialMessages = messagesRef.current;
      const index = initialMessages.findIndex((message) => message.id === messageId);
      const userMessage = initialMessages[index];
      const later = initialMessages.slice(index + 1);
      // Only your latest turn: Mari keeps no branches, so an older edit would silently drop later turns.
      if (userMessage?.role !== "user" || later.some((message) => message.role === "user")) return;

      regenerationInFlightRef.current = true;
      setSending(true);
      try {
        if (later.length > 0) {
          const confirmed = await showConfirmDialog({
            title: localizeUi("ui.chat.homeprofessormarichat.editAndResendTitle"),
            message: localizeUi("ui.chat.homeprofessormarichat.editAndResendConfirmation"),
            confirmLabel: localizeUi("ui.chat.homeprofessormarichat.saveAndSend"),
            tone: "destructive",
          });
          if (!confirmed || activeChatIdRef.current !== chatId) return;
        }
        messageLoadAbortRef.current?.abort();
        const laterIds = new Set(later.map((message) => message.id));
        setMessages((current) =>
          current
            .filter((message) => !laterIds.has(message.id))
            .map((message) => (message.id === messageId ? { ...message, content } : message)),
        );
        await api.patch(`/chats/${chatId}/messages/${messageId}`, { content });
        for (const message of later) await api.delete(`/chats/${chatId}/messages/${message.id}`);
        const { received, runId, hiddenDuringStream } = await sendWorkspaceMessage(
          { id: chatId },
          content,
          getProfessorMariAttachments(userMessage),
          userMessage.id,
          getProfessorMariMessageContext(userMessage) ?? null,
        );
        if (!received && !hiddenDuringStream) throw new Error("Professor Mari did not answer the edited message");
        void refreshAfterWorkspaceRun(chatId, runId);
      } catch (error) {
        void loadMessages(chatId).catch(() => undefined);
        failRun(error, { ...retryOf(userMessage), text: content });
      } finally {
        regenerationInFlightRef.current = false;
        setSending(false);
      }
    },
    [
      chatId,
      effectiveConnectionId,
      failRun,
      isBusy,
      loadMessages,
      localizeUi,
      refreshAfterWorkspaceRun,
      sendWorkspaceMessage,
    ],
  );

  const handleRemoveAttachment = useCallback(
    async (messageId: string, attachmentIndex: number) => {
      if (!chatId || isBusy || attachmentRemovalInFlightRef.current.has(messageId)) return;
      attachmentRemovalInFlightRef.current.add(messageId);
      try {
        const confirmed = await showConfirmDialog({
          title: localizeUi("ui.chat.homeprofessormarichat.removeAttachment"),
          message: localizeUi("ui.chat.homeprofessormarichat.removeAttachmentConfirmation"),
          confirmLabel: localizeUi("ui.panels.agentspanel.remove"),
          tone: "destructive",
        });
        if (!confirmed || messageMutationBusyRef.current) return;
        const message = messagesRef.current.find((item) => item.id === messageId);
        if (!message) return;
        const currentAttachments = getProfessorMariAttachments(message);
        const updated = currentAttachments.filter((_, index) => index !== attachmentIndex);
        if (updated.length === currentAttachments.length) return;
        messageLoadAbortRef.current?.abort();
        setMessages((current) =>
          current.map((item) => {
            if (item.id !== messageId) return item;
            const extra = toMessageExtra(item);
            return { ...item, extra: { ...extra, attachments: updated } };
          }),
        );
        await api.patch(`/chats/${chatId}/messages/${messageId}/extra`, { attachments: updated });
      } catch (error) {
        console.error("[Professor Mari] Failed to remove attachment", error);
        await loadMessages(chatId).catch(() => undefined);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariCouldNotRemoveThatAttachment"), {
          description: describeProfessorMariError(error),
        });
      } finally {
        attachmentRemovalInFlightRef.current.delete(messageId);
      }
    },
    [chatId, isBusy, loadMessages, localizeUi],
  );

  const handleSubmit = async (
    overrideText?: string,
    overrideRecovery?: Pick<ProfessorMariRecovery, "attachments" | "context" | "localMessageId"> & {
      /** A retry: reuse your message when the server already saved it, instead of sending it twice. */
      reuseSavedMessage?: boolean;
    },
    overrideContext?: ProfessorMariAskContext | null,
  ) => {
    const text = (overrideText ?? draft).trim();
    const submittedAttachments = overrideRecovery?.attachments ?? attachments;
    const submittedContext = overrideRecovery
      ? overrideRecovery.context
      : overrideContext !== undefined
        ? overrideContext
        : handoffContext;
    const messageText = text || (submittedAttachments.length > 0 ? "Please inspect the attached file." : "");
    if (!messageText || isBusy || regenerationInFlightRef.current || isReadingAttachments) return;

    if (messageText === "/restart") {
      await runRestart();
      return;
    }

    if (await handleTitleCommand(messageText)) return;

    if (!effectiveConnectionId) {
      setConnectionMenuOpen(true);
      return;
    }

    setSending(true);
    // R14: a new message or a retry answers the failure at once: no red while she starts again.
    setRecovery(null);
    // D1: the appended arrival is local UI only — it never lingers once the user is really sending.
    setAppendedArrival(null);
    // F1: in a brand-new thread the arrival shows as the empty-state block, so the append effect never
    // ran yet and the request stayed unhandled. Mark it handled here too, or the effect appends it again
    // under her answer once the thread has a message.
    handledArrivalAppendRequestRef.current = arrivalAppendRequestRef.current;
    let localMessageId: string | undefined;
    try {
      const chat = await ensureProfessorMariChat(effectiveConnectionId);
      // A retry or a chip sends its own text: leave whatever you have typed since in the composer.
      if (overrideText === undefined) setDraft("");
      setMariChips(chat.id, []);
      setResolvedPrompts([]);
      clearMariPlan();
      if (!overrideRecovery) setAttachments([]);
      setHandoffContext(persistentResourceContext(submittedContext));
      let existingUserMessageId: string | undefined;
      if (overrideRecovery?.reuseSavedMessage) {
        const loaded = await loadMessages(chat.id, { restoreFocus: false }).catch(() => undefined);
        // F3: when a later round failed, the newest message is her partial reply (mariRunError set), not
        // your question — look past it for the user message it answers, or Retry sends a duplicate.
        const newest = loaded?.at(-1);
        const saved =
          newest && getMessageRunError(newest, { includeDismissed: true })
            ? loaded?.findLast((message) => message.role === "user")
            : newest;
        if (saved?.role === "user" && saved.content === messageText) existingUserMessageId = saved.id;
      }
      if (existingUserMessageId) {
        setTurnStartMessageId(existingUserMessageId);
      } else {
        const localMessage = createLocalUserMessage(chat.id, messageText, submittedAttachments, submittedContext);
        localMessageId = localMessage.id;
        setMessages((current) => [
          ...current.filter((message) => message.id !== overrideRecovery?.localMessageId),
          localMessage,
        ]);
        // M4: place the question at the top once, in the same commit the message lands in.
        setTurnStartMessageId(localMessage.id);
      }
      if (messagesRef.current.length === 0 && (chat.name ?? "") === PROFESSOR_MARI_DEFAULT_CHAT_NAME) {
        const autoTitle = buildProfessorMariAutoTitle(messageText);
        if (autoTitle) {
          // Best effort: a failed rename must never block the message.
          void api
            .patch(`/chats/internal/professor-mari/chats/${chat.id}`, { name: autoTitle })
            .then(() => loadChatHistory())
            .catch((error) => console.error("[Professor Mari] Failed to auto-title chat", error));
        }
      }
      trackAchievement.mutate("prof_mari_message_sent");
      const { received, runId, hiddenDuringStream } = await sendWorkspaceMessage(
        chat,
        messageText,
        submittedAttachments,
        existingUserMessageId,
        submittedContext,
      );
      // No answer at all is a failure like any other: the same red state and card, not a toast that leaves.
      if (!received && !hiddenDuringStream)
        throw new Error(localizeUi("ui.chat.homeprofessormarichat.professorMariDidNotReceiveAReplyFromThe"));
      void refreshAfterWorkspaceRun(chat.id, runId);
    } catch (error) {
      // Like Claude: your message stays where you sent it and one error card with Retry sits under the turn.
      // No toast over her header, and the text is not pushed back into the composer as a duplicate.
      if (!isProfessorMariAbortError(error)) setHandoffContext(submittedContext);
      failRun(error, {
        text: messageText,
        attachments: submittedAttachments,
        context: submittedContext,
        localMessageId,
      });
    } finally {
      setSending(false);
    }
  };

  // Each handoff is one request id, sent once. The effect also depends on `draft`,
  // so a flag that stayed true would re-fire on every keystroke and send whatever
  // the user had typed so far; a flag that was already true would deliver no change
  // at all on the next handoff, and that query would silently never send.
  const handledSubmitRequestRef = useRef(0);
  // An effect event, so the effect runs when the request or draft changes, not on
  // every render because handleSubmit is a new function each time. The context comes
  // in as a parameter rather than read from `handoffContext` state: the effect that
  // seeds `handoffContext` from `initialAskContext` can run in the same commit as
  // this one, and a state update scheduled by that effect is not visible here yet.
  const submitHandoffDraft = useEffectEvent(
    (context: ProfessorMariAskContext | null) => void handleSubmit(undefined, undefined, context),
  );
  useEffect(() => {
    if (!omnibarMode || !submitDraftRequest || handledSubmitRequestRef.current === submitDraftRequest) return;
    // Not marked handled yet: an empty, still-busy, or still-loading-connections
    // moment must retry, not drop it — connections load asynchronously, so
    // `effectiveConnectionId` can still be null here even once `draft` is set.
    if (!draft.trim() || isBusy || connectionsLoading) return;
    handledSubmitRequestRef.current = submitDraftRequest;
    submitHandoffDraft(initialAskContext);
  }, [connectionsLoading, draft, initialAskContext, isBusy, omnibarMode, submitDraftRequest]);

  // M5b: an action card runs the same deterministic navigation as the omnibar rows, with no Mari round-trip.
  const runSuggestionAction = (action: MariSuggestionAction) => {
    if (action.kind === "start-chat") {
      useUIStore.getState().openModal("start-character-chat", {
        characterId: action.characterId,
        characterName: characterPreviewById.get(action.characterId)?.name ?? "",
      });
      useUIStore.getState().setOmnibarOpen(false);
    } else if (action.kind === "peek-prompt") {
      executeStateNavigation({ kind: "chat", chatId: action.chatId });
      // ponytail: two frames for the chat view to take the new active chat before it hears the request;
      // a chat that mounts slower misses the peek and only opens. Add a pending-request store if that shows up.
      requestAnimationFrame(() => requestAnimationFrame(() => requestChatPeekPrompt(action.chatId)));
    } else {
      executeStateNavigation(action);
    }
    if (omnibarMode) closeChatWindow();
  };

  /**
   * N4: a Mari card sends at once; `draft` (Shift, or a long press on touch) puts it in the composer
   * instead. `context` replaces the handoff for that one card (N6: an arrival Fix card's error).
   */
  const handleSuggestionSelect = (chip: MariSuggestionChip, draft = false, context?: ProfessorMariAskContext) => {
    if (chip.id === MARI_AUTHORIZATION_ACCEPT_CHIP.id || chip.id === MARI_AUTHORIZATION_DECLINE_CHIP.id) {
      void handleSubmit(chip.prompt);
      return;
    }
    if (guidedPlanStep) {
      const result = recordMariPlanAnswer(guidedPlanStep.fieldKey, chip.prompt);
      if (result === "complete") {
        const answers = useAgentStore.getState().mariPlanAnswers;
        const summary = Object.entries(answers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ");
        clearMariPlan();
        setDraft((current) =>
          current.trim() ? `${current.trimEnd()} Create it - ${summary}` : `Create it - ${summary}`,
        );
        focusComposer();
      }
      return;
    }
    if (chip.action) {
      runSuggestionAction(chip.action);
      return;
    }
    if (!draft) {
      void handleSubmit(chip.prompt, undefined, context);
      return;
    }
    if (context) setHandoffContext(context);
    setDraft((current) => (current.trim() ? `${current.trimEnd()} ${chip.prompt}` : chip.prompt));
    focusComposer();
  };

  // R14: Retry sends the failed turn's message again - from this session, or from the saved turn after a
  // reload - reusing your message when the server already saved it.
  const retryRun = () => {
    const target = recovery ?? (savedRunError ? retryOf(lastUserMessage) : null);
    if (!target?.text) return;
    setHandoffContext(target.context);
    void handleSubmit(target.text, { ...target, reuseSavedMessage: true });
  };
  const retryRunEvent = useEffectEvent(retryRun);
  // "Retry with another model" opens the composer's own connection menu; picking a different one retries.
  const [retryAfterPickFrom, setRetryAfterPickFrom] = useState<string | null>(null);
  const retryWithAnotherModel = () => {
    setRetryAfterPickFrom(effectiveConnectionId ?? "");
    setPermissionsMenuOpen(false);
    setConnectionMenuOpen(true);
  };
  useEffect(() => {
    if (retryAfterPickFrom === null) return;
    if (effectiveConnectionId && effectiveConnectionId !== retryAfterPickFrom) {
      setRetryAfterPickFrom(null);
      retryRunEvent();
    } else if (!connectionMenuOpen) setRetryAfterPickFrom(null);
  }, [connectionMenuOpen, effectiveConnectionId, retryAfterPickFrom]);
  // Dismiss answers the failure without a retry: the card folds to its quiet line and the red goes.
  const dismissRunError = async () => {
    setRecovery(null);
    const id = chatId;
    if (!id) return;
    try {
      const saved = (await loadMessages(id, { restoreFocus: false }))?.at(-1);
      const error = saved ? getMessageRunError(saved) : null;
      if (saved && error) {
        await api.patch(`/chats/${id}/messages/${saved.id}/extra`, { mariRunError: { ...error, dismissed: true } });
        await loadMessages(id, { restoreFocus: false });
      }
      // The server keeps the failure for the top-bar line until a run or a reset clears it.
      // F12: keepRun so Dismiss never aborts a run that may genuinely be in flight.
      if (workspaceStatus?.error) {
        await api.post("/professor-mari/workspace/reset", { keepRun: true });
        setWorkspaceStatus((current) => current && { ...current, error: null });
      }
    } catch (error) {
      console.error("[Professor Mari] Failed to dismiss the error", error);
    } finally {
      void qc.invalidateQueries({ queryKey: professorMariWorkspaceStatusKeys.all });
    }
  };

  const [requestedReviewId, setRequestedReviewId] = useState<string | null>(null);
  // R9: a specific target (the per-approval omnibar row) wins; otherwise fall back to the
  // first visible review, as every other door into this pane already did.
  const openPendingApprovals = useCallback(
    (reviewId?: string | null) => {
      setRequestedReviewId(reviewId ?? visiblePendingChangeReviews[0]?.id ?? null);
      setWorkspaceDestination("chat");
      void refreshWorkspaceStatus();
    },
    [refreshWorkspaceStatus, visiblePendingChangeReviews],
  );

  const handledPendingReviewRequestRef = useRef(0);
  useEffect(() => {
    if (!chatWindowOpen || pendingReviewRequest <= handledPendingReviewRequestRef.current) return;
    handledPendingReviewRequestRef.current = pendingReviewRequest;
    openPendingApprovals(pendingReviewId);
  }, [chatWindowOpen, openPendingApprovals, pendingReviewId, pendingReviewRequest]);

  const answerApproval = async (approval: MariWorkspacePendingApproval, keep: boolean) => {
    // R10: the answered row stays where it was. It is listed before the call and shows as soon as the
    // review leaves the pending list (the same render), so the row never blinks out; a failure drops it.
    const entry = { chatId, approval, outcome: keep ? ("applied" as const) : ("discarded" as const) };
    setResolvedPrompts((current) => [...current, entry]);
    const result = await (keep ? keepWorkspaceChange(approval.id) : restoreWorkspaceChange(approval.id));
    const done = keep
      ? result?.outcome === "applied" || result?.history?.status === "kept"
      : result?.outcome === "discarded" || result?.history?.status === "restored";
    if (!done) setResolvedPrompts((current) => current.filter((item) => item !== entry));
  };
  // Slice 13: a review renders inside the turn that asked for it, not after the whole transcript, and
  // an answered install / file prompt folds to its line in the same place.
  const reviewsByTurn = assignReviewsToTurns(
    displayMessages,
    [
      ...visiblePendingChangeReviews.map((approval) => ({
        requestedAt: approval.requestedAt,
        approval,
        outcome: null,
      })),
      ...(sending || workspaceTimelineActive ? [] : resolvedPrompts)
        .filter(
          (prompt) =>
            prompt.chatId === chatId && !visiblePendingChangeReviews.some(({ id }) => id === prompt.approval.id),
        )
        .map(({ approval, outcome }) => ({ requestedAt: approval.requestedAt, approval, outcome })),
    ].sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt)),
  );
  const renderTurnPrompt = ({ approval, outcome }: (typeof reviewsByTurn.unassigned)[number]) =>
    outcome ? (
      <ResolvedPromptLine key={`resolved:${approval.id}`} approval={approval} outcome={outcome} />
    ) : (
      <WorkspaceApprovalCard
        key={approval.id}
        approval={approval}
        busy={approvalBusyId === approval.id}
        disabled={approvalBusyId !== null}
        highlighted={highlightedReviewId === approval.id}
        onKeep={() => void answerApproval(approval, true)}
        onKeepEnable={(id) => void keepWorkspaceChange(id, { enable: true })}
        onRestore={() => void answerApproval(approval, false)}
        onRejectRows={(id, rows) => rejectWorkspaceRows(id, rows)}
        onRenderPrompt={renderWorkspacePrompt}
      />
    );
  // M5a: applied changes and answered prompts are "what changed"; everything still waiting is "needs your OK".
  const renderTurnReviews = (messageId: string): MariTurnReviews => {
    const entries = reviewsByTurn.byMessageId.get(messageId) ?? [];
    const changed = ({ approval, outcome }: (typeof entries)[number]) =>
      Boolean(outcome) || approval.kind === "applied_review";
    return {
      changed: entries.filter(changed).map(renderTurnPrompt),
      needsOk: entries.filter((entry) => !changed(entry)).map(renderTurnPrompt),
      records: reviewRecordKeys(entries.map(({ approval }) => approval)),
    };
  };
  // M9 / R10: she arrives knowing the screen she was opened from: her sprite and one line with its facts,
  // then ONE group - the things on that screen, then what to do. Nothing is sent until a row is picked
  // or you type (R22); the composer's chips say what would go.
  const renderArrival = (
    data: MariArrival,
    component: string,
    ref?: RefObject<HTMLDivElement | null>,
    choice?: ReactNode,
  ) => {
    const strongAt = data.strong ? data.line.indexOf(data.strong) : -1;
    return (
      <div ref={ref} className="mari-arrival" data-component={component}>
        <MariStorySprite state="idle" />
        <div className="mari-arrival__copy mari-arrival-content">
          <p className="mari-arrival__line">
            {data.strong && strongAt >= 0 ? (
              <>
                {data.line.slice(0, strongAt)}
                <b>{data.strong}</b>
                {data.line.slice(strongAt + data.strong.length)}
              </>
            ) : (
              data.line
            )}
          </p>
          {data.meta.length > 0 ? <p className="mari-arrival__meta">{data.meta.join(" · ")}</p> : null}
          {choice}
        </div>
        <MariList className="mari-arrival__group mari-arrival-content" data-cards="arrival">
          <MariReferencedResources
            bare
            resources={data.refs}
            characterPreviews={characterPreviewById}
            lorebookPreviews={lorebookPreviewById}
            onOpen={openReferencedResource}
            skipName={data.strong}
          />
          <MariNextStepCards
            bare
            chips={data.cards}
            onSelect={(card, draft) =>
              card.action?.kind === "find-setting" || card.action?.kind === "undo-setting"
                ? onArrivalAction?.(card.action)
                : handleSuggestionSelect(
                    card as MariSuggestionChip,
                    draft,
                    (card.fix && arrivalFixContext) || undefined,
                  )
            }
            disabled={isBusy}
          />
        </MariList>
      </div>
    );
  };

  // Q5: "Chats · +" is last, so the group sits at the right of the row, under settings and Close.
  const headerDestinations = [
    {
      id: "skills",
      Icon: Brain,
      label: localizeUi("ui.chat.homeprofessormarichat.skills"),
      shortLabel: undefined,
      count: activeSkillCount,
    },
    {
      id: "memories",
      Icon: BookOpen,
      label: localizeUi("ui.chat.homeprofessormarichat.memories"),
      shortLabel: undefined,
      count: activeMemoryCount,
    },
    {
      id: "context",
      Icon: Eye,
      label: localizeUi("ui.chat.homeprofessormarichat.awareOf"),
      shortLabel: localizeUi("ui.chat.homeprofessormarichat.awareOf"),
      count: persistentContextCount + oneShotContextFacets.length,
    },
    {
      id: "chats",
      Icon: MessageCircle,
      label: localizeUi("navigation.common.chats"),
      shortLabel: undefined,
      count: 0,
    },
  ] as const satisfies ReadonlyArray<{
    id: Exclude<ProfessorMariWorkspaceDestination, "chat">;
    Icon: typeof MessageCircle;
    label: string;
    shortLabel?: string;
    count: number;
  }>;

  const selectHeaderDestination = (destination: Exclude<ProfessorMariWorkspaceDestination, "chat">) => {
    setWorkspaceDestination(workspaceDestination === destination ? "chat" : destination);
  };

  const ActivePermissionsModeIcon = MARI_PERMISSIONS_MODE_ICONS[permissionsMode];
  // R11 (composer v5): one-line facts; the full description stays in the row's tooltip and in Settings.
  const renderPermissionsModeRow = ({
    key,
    Icon,
    mode,
    label,
    fact,
    description,
    selected,
    onSelect,
  }: {
    key: string;
    Icon: LucideIcon;
    mode?: MariPermissionsMode;
    label: string;
    fact: string;
    description: string;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <MariRow
      key={key}
      slot={<Icon aria-hidden="true" />}
      title={label}
      fact={fact}
      hint={description}
      trail={selected ? <Check aria-hidden="true" /> : undefined}
      state={selected ? "selected" : undefined}
      onClick={onSelect}
      aria-pressed={selected}
      data-mode={mode}
    />
  );
  const permissionsModeOptions = (
    <>
      <p className="mari-composer-menu__head">
        {localizeUi("ui.chat.homeprofessormarichat.permissionsModeForThisChat")}
      </p>
      {renderPermissionsModeRow({
        key: "default",
        Icon: RotateCcw,
        label: localizeUi("ui.chat.homeprofessormarichat.useDefaultMode", {
          value1: localize(MARI_PERMISSIONS_MODE_LABELS[permissionsModeDefault].label),
        }),
        fact: localizeUi("ui.chat.homeprofessormarichat.modeFact.default"),
        description: localizeUi("ui.chat.homeprofessormarichat.followsTheGlobalDefaultFromSettings"),
        selected: !permissionsModeOverridden,
        onSelect: () => void changePermissionsMode(null),
      })}
      <hr className="mari-composer-menu__divider" />
      {MARI_PERMISSIONS_MODES.map((mode) =>
        renderPermissionsModeRow({
          key: mode,
          Icon: MARI_PERMISSIONS_MODE_ICONS[mode],
          mode,
          label: localize(MARI_PERMISSIONS_MODE_LABELS[mode].label),
          fact: localizeUi(MARI_PERMISSIONS_MODE_FACT_KEYS[mode]),
          description: localize(MARI_PERMISSIONS_MODE_LABELS[mode].description),
          selected: permissionsModeOverridden && mode === permissionsMode,
          onSelect: () => void changePermissionsMode(mode),
        }),
      )}
    </>
  );

  const omnibarHeaderChrome =
    omnibarMode && omnibarHeaderSlot
      ? createPortal(
          <div className="mari-omnibar-header-controls" data-compact={headerCompact ? "true" : undefined}>
            <nav
              className="mari-omnibar-header-destinations"
              aria-label={localizeUi("ui.chat.homeprofessormarichat.workspaceDestinations")}
            >
              {headerDestinations.map(({ id, Icon, label, shortLabel, count }) => (
                <Fragment key={id}>
                  <button
                    type="button"
                    aria-pressed={workspaceDestination === id}
                    onClick={() => selectHeaderDestination(id)}
                    disabled={id === "chats" && isBusy}
                    data-destination={id}
                    data-active={workspaceDestination === id ? "true" : "false"}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size="0.8rem" aria-hidden="true" />
                    <span className="mari-omnibar-header-destination-label-full" aria-hidden="true">
                      {label}
                    </span>
                    <span className="mari-omnibar-header-destination-label-short" aria-hidden="true">
                      {shortLabel ?? label}
                    </span>
                    {count > 0 ? <b>{count}</b> : null}
                  </button>
                  {/* Q1: New chat sits right after Chats, one "Chats · +" group; every destination fits the
                      bar at every width, so the header has no ⋮ menu. Q5: the group closes the row. */}
                  {id === "chats" ? (
                    <button
                      type="button"
                      onClick={() => void runRestart()}
                      disabled={isBusy}
                      className="mari-omnibar-header-new-chat"
                      aria-label={localizeUi("ui.chat.homeprofessormarichat.newChat")}
                      title={t("home.professorMari.newChat")}
                    >
                      <Plus size="0.85rem" aria-hidden="true" />
                    </button>
                  ) : null}
                </Fragment>
              ))}
            </nav>
          </div>,
          omnibarHeaderSlot,
        )
      : null;
  const omnibarMenuChrome =
    omnibarMode && omnibarMenuSlot && headerCompact
      ? createPortal(
          <>
            <button
              type="button"
              // Keeps the caret (and the phone keyboard) in the composer until the menu takes focus.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => setHeaderMenuOpen((current) => !current)}
              className="mari-omnibar-header-menu__trigger"
              aria-expanded={headerMenuOpen}
              aria-label={localizeUi("ui.chat.homeprofessormarichat.headerMenu")}
              title={localizeUi("ui.chat.homeprofessormarichat.headerMenu")}
            >
              <EllipsisVertical size="1rem" aria-hidden="true" />
            </button>
            {headerMenuOpen ? (
              <div ref={headerMenuRef} className="mari-omnibar-header-menu__popover" onKeyDown={onHeaderMenuKeyDown}>
                {headerDestinations.map(({ id, Icon, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={workspaceDestination === id}
                    disabled={id === "chats" && isBusy}
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      selectHeaderDestination(id);
                    }}
                  >
                    <Icon size="0.875rem" aria-hidden="true" />
                    <span>{label}</span>
                    {count > 0 ? <b>{count}</b> : null}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    void runRestart();
                  }}
                >
                  <Plus size="0.875rem" aria-hidden="true" />
                  <span>{localizeUi("ui.chat.homeprofessormarichat.newChat")}</span>
                </button>
              </div>
            ) : null}
          </>,
          omnibarMenuSlot,
        )
      : null;
  const omnibarStatusChrome =
    omnibarMode && omnibarStatusSlot
      ? createPortal(
          <span
            className="mari-status-shimmer"
            data-active={isBusy ? "true" : undefined}
            data-state={mariPresentationState === "broken" ? "error" : undefined}
          >
            {isBusy
              ? localizeUi("ui.chat.homeprofessormarichat.workingOnIt")
              : mariPresentationState === "broken"
                ? localizeUi("ui.chat.homeprofessormarichat.statusFailed")
                : mariPresentationState === "waiting-approval" || chipRowAwaitsApproval
                  ? localizeUi("mari.presence.needsYouShort")
                  : localizeUi("ui.chat.homeprofessormarichat.readyToHelp")}
          </span>,
          omnibarStatusSlot,
        )
      : null;

  useEffect(() => {
    if (visiblePendingChangeReviewKey && visiblePendingChangeReviewKey !== lastAutoOpenedApprovalKeyRef.current) {
      lastAutoOpenedApprovalKeyRef.current = visiblePendingChangeReviewKey;
      setRequestedReviewId(visiblePendingChangeReviews[0]?.id ?? null);
      setWorkspaceDestination("chat");
    }
  }, [visiblePendingChangeReviewKey, visiblePendingChangeReviews]);

  const sandboxAvailable = workspaceStatus?.shellSandbox.available ?? null;
  const renderSeesRow = ({
    key,
    Icon,
    type,
    title,
    meta,
    onRemove,
    action,
  }: {
    key: string;
    Icon?: LucideIcon;
    /** Q6: a row that names a thing shows that kind's icon. */
    type?: ResultType;
    title: string;
    meta?: string;
    onRemove?: () => void;
    action?: ReactNode;
  }) => (
    <div key={key} className={MARI_SIDE_ROW_CLASS}>
      <ResultTypeIcon type={type} icon={Icon} glyph className="size-[0.85rem] text-[var(--muted-foreground)]" />
      <span className="mari-edit__text">
        <span className="mari-edit__title">{title}</span>
        {meta ? <span className="text-xs text-[var(--muted-foreground)]">{meta}</span> : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="mari-link"
          onClick={onRemove}
          aria-label={localizeUi("ui.chat.homeprofessormarichat.awareOfRemoveFacet", { text: title })}
        >
          {localizeUi("ui.chat.homeprofessormarichat.contextViewerRemove")}
        </button>
      ) : null}
      {action}
    </div>
  );

  // R14: the newest unresolved failure is one card at the end of the turn: what broke, Retry, Retry with
  // another model, and Dismiss. Older failures are one quiet "Failed · reason" line (runFailedLine).
  const renderRunErrorCard = (error: { kind?: ProfessorMariRecovery["kind"]; detail?: string }, retry: boolean) => (
    <div className="mari-run-error" role="alert" data-component="HomeProfessorMariChat.RunError">
      <p className="mari-run-error__text">
        <AlertTriangle size="0.8rem" aria-hidden="true" />
        <span>
          {error.kind ? (
            <span className="mari-run-error__label">
              {localizeUi(`ui.chat.homeprofessormarichat.recovery.${error.kind}`)}
            </span>
          ) : null}
          {error.detail ? <span className="mari-note__detail"> {error.detail}</span> : null}
        </span>
      </p>
      <div className="mari-run-error__actions">
        {retry ? (
          <>
            <button type="button" onClick={retryRun} className="mari-btn">
              {localizeUi("ui.chat.homeprofessormarichat.retry")}
            </button>
            <button type="button" onClick={retryWithAnotherModel} className="mari-btn">
              {localizeUi("ui.chat.homeprofessormarichat.retryWithAnotherModel")}
            </button>
          </>
        ) : null}
        <button type="button" onClick={() => void dismissRunError()} className="mari-btn mari-run-error__dismiss">
          {localizeUi("ui.chat.homeprofessormarichat.dismissError")}
        </button>
      </div>
    </div>
  );
  const runFailedLine = (message: Message) => {
    const error = getMessageRunError(message, { includeDismissed: true });
    // The newest turn's failure is the card while it is unresolved, and nothing while she retries it.
    if (!error || (message.id === latestMessage?.id && (activeRunError || isBusy))) return null;
    return (
      <p className="mari-run-failed-line" title={error.message}>
        <AlertTriangle size="0.75rem" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {localizeUi("ui.chat.homeprofessormarichat.runFailedLine", { reason: error.message })}
        </span>
      </p>
    );
  };

  const openActionResult = useCallback(
    async (result: MariWorkspaceActionResult) => {
      await invalidateActionResult(result).catch((error) => {
        console.error("[Professor Mari] Failed to refresh action result before opening", error);
        toast.error(localizeUi("ui.chat.homeprofessormarichat.professorMariAppliedAWorkspaceChangeButAppData"), {
          description: describeProfessorMariError(error),
          duration: 12_000,
        });
      });
      executeStateNavigation({
        kind: "resource",
        resource: result.resource.kind,
        id: result.resource.id,
      });
      if (omnibarMode) closeChatWindow();
    },
    [closeChatWindow, invalidateActionResult, localizeUi, omnibarMode],
  );

  const openReferencedResource = useCallback(
    (resource: MariReferencedResource) => {
      const target = mariReferenceTarget(resource, getOmnibarSettingsDestinations());
      if (!target) return;
      executeStateNavigation(target);
      if (omnibarMode) closeChatWindow();
    },
    [closeChatWindow, omnibarMode],
  );

  // R9: a brief highlight so a review that was already on screen (not just-mounted, which
  // already gets the mari-review-rise entrance) still visibly answers the click. Driven by
  // state rather than a direct DOM class mutation, so a React re-render (the refresh below
  // triggers one) cannot silently wipe it before the user sees it.
  const [highlightedReviewId, setHighlightedReviewId] = useState<string | null>(null);
  useEffect(() => {
    if (workspaceDestination !== "chat" || !requestedReviewId) return;
    const targetId = requestedReviewId;
    // A cold open (the omnibar jumping here before this pane's own transcript has ever
    // rendered) can still be mounting the review's card a few frames after `chatWindowOpen`
    // and `workspaceDestination` already settled; retry on a wall-clock budget instead of a
    // single frame, same pattern as the chat's own /goto message jump (ChatArea.tsx).
    let cancelled = false;
    let rafId = 0;
    const deadline = Date.now() + 3000;
    const tryFocus = () => {
      if (cancelled) return;
      const review = document.getElementById(`mari-workspace-review-${targetId}`);
      if (!review) {
        if (Date.now() < deadline) rafId = window.requestAnimationFrame(tryFocus);
        return;
      }
      setRequestedReviewId(null);
      review.scrollIntoView({ block: "start" });
      review.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
      if (!reduceMotion) {
        setHighlightedReviewId(targetId);
        window.setTimeout(() => setHighlightedReviewId((current) => (current === targetId ? null : current)), 1200);
      }
    };
    rafId = window.requestAnimationFrame(tryFocus);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [reduceMotion, requestedReviewId, visiblePendingChangeReviewKey, workspaceDestination]);

  // #5740 / M5a: on the turn the latest mutating round produced, its first line is the goal Mari
  // reported acting on - user-visible by default so people can self-correct ("that wasn't a request!")
  // before filing reports. One record only (latest round), read from status, never a model call. The
  // server also reads the record back to Mari as context, so asking her "why did you treat that as
  // permission?" gets an answer grounded in this same record - never a gate either way.
  const renderGoal = (message: Message) => {
    const understoodRequest =
      message.role === "assistant" && workspaceStatus?.latestUnderstoodRequest?.messageId === message.id
        ? workspaceStatus.latestUnderstoodRequest
        : null;
    if (!understoodRequest) return null;
    const expanded = expandedUnderstoodRequestMessageId === message.id;
    const outcomeLabel = localizeUi(
      understoodRequest.outcome === "held"
        ? "ui.chat.homeprofessormarichat.heldForYourApproval"
        : understoodRequest.outcome === "applied"
          ? "ui.chat.homeprofessormarichat.actingOnOutcomeApplied"
          : understoodRequest.outcome === "failed"
            ? "ui.chat.homeprofessormarichat.actingOnOutcomeFailed"
            : "ui.chat.homeprofessormarichat.actingOnOutcomeInterrupted",
    );
    return (
      <button
        type="button"
        onClick={() => setExpandedUnderstoodRequestMessageId((current) => (current === message.id ? null : message.id))}
        aria-expanded={expanded}
        title={localizeUi(
          expanded ? "ui.chat.homeprofessormarichat.actingOnCollapse" : "ui.chat.homeprofessormarichat.actingOnExpand",
        )}
        className="mari-goal"
      >
        <span className="mari-goal__kicker">{localizeUi("ui.chat.homeprofessormarichat.goal")}</span>
        {/* break-words: the phrase is model-authored and routinely carries unbreakable tokens (paths, URLs)
            that would otherwise force a horizontal scrollbar onto the whole transcript. */}
        <span className={expanded ? "min-w-0 whitespace-pre-wrap break-words" : "min-w-0 truncate"}>
          {understoodRequest.text
            ? localizeUi("ui.chat.homeprofessormarichat.goalQuote", { text: understoodRequest.text })
            : localizeUi("ui.chat.homeprofessormarichat.goalNothingReported")}
          {expanded && (
            <span className="mt-0.5 block text-[0.625rem] opacity-80">
              {understoodRequest.commands.join(", ")}
              <span className="block">
                {localizeUi("ui.chat.homeprofessormarichat.actingOnModeOutcomeValue1Value2", {
                  value1: localize(MARI_PERMISSIONS_MODE_LABELS[understoodRequest.permissionsMode].label),
                  value2: outcomeLabel,
                })}
              </span>
            </span>
          )}
        </span>
      </button>
    );
  };

  // R14 (item 7): a reply's run counts from your message before it.
  const sentAtBefore = (message: Message) => {
    const index = messages.findIndex((item) => item.id === message.id);
    const sent = messages.slice(0, Math.max(0, index)).findLast((item) => item.role === "user");
    return sent ? Date.parse(sent.createdAt) || null : null;
  };

  const renderDisplayMessage = (message: Message) => {
    const canManageMessage = true;
    const messageContext = getProfessorMariMessageContext(message);
    const messageCharacter = resolveContextCharacter(messageContext, characterPreviewById, characterFallbackName);
    const messageLorebook = resolveContextLorebook(messageContext, lorebookPreviewById, lorebookFallbackName);
    return (
      <div key={message.id}>
        <CompactMariMessage
          message={message}
          thinking={message.role === "assistant" ? getMessageThinking(message) : null}
          onDelete={canManageMessage && !isBusy ? handleDeleteMessage : undefined}
          onEdit={canManageMessage && !isBusy ? handleEditMessage : undefined}
          onEditAndResend={
            canManageMessage && !isBusy && message.id === lastUserMessageId ? handleEditAndResend : undefined
          }
          onRegenerate={canManageMessage ? handleRegenerateMessage : undefined}
          canRegenerate={canManageMessage && !isBusy && message.id === messages[messages.length - 1]?.id}
          onRemoveAttachment={canManageMessage && !isBusy ? handleRemoveAttachment : undefined}
          onOpenActionResult={openActionResult}
          onOpenResource={openReferencedResource}
          characterSubject={messageCharacter}
          lorebookSubject={messageLorebook}
          characterPreviews={characterPreviewById}
          lorebookPreviews={lorebookPreviewById}
          messageContext={messageContext}
          restStory={message.id === latestMessage?.id ? latestTurnRestStory : null}
          pullTarget={!appendedArrival}
          reviews={renderTurnReviews(message.id)}
          goal={renderGoal(message)}
          runStartedAtMs={sentAtBefore(message)}
        />
        {runFailedLine(message)}
      </div>
    );
  };

  // #5073: the chat-history picker + Context Viewer. createPortal to document.body, so they render
  // correctly from whichever composer (floating or docked) is active. Gated on a live chatId.
  const attachModals = chatId ? (
    <>
      <MariChatHistoryPicker
        open={historyPickerOpen}
        workspaceChatId={chatId}
        onClose={() => setHistoryPickerOpen(false)}
      />
      <MariContextViewer
        open={contextViewerOpen}
        workspaceChatId={chatId}
        onClose={() => setContextViewerOpen(false)}
      />
    </>
  ) : null;

  return (
    <>
      {attachModals}
      {omnibarHeaderChrome}
      {omnibarStatusChrome}
      {omnibarMenuChrome}
      {!launchHidden && (
        <div
          className={cn(
            "home-professor-mari-chat mt-4 w-full",
            attachedFooter && "rounded-t-xl",
            desktopChatWindowOpen && "hidden",
            mobileFocusMode && "hidden",
          )}
          data-paused={pageActive ? "false" : "true"}
        >
          <section
            className="mari-chrome-accent-frame mari-chrome-accent-panel mari-accent-animated relative flex min-w-0 flex-col items-center gap-2 overflow-visible rounded-2xl border p-3 text-center sm:p-4"
            data-component="HomeProfessorMariChat.MariPanel"
          >
            <span
              className="mari-accent-soft-fill mari-accent-animated pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
              aria-hidden="true"
            />
            <div className="flex w-full flex-col items-center gap-2">
              <div
                className="relative z-[1] mt-3 w-full max-w-[10.5rem] [--mari-professor-sprite-bottom:5%] sm:max-w-[11.5rem] lg:mt-0 lg:max-w-[10.5rem] xl:max-w-[11.5rem]"
                data-component="HomeProfessorMariChat.Scene"
              >
                <ProfessorMariPixelScene active={isBusy || mariPhase !== null} />
              </div>
              <div className="w-full min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {localizeUi("ui.chat.homefaq.professorMari")}
                </div>
                <div className="truncate text-[0.6875rem] text-[var(--muted-foreground)]">
                  {isBusy
                    ? localizeUi("ui.chat.homeprofessormarichat.workingOnIt")
                    : localizeUi("ui.chat.homeprofessormarichat.readyToHelp")}
                </div>
              </div>
            </div>
            <div
              className="flex min-h-0 w-full max-w-2xl flex-col justify-center gap-1 px-1 text-center text-[0.6875rem] leading-[1.35] text-[var(--muted-foreground)]"
              data-component="HomeProfessorMariChat.Welcome"
            >
              {MARI_WELCOME.split("\n\n")
                .slice(0, 2)
                .map((paragraph, index) => (
                  <p key={paragraph} className={cn(index === 0 && "font-semibold text-[var(--foreground)]")}>
                    {paragraph}
                  </p>
                ))}
            </div>
            <button
              type="button"
              onClick={openChatWindow}
              className="mari-chrome-control mari-chrome-control--primary w-full justify-center gap-2 text-xs"
            >
              <MessageCircle size="0.9rem" />
              {t("home.professorMari.ask")}
            </button>
          </section>
        </div>
      )}

      <AnimatePresence onExitComplete={onChatWindowExitComplete}>
        {chatWindowOpen && (
          <ProfessorMariMobilePortal disabled={embeddedTab}>
            <motion.div
              ref={mobileDialogRef}
              key="professor-mari-window"
              data-component="HomeProfessorMariChat.Window"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={paneTransition}
              role={mobileFocusMode && !embeddedTab ? "dialog" : undefined}
              aria-modal={mobileFocusMode && !embeddedTab ? true : undefined}
              aria-label={mobileFocusMode && !embeddedTab ? localizeUi("ui.chat.homefaq.professorMari") : undefined}
              tabIndex={mobileFocusMode && !embeddedTab ? -1 : undefined}
              className={cn(
                "flex min-h-0 items-stretch justify-center",
                embeddedTab
                  ? "relative z-auto h-full w-full bg-transparent p-0"
                  : "fixed inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)_+_3rem)] z-[80] bg-[var(--background)] pb-[var(--mari-safe-area-inset-bottom,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:h-full sm:max-h-none sm:w-full sm:flex-1 sm:bg-transparent sm:p-0",
              )}
            >
              <div
                className={cn(
                  "flex h-full min-h-0 w-full flex-col",
                  embeddedTab ? "max-w-none" : "max-w-none sm:max-w-5xl",
                )}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  const hasDetail =
                    (workspaceDestination === "context" && Boolean(selectedContextId)) ||
                    (workspaceDestination === "skills" && Boolean(selectedSkillId)) ||
                    (workspaceDestination === "memories" && Boolean(selectedMemoryId));
                  const action = resolveProfessorMariWorkspaceBackAction(workspaceDestination, hasDetail);
                  if (action === "workspace") {
                    if (mobileFocusMode && !embeddedTab) {
                      event.stopPropagation();
                      closeChatWindow();
                    }
                    return;
                  }
                  event.stopPropagation();
                  if (action === "detail" && workspaceDestination === "context") {
                    setSelectedContextId(null);
                    return;
                  }
                  if (action === "detail" && workspaceDestination === "skills") {
                    setSelectedSkillId(null);
                    return;
                  }
                  if (action === "detail" && workspaceDestination === "memories") {
                    setSelectedMemoryId(null);
                    return;
                  }
                  setWorkspaceDestination("chat");
                }}
              >
                <div
                  data-mari-panel="open"
                  data-mari-state={mariPresentationState}
                  className="relative flex min-h-0 flex-1 flex-col sm:flex-row"
                >
                  <motion.div
                    key="professor-mari-chat"
                    transition={paneTransition}
                    className="h-full min-h-0 min-w-0 flex-1"
                  >
                    <div
                      className={cn(
                        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden border bg-[var(--background)]",
                        omnibarMode
                          ? "rounded-none border-0 bg-transparent shadow-none"
                          : embeddedTab
                            ? "rounded-2xl border-[color-mix(in_srgb,oklch(0.73_0.21_345)_28%,var(--border))] shadow-[0_24px_70px_-42px_oklch(0.73_0.21_345/0.8)]"
                            : "rounded-none border-0 sm:rounded-xl sm:border sm:border-[var(--border)]/70 sm:shadow-2xl",
                      )}
                    >
                      <div
                        className={cn(
                          "flex min-h-12 items-center justify-between gap-2 border-b border-[var(--border)]/60 px-2 pt-2 sm:px-3 sm:py-2",
                          omnibarMode ? "hidden" : "bg-[var(--card)]/80",
                        )}
                      >
                        {omnibarMode ? (
                          <div />
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[oklch(0.73_0.21_345/0.4)] bg-[oklch(0.73_0.21_345/0.1)] text-[var(--primary)] shadow-[0_0_18px_oklch(0.73_0.21_345/0.18)]">
                              {workspaceTimelineActive ? (
                                <Sparkles size="0.9rem" aria-hidden="true" />
                              ) : (
                                <img
                                  src={appearance.portraits.idle}
                                  {...mariImgLoading(MARI_ASSET_TIER.portraits.idle)}
                                  alt=""
                                  className="h-full w-full object-cover object-top"
                                />
                              )}
                            </span>
                            {/* At phone widths the header buttons crush this into "P. / R…" -
                                the avatar carries the identity VISUALLY there, so hide the
                                text but keep a screen-reader label (the avatar's alt is empty). */}
                            <span className="sr-only sm:hidden">{localizeUi("ui.chat.homefaq.professorMari")}</span>
                            <span className="hidden min-w-0 sm:block">
                              <span className="block truncate text-xs font-bold text-[var(--foreground)]">
                                {localizeUi("ui.chat.homefaq.professorMari")}
                              </span>
                              <span className="block truncate text-[0.625rem] text-[var(--muted-foreground)]">
                                {isBusy
                                  ? localizeUi("ui.chat.homeprofessormarichat.workingOnIt")
                                  : localizeUi("ui.chat.homeprofessormarichat.readyToHelp")}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={toggleChatHistory}
                            disabled={isBusy && !chatHistoryOpen}
                            className={cn(
                              "mari-chrome-control mari-chrome-control--compact",
                              "mari-chrome-accent-text-muted mari-accent-animated hover:text-[var(--marinara-chat-chrome-button-text-hover)]",
                            )}
                            title={t("home.professorMari.openPreviousChats")}
                            aria-expanded={chatHistoryOpen}
                          >
                            <BookOpen size="0.75rem" />
                            <span>{localizeUi("navigation.common.chats")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={toggleSkillsMenu}
                            className={cn(
                              "mari-chrome-control mari-chrome-control--compact",
                              "mari-chrome-accent-text-muted mari-accent-animated hover:text-[var(--marinara-chat-chrome-button-text-hover)]",
                            )}
                            title={localizeUi("ui.chat.homeprofessormarichat.openSkills")}
                            aria-expanded={skillsMenuOpen}
                          >
                            <ArrowDown size="0.75rem" />
                            <span>{localizeUi("ui.chat.homeprofessormarichat.skills")}</span>
                            {skills.length > 0 && (
                              <span className="mari-chrome-muted-badge px-1.5 py-0.5 text-[0.56rem]">
                                {activeSkillCount}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={toggleMemoriesMenu}
                            className={cn(
                              "mari-chrome-control mari-chrome-control--compact",
                              "mari-chrome-accent-text-muted mari-accent-animated hover:text-[var(--marinara-chat-chrome-button-text-hover)]",
                            )}
                            title={localizeUi("ui.chat.homeprofessormarichat.openMemories")}
                            aria-expanded={memoriesMenuOpen}
                          >
                            <Brain size="0.75rem" />
                            <span>{localizeUi("ui.chat.homeprofessormarichat.memories")}</span>
                            {memories.length > 0 && (
                              <span className="mari-chrome-muted-badge px-1.5 py-0.5 text-[0.56rem]">
                                {activeMemoryCount}
                              </span>
                            )}
                          </button>
                          <ProfessorMariContextControl
                            context={handoffContext}
                            character={focusedCharacter}
                            lorebook={focusedLorebook}
                            attachedContextCount={attachedContext?.length ?? 0}
                            onOpen={() => {
                              setConnectionMenuOpen(false);
                            }}
                            onRemoveFocus={() => setHandoffContext(null)}
                            onViewAttachedContext={() => void handleOpenContextViewer()}
                          />
                          {visiblePendingChangeReviews.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openPendingApprovals()}
                              className="mari-chrome-control mari-chrome-control--compact font-semibold"
                            >
                              <ShieldAlert size="0.75rem" />
                              <span>
                                {localizeUi("ui.chat.homeprofessormarichat.pendingApprovals", {
                                  count: visiblePendingChangeReviews.length,
                                })}
                              </span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void runRestart()}
                            disabled={isBusy}
                            className="mari-chrome-control mari-chrome-control--compact mari-chrome-accent-text-muted mari-accent-animated disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={localizeUi("ui.chat.homeprofessormarichat.newChat")}
                            title={t("home.professorMari.newChat")}
                          >
                            <Plus size="0.75rem" />
                            <span>{localizeUi("ui.chat.homeprofessormarichat.newChat")}</span>
                          </button>
                          {!embeddedTab && (
                            <button
                              type="button"
                              onClick={closeChatWindow}
                              className="mari-editor-action mari-accent-animated inline-flex shrink-0"
                              aria-label={t("home.professorMari.close")}
                              title={t("home.professorMari.close")}
                            >
                              <X size="1.125rem" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div ref={transcriptPaneRef} className="relative flex min-h-0 flex-1 flex-col">
                        {omnibarMode && !reduceAmbientEffects ? (
                          <div
                            aria-hidden="true"
                            className="mari-workspace-glow-band"
                            data-working={composerWorkingState}
                            data-glow={composerGlowTone}
                          />
                        ) : null}
                        <div
                          ref={setTranscriptScrollNode}
                          onScroll={handleTranscriptScroll}
                          data-component="HomeProfessorMariChat.Transcript"
                          data-anchor={messages.length === 0 ? "bottom" : undefined}
                          data-mari-state={mariPresentationState}
                          className={cn(
                            "min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-5 text-left sm:px-7",
                            omnibarMode
                              ? "mari-workspace-transcript bg-transparent"
                              : "bg-[radial-gradient(circle_at_12%_8%,oklch(0.79_0.16_205/0.06),transparent_26%),radial-gradient(circle_at_88%_12%,oklch(0.73_0.21_345/0.07),transparent_28%)]",
                          )}
                        >
                          <div ref={setTranscriptStackNode} className="mari-transcript-stack space-y-3">
                            {loadingHistory ? (
                              <LoadingHistoryState />
                            ) : (
                              <>
                                {workspaceToolsIssue ? (
                                  <MariNote tone="accent" role="status">
                                    {localizeUi(
                                      "ui.chat.homeprofessormarichat.professorMariWorkspaceToolsAreUnavailable",
                                    )}{" "}
                                    <span className="mari-note__detail">{workspaceToolsIssue}</span>
                                  </MariNote>
                                ) : null}
                                {transcriptHeadMessages.map(renderDisplayMessage)}
                                {/* Not before her chat has loaded: null === null would show the empty state, then the
                                  history loader, then the empty state again. */}
                                {emptyStateReady && arrival ? (
                                  // M9: she arrives knowing the screen she was opened from. Nothing is sent until
                                  // a card is picked or you type (R22); the composer's chips say what would go.
                                  renderArrival(arrival, "HomeProfessorMariChat.Arrival")
                                ) : emptyStateReady ? (
                                  <div className="mari-omnibar-empty-welcome">
                                    <span className="mari-welcome-story" aria-hidden="true">
                                      <MariStorySprite state="idle" />
                                    </span>
                                    <div className="mari-omnibar-empty-welcome__copy">
                                      <h3>{localizeUi("ui.chat.homeprofessormarichat.emptyWelcomeTitle")}</h3>
                                      <p>{localizeUi("ui.chat.homeprofessormarichat.emptyWelcomeDescription")}</p>
                                      <MariSuggestionChips
                                        chips={chipRowChips}
                                        onSelect={(chip) => handleSuggestionSelect(chip, true)}
                                        disabled={isBusy}
                                      />
                                    </div>
                                  </div>
                                ) : null}
                                {showConnectionFirstHint && (
                                  <p className="px-3 py-1 text-center text-xs text-[var(--muted-foreground)]">
                                    {localizeUi("ui.chat.homeprofessormarichat.selectAConnectionFirst")}
                                  </p>
                                )}
                                {/* M4: the active turn reserves the transcript's visible height (set on send) so
                                  nothing below it changes the scrollable height until a new turn replaces it. */}
                                <div
                                  ref={activeTurnRef}
                                  data-component="HomeProfessorMariChat.ActiveTurn"
                                  className="space-y-3"
                                >
                                  {/* M3: one timeline per turn. The unified MariWorkTimeline call site below never
                                    changes between the live run and the persisted reply - only its props do - so
                                    React updates it in place instead of unmounting and remounting it (which
                                    replayed every row's entrance animation and snapped its height). The persisted
                                    assistant reply it stands in for is skipped here (not merely hidden - an
                                    empty sibling would still add its own space-y-3 gap and shift every row). */}
                                  {activeTurnMessages
                                    .filter(
                                      (message) =>
                                        !(
                                          message.id === latestMessage?.id &&
                                          workspaceTimelineVisible &&
                                          message.role === "assistant"
                                        ),
                                    )
                                    .map(renderDisplayMessage)}
                                  {workspaceTimelineVisible ? (
                                    <MariWorkTimeline
                                      items={workspaceTimeline}
                                      character={focusedCharacter}
                                      lorebook={focusedLorebook}
                                      active={workspaceTimelineActive}
                                      restStory={latestTurnRestStory}
                                      pullTarget={!appendedArrival}
                                      runFailed={
                                        Boolean(activeRunError) ||
                                        Boolean(
                                          latestMessage &&
                                          getMessageRunError(latestMessage, { includeDismissed: true }),
                                        )
                                      }
                                      startedAtMs={
                                        workspaceRunClock?.startedAt ??
                                        (lastUserMessage ? Date.parse(lastUserMessage.createdAt) || null : null)
                                      }
                                      endedAtMs={workspaceRunClock?.endedAt ?? null}
                                      characterPreviews={characterPreviewById}
                                      lorebookPreviews={lorebookPreviewById}
                                      goal={
                                        !workspaceTimelineActive && latestMessage ? renderGoal(latestMessage) : null
                                      }
                                    >
                                      {!workspaceTimelineActive && latestMessage?.role === "assistant" ? (
                                        <MariWorkTimelineOutcome
                                          content={latestMessage.content ?? ""}
                                          items={workspaceTimeline}
                                          actionResults={latestActionResults}
                                          characterPreviews={characterPreviewById}
                                          lorebookPreviews={lorebookPreviewById}
                                          onOpenResource={openReferencedResource}
                                          onOpenActionResult={openActionResult}
                                          onRegenerate={
                                            !isBusy ? () => handleRegenerateMessage(latestMessage.id) : undefined
                                          }
                                          onDelete={!isBusy ? () => handleDeleteMessage(latestMessage.id) : undefined}
                                          reviews={renderTurnReviews(latestMessage.id)}
                                        />
                                      ) : null}
                                    </MariWorkTimeline>
                                  ) : null}
                                  {/* Mari tells her story (stopped, retry, review) under her newest turn; she rests beside her reply.
                                    A failed send is its red line under your message, not also a line of hers.
                                    Held back while the live timeline is still mounted (M4): the reload that
                                    clears it also brings the trace whose timeline then shows her. */}
                                  {restingStory &&
                                  !latestTurnHasTrace &&
                                  !activeRunError &&
                                  !workspaceTimelineVisible ? (
                                    <div
                                      className="mari-work-timeline__live"
                                      data-past={latestMessage?.role === "assistant" ? "true" : undefined}
                                    >
                                      {/* Beside her reply when there is one (MariAnswer); here otherwise. */}
                                      {latestMessage?.role === "assistant" ? null : (
                                        <MariStorySprite
                                          key={`${chatId}:${latestMessage?.id}:${restingStory ?? "idle"}`}
                                          state={restingStory ?? "idle"}
                                          pullTarget={!appendedArrival}
                                        />
                                      )}
                                      {restingStory ? (
                                        <span className="text-xs text-[var(--muted-foreground)]">
                                          {t(`mari.stories.${restingStory}`)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {activeRunError
                                    ? renderRunErrorCard(activeRunError, true)
                                    : workspaceStatus?.error && !isBusy
                                      ? renderRunErrorCard({ detail: workspaceStatus.error }, false)
                                      : null}
                                  {reviewsByTurn.unassigned.length > 0 ? (
                                    <div className="space-y-3">{reviewsByTurn.unassigned.map(renderTurnPrompt)}</div>
                                  ) : null}
                                  {/* Only a real question gets a line (a guided plan step, or held changes); generic
                                    "what next?" prompts are left to the chips, as in Claude and Gemini. */}
                                  {omnibarMode &&
                                  messages.length > 0 &&
                                  showSuggestionPrompt &&
                                  suggestionQuestion &&
                                  (guidedPlanStep || chipRowAwaitsApproval) ? (
                                    <TranscriptRow layout="document" marker={null} className="mari-suggestion-turn">
                                      <div className="mari-suggestion-question-turn">
                                        <Sparkles size="0.8rem" aria-hidden="true" />
                                        <CompactMarkdown content={suggestionQuestion} />
                                      </div>
                                    </TranscriptRow>
                                  ) : null}
                                  {showNextStepCards ? (
                                    <MariNextStepCards
                                      chips={chipRowChips}
                                      onSelect={handleSuggestionSelect}
                                      disabled={isBusy}
                                    />
                                  ) : null}
                                </div>
                                {appendedArrival
                                  ? // D1: an arrival door (⌘J, the pull, the drag, Home's "Ask Professor Mari")
                                    // opened into a chat she already has history in. The same arrival content
                                    // empty chats get (buildMariArrival, unchanged) appends at the bottom here
                                    // instead, local UI only (R22): never persisted, cleared on send.
                                    renderArrival(
                                      appendedArrival,
                                      "HomeProfessorMariChat.AppendedArrival",
                                      appendedArrivalNodeRef,
                                      arrivalThread && chatId && arrivalChoiceChatId === chatId ? (
                                        // R7/R13: no thread for this screen yet, so she continued her latest one; one quiet choice, no prompt.
                                        <div
                                          className="mari-arrival__choice"
                                          role="group"
                                          aria-label={localizeUi("ui.chat.homeprofessormarichat.arrivalChoice.label")}
                                        >
                                          <button
                                            type="button"
                                            className="mari-btn"
                                            disabled={isBusy}
                                            onClick={() => {
                                              continuedThereByContext.set(arrivalThread.key, chatId);
                                              setArrivalChoiceChatId(null);
                                            }}
                                          >
                                            {localizeUi("ui.chat.homeprofessormarichat.arrivalChoice.continueHere")}
                                          </button>
                                          <button
                                            type="button"
                                            className="mari-btn min-w-0"
                                            disabled={isBusy}
                                            onClick={() => void handleNewAboutContext()}
                                          >
                                            <span className="truncate">
                                              {arrivalThread.label
                                                ? localizeUi("ui.chat.homeprofessormarichat.arrivalChoice.newAbout", {
                                                    context: arrivalThread.label,
                                                  })
                                                : localizeUi("ui.chat.homeprofessormarichat.newChat")}
                                            </span>
                                          </button>
                                        </div>
                                      ) : null,
                                    )
                                  : null}
                              </>
                            )}
                          </div>
                        </div>

                        <form
                          ref={composerDockRef}
                          className={cn(
                            "px-2.5 py-2.5",
                            omnibarMode &&
                              "mari-workspace-composer-dock absolute inset-x-0 bottom-0 z-10 px-3 py-3 sm:px-7",
                          )}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleSubmit();
                          }}
                        >
                          <AnimatePresence>
                            {showJumpToLatest ? (
                              <motion.button
                                key="jump-to-latest"
                                type="button"
                                onClick={jumpToLatest}
                                className="mari-jump-to-latest"
                                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                aria-label={localizeUi("ui.chat.homeprofessormarichat.jumpToLatest")}
                                title={localizeUi("ui.chat.homeprofessormarichat.jumpToLatest")}
                              >
                                <ArrowDown size="1rem" aria-hidden="true" />
                              </motion.button>
                            ) : null}
                          </AnimatePresence>
                          {showSuggestionPrompt &&
                          !showNextStepCards &&
                          suggestionQuestion &&
                          (!omnibarMode || messages.length > 0) ? (
                            <div className="mari-workspace-question-dock mb-2">
                              {!omnibarMode ? (
                                <div className="mari-workspace-question-dock__prompt">
                                  <Sparkles size="0.875rem" aria-hidden="true" />
                                  <div className="min-w-0 flex-1">
                                    <CompactMarkdown content={suggestionQuestion} />
                                  </div>
                                </div>
                              ) : null}
                              <div className="mari-workspace-answer-strip">
                                <MariSuggestionChips
                                  chips={chipRowChips}
                                  // N4 covers the next-step cards; the starter and plan/approval chips still draft.
                                  onSelect={(chip) => handleSuggestionSelect(chip, true)}
                                  disabled={isBusy}
                                />
                              </div>
                            </div>
                          ) : null}
                          <input
                            ref={attachmentInputRef}
                            type="file"
                            accept={PROFESSOR_MARI_ATTACHMENT_ACCEPT}
                            multiple
                            className="hidden"
                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                              void handleAttachmentUpload(event.target.files);
                              event.target.value = "";
                            }}
                          />
                          {/* R11 (composer v5): Mari's own shell, not the regular chat input's: neutral at rest, a primary
                              ring only on focus, quiet controls and one neutral filled Send. */}
                          <div
                            className="mari-workspace-composer"
                            data-busy={isBusy ? "true" : undefined}
                            data-collapsed={workspaceTimelineActive ? "true" : undefined}
                          >
                            {attachments.length > 0 ||
                            isReadingAttachments ||
                            composerContextFacets.length > 0 ||
                            oneShotContext?.query ? (
                              <div className="mari-workspace-composer__context">
                                <ProfessorMariAttachmentPreviews
                                  attachments={attachments}
                                  isReading={isReadingAttachments}
                                  onRemove={(index) =>
                                    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
                                  }
                                />
                                {composerContextFacets.length > 0 ? (
                                  <MariContextFacetChips
                                    facets={composerContextFacets}
                                    onRemove={removeOneShotFacet}
                                    className="contents"
                                  />
                                ) : oneShotContext?.query ? (
                                  <span className="mari-workspace-context-chip">
                                    <Sparkles aria-hidden="true" />
                                    <span className="min-w-0 truncate">
                                      {localizeUi("ui.chat.homeprofessormarichat.searchContextValue1", {
                                        value1: oneShotContext.query,
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setHandoffContext(null)}
                                      className="mari-workspace-context-chip__remove"
                                      aria-label={localizeUi("ui.chat.homeprofessormarichat.contextControlRemoveFocus")}
                                    >
                                      <X size="0.625rem" aria-hidden="true" />
                                    </button>
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="relative flex min-w-0 flex-1 basis-full">
                              <InlineGhostText
                                value={draft}
                                suffix={draftSuffix}
                                multiline
                                scrollLeft={composerScroll.left}
                                scrollTop={composerScroll.top}
                                className="mari-workspace-composer__text"
                              />
                              <textarea
                                ref={floatingTextareaRef}
                                value={draft}
                                onChange={(event) => {
                                  setDraft(event.target.value);
                                  if (mobileFocusMode) event.currentTarget.scrollIntoView({ block: "end" });
                                }}
                                onScroll={(event) => {
                                  const { scrollLeft, scrollTop } = event.currentTarget;
                                  event.currentTarget.toggleAttribute("data-scrolled", scrollTop > 0);
                                  setComposerScroll({ left: scrollLeft, top: scrollTop });
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Tab" && !event.shiftKey && draftSuffix) {
                                    event.preventDefault();
                                    acceptDraftCompletion();
                                    return;
                                  }
                                  const shouldSend =
                                    event.key === "Enter" &&
                                    !event.shiftKey &&
                                    (enterToSend || event.metaKey || event.ctrlKey);
                                  if (shouldSend) {
                                    event.preventDefault();
                                    void handleSubmit();
                                  }
                                }}
                                rows={1}
                                placeholder={t("home.professorMari.placeholder")}
                                className="mari-workspace-composer__text mari-workspace-composer__input"
                                disabled={isBusy}
                              />
                            </div>
                            {/* Under the text, like Claude's: attach, the connection and the Permissions Mode. */}
                            <div className="mari-composer-toolbar">
                              <div className="mari-workspace-composer__attach">
                                <MariAttachButton
                                  onAttachFiles={() => attachmentInputRef.current?.click()}
                                  onAddChatHistory={() => void handleOpenHistoryPicker()}
                                  onViewContext={() => void handleOpenContextViewer()}
                                  attachedFileCount={attachments.length}
                                  attachedContextCount={attachedContext?.length ?? 0}
                                  disabled={isBusy || isReadingAttachments}
                                  isReading={isReadingAttachments}
                                />
                              </div>

                              <div className="mari-composer-menu mari-composer-menu--connection">
                                <button
                                  ref={connectionButtonRef}
                                  type="button"
                                  onClick={() => {
                                    setPermissionsMenuOpen(false);
                                    setConnectionMenuOpen((current) => !current);
                                  }}
                                  disabled={isBusy}
                                  className={cn(
                                    "mari-composer-menu__trigger mari-workspace-composer__connection",
                                    !effectiveConnection && "mari-workspace-composer__connection--missing",
                                  )}
                                  aria-expanded={connectionMenuOpen}
                                  aria-label={
                                    effectiveConnection?.name
                                      ? localizeUi("ui.chat.homeprofessormarichat.connectionValue1", {
                                          value1: effectiveConnection.name,
                                        })
                                      : localizeUi("ui.chat.homeprofessormarichat.selectConnection")
                                  }
                                  title={
                                    effectiveConnection?.name
                                      ? localizeUi("ui.chat.homeprofessormarichat.connectionValue1", {
                                          value1: effectiveConnection.name,
                                        })
                                      : localizeUi("ui.chat.homeprofessormarichat.selectConnection")
                                  }
                                >
                                  <Link aria-hidden="true" />
                                  <span>
                                    {effectiveConnection
                                      ? effectiveConnection.name || effectiveConnection.id
                                      : localizeUi("ui.chat.homeprofessormarichat.selectConnection")}
                                  </span>
                                  <ChevronDown aria-hidden="true" />
                                </button>
                                {connectionMenuOpen && (
                                  <div
                                    ref={connectionMenuRef}
                                    className="mari-composer-menu__popover"
                                    onKeyDown={onConnectionMenuKeyDown}
                                  >
                                    <p className="mari-composer-menu__head">
                                      {localizeUi("navigation.topbar.connections")}
                                    </p>
                                    {connectionOptions.length > 0 ? (
                                      connectionOptions.map((connection) => {
                                        const isActive = effectiveConnectionId === connection.id;
                                        return (
                                          <MariRow
                                            key={connection.id}
                                            slot={<Link aria-hidden="true" />}
                                            title={connection.name || connection.id}
                                            fact={
                                              connection.id === LOCAL_SIDECAR_CONNECTION_ID
                                                ? sidecarNativeToolCalls
                                                  ? localizeUi("ui.chat.homeprofessormarichat.nativeTools")
                                                  : localizeUi("ui.chat.homeprofessormarichat.toolsOff")
                                                : [connection.provider, connection.model].filter(Boolean).join(" · ")
                                            }
                                            trail={isActive ? <Check aria-hidden="true" /> : undefined}
                                            state={isActive ? "selected" : undefined}
                                            onClick={() => handleConnectionChange(connection.id)}
                                          />
                                        );
                                      })
                                    ) : (
                                      <MariRow
                                        slot={<Plus aria-hidden="true" />}
                                        title={localizeUi("ui.chat.homeprofessormarichat.addAConnection")}
                                        onClick={() => {
                                          setConnectionMenuOpen(false);
                                          useUIStore.getState().openModal("create-connection");
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mari-composer-menu">
                                <button
                                  ref={permissionsButtonRef}
                                  type="button"
                                  onClick={() => {
                                    setConnectionMenuOpen(false);
                                    setPermissionsMenuOpen((current) => !current);
                                  }}
                                  className="mari-composer-menu__trigger"
                                  data-mode={permissionsMode}
                                  aria-expanded={permissionsMenuOpen}
                                  aria-label={localizeUi("ui.chat.quickreplymenu.value1Value2", {
                                    value1: localizeUi("ui.chat.homeprofessormarichat.permissionsMode"),
                                    value2: localize(MARI_PERMISSIONS_MODE_LABELS[permissionsMode].label),
                                  })}
                                  title={localizeUi("ui.chat.homeprofessormarichat.permissionsMode")}
                                >
                                  <ActivePermissionsModeIcon aria-hidden="true" />
                                  <span>{localize(MARI_PERMISSIONS_MODE_LABELS[permissionsMode].label)}</span>
                                  <ChevronDown aria-hidden="true" />
                                </button>
                                {permissionsMenuOpen ? (
                                  <div
                                    ref={permissionsMenuRef}
                                    className="mari-composer-menu__popover"
                                    onKeyDown={onPermissionsMenuKeyDown}
                                  >
                                    {permissionsModeOptions}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {/* While she works the whole bar folds into one labelled Stop pill, and unfolds again after. */}
                            <button
                              type={workspaceTimelineActive ? "button" : "submit"}
                              onClick={workspaceTimelineActive ? () => void stopWorkspace() : undefined}
                              disabled={workspaceTimelineActive ? false : !canSubmitMessage || isBusy}
                              data-mode={workspaceTimelineActive ? "stop" : "send"}
                              className="mari-workspace-composer__send"
                              aria-label={
                                workspaceTimelineActive
                                  ? localizeUi("ui.chat.homeprofessormarichat.stopProfessorMariWorkspaceAgent")
                                  : t("home.professorMari.send")
                              }
                              title={
                                workspaceTimelineActive
                                  ? localizeUi("ui.chat.homeprofessormarichat.stopProfessorMariWorkspaceAgent")
                                  : t("home.professorMari.send")
                              }
                            >
                              <ArrowUp size="1rem" strokeWidth={2.25} data-icon="send" aria-hidden="true" />
                              <span data-icon="stop" aria-hidden="true">
                                <Square size="0.7rem" fill="currentColor" strokeWidth={0} />
                                {localizeUi("ui.chat.homeprofessormarichat.stop")}
                              </span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                  <AnimatePresence initial={false}>
                    {chatHistoryOpen ? (
                      <motion.div
                        key="professor-mari-chats"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={paneTransition}
                        className={MARI_PANEL_SLOT_CLASS}
                      >
                        <MariSidePanelHeader
                          title={t("home.professorMari.chats")}
                          onClose={() => setWorkspaceDestination("chat")}
                          closeLabel={t("home.professorMari.closeChats")}
                          actions={
                            <>
                              {/* #5752: the affordance people hunt for lives where they look for it. */}
                              <button
                                type="button"
                                onClick={() => {
                                  setWorkspaceDestination("chat");
                                  void runRestart();
                                }}
                                disabled={isBusy}
                                className="mari-link"
                                title={t("home.professorMari.newChat")}
                              >
                                <Plus size="0.8rem" aria-hidden="true" />
                                {localizeUi("ui.chat.homeprofessormarichat.newChat")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (chatHistorySelectionMode) {
                                    setChatHistorySelectionMode(false);
                                    setSelectedChatHistoryIds(new Set());
                                  } else {
                                    setChatHistorySelectionMode(true);
                                  }
                                }}
                                disabled={chatHistory.length === 0 || chatHistoryLoading}
                                className="mari-link"
                                aria-pressed={chatHistorySelectionMode}
                              >
                                {localizeUi(
                                  chatHistorySelectionMode
                                    ? "ui.chat.homeprofessormarichat.cancelSelection"
                                    : "ui.chat.homeprofessormarichat.selectChats",
                                )}
                              </button>
                            </>
                          }
                        />
                        {chatHistory.length > 0 ? (
                          <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
                            <MariSideSearch
                              value={chatHistoryQuery}
                              onChange={setChatHistoryQuery}
                              label={localizeUi("ui.chat.homeprofessormarichat.searchChats")}
                            />
                            <MariPanelSortSelect value={chatHistorySortMode} onChange={setChatHistorySortMode} />
                          </div>
                        ) : null}
                        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                          {chatHistoryLoading ? (
                            <div className="flex h-full items-center justify-center text-xs text-[var(--muted-foreground)]">
                              <Loader2 size="0.875rem" className="mr-2 animate-spin" />
                              {localizeUi("ui.chat.homeprofessormarichat.loadingChats")}
                            </div>
                          ) : (
                            <div className="mari-list mari-edit--menus" data-cards="chats">
                              {chatHistory.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-[var(--muted-foreground)]">
                                  {t("home.professorMari.noPreviousChats")}{" "}
                                  {localizeUi("ui.chat.homeprofessormarichat.newChatSavesTheCurrentChatHere")}
                                </p>
                              ) : displayedChatHistory.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-[var(--muted-foreground)]">
                                  {localizeUi("ui.chat.homeprofessormarichat.noMatchingChats")}
                                </p>
                              ) : (
                                displayedChatHistory.map((item) => {
                                  const active = item.id === chatId || isProfessorMariChatActive(item);
                                  const renaming = renamingChatId === item.id;
                                  const selected = selectedChatHistoryIds.has(item.id);
                                  const menuOpen = chatRowMenuId === item.id;
                                  const name = item.name || localizeUi("ui.chat.homeprofessormarichat.unnamedChat");
                                  const thread = readMariThread(item);
                                  return (
                                    <div
                                      key={item.id}
                                      data-professor-mari-chat-id={item.id}
                                      className="mari-list__item"
                                    >
                                      <div className="mari-row" aria-current={active ? "true" : undefined}>
                                        {renaming ? (
                                          <form
                                            className="flex min-w-0 flex-1 items-center gap-1.5 py-1"
                                            onSubmit={(event) => {
                                              event.preventDefault();
                                              void handleRenameProfessorChat(item.id);
                                            }}
                                          >
                                            <input
                                              value={renameDraft}
                                              onChange={(event) => setRenameDraft(event.target.value)}
                                              aria-label={localizeUi("ui.chat.homeprofessormarichat.renameChatInput")}
                                              className="min-w-0 flex-1 rounded-md bg-[var(--background)] px-2 py-1.5 text-xs outline-none ring-1 ring-[var(--mari-hairline)] focus:ring-[var(--primary)]"
                                              autoFocus
                                            />
                                            <button type="submit" className="mari-btn mari-btn--solid">
                                              {localizeUi("ui.noodle.noodlehome.save")}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRenamingChatId(null);
                                                setRenameDraft("");
                                              }}
                                              className="mari-link"
                                            >
                                              {localizeUi("chat.delete.dialog.cancel")}
                                            </button>
                                          </form>
                                        ) : (
                                          <>
                                            {chatHistorySelectionMode && (
                                              <span className="shrink-0 text-[var(--primary)]" aria-hidden="true">
                                                {selected ? <Check size="0.875rem" /> : <Square size="0.875rem" />}
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                chatHistorySelectionMode
                                                  ? toggleProfessorChatSelection(item.id)
                                                  : void handleSelectProfessorChat(item.id)
                                              }
                                              disabled={isBusy}
                                              aria-pressed={chatHistorySelectionMode ? selected : undefined}
                                              className="mari-row__toggle disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                              {/* Q6 / R10: the slot says it is a Mari chat; the fact says what it is about. */}
                                              <span className="mari-row__slot" aria-hidden="true">
                                                <ResultTypeIcon type="mari-chat" glyph />
                                              </span>
                                              <span className="mari-row__text">
                                                <span className="mari-row__title">
                                                  <span>{name}</span>
                                                </span>
                                                <span className="mari-row__fact">
                                                  {[
                                                    // R7: what the thread is about ("Zylo's chat · 2 days ago · 4 messages").
                                                    thread.contextLabel ||
                                                      localizeUi("ui.chat.homeprofessormarichat.generalThread"),
                                                    formatRelativeContact(item.lastMessageAt ?? item.updatedAt),
                                                    localizeUi("ui.chat.homeprofessormarichat.messageCount", {
                                                      count: item.messageCount ?? 0,
                                                    }),
                                                  ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                                </span>
                                              </span>
                                            </button>
                                            {!chatHistorySelectionMode && (
                                              <div
                                                ref={menuOpen ? chatRowMenuRef : undefined}
                                                className="mari-row__more relative"
                                                data-open={menuOpen ? "true" : undefined}
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() => setChatRowMenuId(menuOpen ? null : item.id)}
                                                  className="mari-omnibar-header-menu__trigger"
                                                  aria-expanded={menuOpen}
                                                  aria-label={localizeUi(
                                                    "ui.chat.homeprofessormarichat.chatRowActions",
                                                    {
                                                      name,
                                                    },
                                                  )}
                                                >
                                                  <EllipsisVertical size="0.9rem" aria-hidden="true" />
                                                </button>
                                                {menuOpen ? (
                                                  <div
                                                    ref={chatRowPopoverRef}
                                                    className="mari-omnibar-header-menu__popover"
                                                    onKeyDown={onChatRowMenuKeyDown}
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setChatRowMenuId(null);
                                                        setRenamingChatId(item.id);
                                                        setRenameDraft(item.name || "");
                                                      }}
                                                    >
                                                      <Pencil size="0.875rem" aria-hidden="true" />
                                                      <span>
                                                        {localizeUi("ui.chat.homeprofessormarichat.renameChat")}
                                                      </span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setChatRowMenuId(null);
                                                        void handleDeleteProfessorChat(item.id);
                                                      }}
                                                    >
                                                      <Trash2 size="0.875rem" aria-hidden="true" />
                                                      <span>{localizeUi("lorebook.editor.batch.delete")}</span>
                                                    </button>
                                                  </div>
                                                ) : null}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                        {chatHistorySelectionMode && (
                          <div className="flex items-center gap-2 border-t border-[var(--mari-hairline)] px-3 py-2">
                            <span className="min-w-0 flex-1 text-xs text-[var(--muted-foreground)]">
                              {localizeUi("ui.chat.homeprofessormarichat.selectedChats", {
                                count: selectedChatHistoryIds.size,
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleBulkDeleteProfessorChats()}
                              disabled={selectedChatHistoryIds.size === 0}
                              className="mari-btn mari-btn--danger"
                            >
                              <Trash2 size="0.75rem" aria-hidden="true" />
                              {localizeUi("ui.chat.homeprofessormarichat.deleteSelectedChats")}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ) : memoriesMenuOpen ? (
                      <motion.div
                        key="professor-mari-memories"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={paneTransition}
                        className={MARI_PANEL_SLOT_CLASS}
                      >
                        <Suspense fallback={null}>
                          <ProfessorMariMemoriesMenu
                            memories={memories}
                            query={memoriesQuery}
                            selectedMemory={selectedMemory}
                            draft={memoryDraft}
                            loading={memoriesLoading}
                            saving={memoriesSaving}
                            fileInputRef={memoryFileInputRef}
                            onClose={() => setWorkspaceDestination("chat")}
                            onNew={handleNewMemory}
                            onUploadClick={handleMemoryUploadClick}
                            onFileChange={handleMemoryFileChange}
                            onSelect={setSelectedMemoryId}
                            onDraftChange={setMemoryDraft}
                            onSave={() => void handleSaveMemory()}
                            onDelete={(id) => void handleDeleteMemory(id)}
                            onToggleEnabled={handleToggleMemoryEnabled}
                            onTogglePersistent={handleToggleMemoryPersistent}
                            onQueryChange={setMemoriesQuery}
                          />
                        </Suspense>
                      </motion.div>
                    ) : skillsMenuOpen ? (
                      <motion.div
                        key="professor-mari-skills"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={paneTransition}
                        className={MARI_PANEL_SLOT_CLASS}
                      >
                        <Suspense fallback={null}>
                          <ProfessorMariSkillsMenu
                            skills={skills}
                            query={skillsQuery}
                            selectedSkill={selectedSkill}
                            draft={skillDraft}
                            loading={skillsLoading}
                            saving={skillsSaving}
                            diagnostics={skillsDiagnostics}
                            fileInputRef={skillFileInputRef}
                            onClose={() => setWorkspaceDestination("chat")}
                            onNew={handleNewSkill}
                            onUploadClick={handleSkillUploadClick}
                            onFileChange={handleSkillFileChange}
                            onSelect={setSelectedSkillId}
                            onDraftChange={setSkillDraft}
                            onSave={() => void handleSaveSkill()}
                            onDelete={(id) => void handleDeleteSkill(id)}
                            onToggle={(skill) => void handleToggleSkill(skill)}
                            onQueryChange={setSkillsQuery}
                          />
                        </Suspense>
                      </motion.div>
                    ) : workspaceDestination === "context" ? (
                      <motion.section
                        key="professor-mari-context"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={paneTransition}
                        className={MARI_PANEL_SLOT_CLASS}
                      >
                        <MariSidePanelHeader
                          title={
                            (selectedContextId
                              ? attachedContext?.find((item) => item.id === selectedContextId)?.label
                              : undefined) ?? localizeUi("ui.chat.homeprofessormarichat.awareOf")
                          }
                          hint={localizeUi("ui.chat.homeprofessormarichat.awareOfHint")}
                          onClose={() => setWorkspaceDestination("chat")}
                          closeLabel={localizeUi("ui.chat.homeprofessormarichat.awareOfClose")}
                          onBack={selectedContextId ? () => setSelectedContextId(null) : undefined}
                          backLabel={
                            selectedContextId ? localizeUi("ui.chat.homeprofessormarichat.awareOfBack") : undefined
                          }
                        />
                        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                          {selectedContextId ? (
                            (() => {
                              const selected = attachedContext?.find((item) => item.id === selectedContextId);
                              return selected ? (
                                <article className="mx-auto max-w-2xl">
                                  <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-[var(--muted-foreground)]">
                                    <span>{selected.kind}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {localizeUi("ui.chat.homeprofessormarichat.attachedTokenEstimate", {
                                        count: formatCompactTokenCount(selected.tokenEstimate),
                                      })}
                                    </span>
                                  </div>
                                  <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-[var(--border)]/70 bg-[var(--card)]/70 p-3 text-xs leading-relaxed text-[var(--foreground)]">
                                    {selected.content}
                                  </pre>
                                </article>
                              ) : null;
                            })()
                          ) : (
                            <div
                              className="mx-auto max-w-2xl space-y-4"
                              data-component="HomeProfessorMariChat.WhatMariSees"
                            >
                              <section className="space-y-1.5" data-group="next">
                                <h4 className={SEES_KICKER_CLASS}>
                                  {localizeUi("ui.chat.homeprofessormarichat.awareOfNextMessage")}
                                </h4>
                                <div className="mari-edit">
                                  {oneShotContextFacets.length > 0 ? (
                                    oneShotContextFacets.map((facet) =>
                                      renderSeesRow({
                                        key: facet.kind,
                                        Icon: facetIcon(facet),
                                        title: facet.text,
                                        meta: localizeUi(
                                          professorMariFacetSendsContentLater(facet.kind)
                                            ? "ui.chat.homeprofessormarichat.awareOfNameOnly"
                                            : "ui.chat.homeprofessormarichat.awareOfGoesNext",
                                        ),
                                        onRemove: () => removeOneShotFacet(facet),
                                      }),
                                    )
                                  ) : oneShotContext?.query ? (
                                    renderSeesRow({
                                      key: "query",
                                      Icon: Sparkles,
                                      title: localizeUi("ui.chat.homeprofessormarichat.searchContextValue1", {
                                        value1: oneShotContext.query,
                                      }),
                                      meta: localizeUi("ui.chat.homeprofessormarichat.awareOfGoesNext"),
                                      onRemove: () => setHandoffContext(null),
                                    })
                                  ) : (
                                    <p className="px-3 py-3 text-xs text-[var(--muted-foreground)]">
                                      {localizeUi("ui.chat.homeprofessormarichat.awareOfNextEmpty")}
                                    </p>
                                  )}
                                </div>
                              </section>
                              <section className="space-y-1.5" data-group="always">
                                <h4 className={SEES_KICKER_CLASS}>
                                  {localizeUi("ui.chat.homeprofessormarichat.awareOfAlways")}
                                </h4>
                                <div className="mari-edit">
                                  {handoffContext && !oneShotContext
                                    ? renderSeesRow({
                                        key: "focus",
                                        ...(handoffContext.resource
                                          ? { type: resourceResultType(handoffContext.resource.kind) }
                                          : { Icon: Sparkles }),
                                        title:
                                          handoffContext.resource?.label ??
                                          handoffContext.resource?.kind ??
                                          handoffContext.source,
                                        meta: localizeUi("ui.chat.homeprofessormarichat.awareOfFocusMeta"),
                                        onRemove: () => setHandoffContext(null),
                                      })
                                    : null}
                                  {attachedContext?.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => setSelectedContextId(item.id)}
                                      className={cn(
                                        MARI_SIDE_ROW_CLASS,
                                        "w-full text-left hover:bg-[var(--mari-hover)]",
                                      )}
                                    >
                                      <FileText size="0.85rem" className="shrink-0 text-[var(--muted-foreground)]" />
                                      <span className="mari-edit__text">
                                        <span className="mari-edit__title">{item.label}</span>
                                        <span className="mari-edit__meta">
                                          {localizeUi("ui.chat.homeprofessormarichat.attachedTokenEstimate", {
                                            count: formatCompactTokenCount(item.tokenEstimate),
                                          })}
                                        </span>
                                      </span>
                                      <ChevronRight size="0.8rem" className="text-[var(--muted-foreground)]" />
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenHistoryPicker()}
                                    className={cn(
                                      MARI_SIDE_ROW_CLASS,
                                      "min-h-11 w-full text-left text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--mari-hover)] hover:text-[var(--foreground)]",
                                    )}
                                  >
                                    <Plus size="0.85rem" className="shrink-0" aria-hidden="true" />
                                    {localizeUi("ui.chat.homeprofessormarichat.awareOfAttach")}
                                  </button>
                                </div>
                              </section>
                              <section className="space-y-1.5" data-group="how">
                                <h4 className={SEES_KICKER_CLASS}>
                                  {localizeUi("ui.chat.homeprofessormarichat.awareOfHowSheWorks")}
                                </h4>
                                <div className="mari-edit">
                                  {renderSeesRow({
                                    key: "connection",
                                    Icon: Link,
                                    title:
                                      workspaceStatus?.connection?.name ??
                                      effectiveConnection?.name ??
                                      localizeUi("ui.chat.homeprofessormarichat.missingConnection"),
                                    meta:
                                      showContextUsage && contextBudget
                                        ? localizeUi("ui.chat.homeprofessormarichat.awareOfContextUse", {
                                            used: formatCompactTokenCount(contextBudget.usedTokens),
                                            maximum: formatCompactTokenCount(contextBudget.maxTokens),
                                          })
                                        : localizeUi("ui.chat.homeprofessormarichat.awareOfModelMeta"),
                                    action: (
                                      <button
                                        type="button"
                                        className="mari-link"
                                        onClick={() => {
                                          setWorkspaceDestination("chat");
                                          setConnectionMenuOpen(true);
                                        }}
                                      >
                                        {localizeUi("ui.chat.homeprofessormarichat.awareOfChangeModel")}
                                      </button>
                                    ),
                                  })}
                                  {renderSeesRow({
                                    key: "sandbox",
                                    Icon: sandboxAvailable === false ? ShieldOff : Lock,
                                    title: localizeUi(
                                      sandboxAvailable === false
                                        ? "ui.chat.homeprofessormarichat.sandboxUnavailable"
                                        : sandboxAvailable === null
                                          ? "ui.chat.homeprofessormarichat.sandboxUnknown"
                                          : "ui.chat.homeprofessormarichat.sandboxAvailable",
                                    ),
                                    meta:
                                      sandboxAvailable === null
                                        ? undefined
                                        : localizeUi(
                                            sandboxAvailable
                                              ? "ui.chat.homeprofessormarichat.awareOfSandboxOn"
                                              : "ui.chat.homeprofessormarichat.awareOfSandboxOff",
                                          ),
                                  })}
                                </div>
                              </section>
                              <p className="px-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                                {localizeUi("ui.chat.homeprofessormarichat.awareOfPrivacy")}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.section>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </ProfessorMariMobilePortal>
        )}
      </AnimatePresence>
    </>
  );
}
