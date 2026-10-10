// ──────────────────────────────────────────────
// Zustand Store: UI Slice
// ──────────────────────────────────────────────
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateClientId } from "../lib/utils";
import {
  IMAGE_STYLE_PROFILES_STORAGE_KEY,
  normalizeImageStyleProfileSettings,
  normalizeQuoteFormat,
  type ImageStyleProfileSettings,
  type GenerateSpatialMapDraftResponse,
  type LorebookCategory,
  type QuoteFormat,
  type ScenePromptPreferences,
  type ScenePackageOrigin,
} from "@marinara-engine/shared";
import { announceChatFloatingUiDismiss } from "../lib/chat-floating-ui-events";
import { BASIC_PANEL_SORT_OPTIONS, normalizeBasicPanelSort, type BasicPanelSort } from "../lib/panel-sort";
import { DEFAULT_APP_LANGUAGE, type AppLanguage } from "../localization/locale-types";
import { deferEditorLeave } from "../lib/editor-leave";
import { UI_PERSISTENCE } from "../lib/ui-persistence";
import { normalizeChatWidgetFont } from "../lib/font-family";
import type { ChatWizardDefaults, ChatWizardMode } from "../lib/chat-wizard-defaults";

export type Panel =
  "chat" | "characters" | "lorebooks" | "presets" | "connections" | "agents" | "personas" | "settings" | "extensions";
type ChatModeShortcut = "conversation" | "roleplay" | "game";
const CHARACTER_LIBRARY_SORT_OPTIONS = ["name-asc", "name-desc", "newest", "oldest", "favorites"] as const;
export type CharacterLibrarySort = (typeof CHARACTER_LIBRARY_SORT_OPTIONS)[number];
export type CardLibraryKind = "characters" | "personas";
export const MOBILE_SHELL_MEDIA_QUERY =
  "(max-width: 767px), (max-width: 1440px) and (hover: none) and (any-pointer: coarse)";
const CHARACTER_PANEL_FAVORITE_FILTER_OPTIONS = ["all", "favorites", "non-favorites"] as const;
type CharacterPanelFavoriteFilter = (typeof CHARACTER_PANEL_FAVORITE_FILTER_OPTIONS)[number];
const LOREBOOK_PANEL_CATEGORY_OPTIONS = [
  "all",
  "active",
  "world",
  "character",
  "npc",
  "spellbook",
  "uncategorized",
] as const satisfies readonly (LorebookCategory | "all" | "active")[];
export type LorebookPanelCategory = (typeof LOREBOOK_PANEL_CATEGORY_OPTIONS)[number];
const LOREBOOK_PANEL_SORT_OPTIONS = ["name-asc", "name-desc", "newest", "oldest", "tokens"] as const;
export type LorebookPanelSort = (typeof LOREBOOK_PANEL_SORT_OPTIONS)[number];
export type ResourcePanelSort = BasicPanelSort;
const CONNECTION_PANEL_SORT_OPTIONS = [...BASIC_PANEL_SORT_OPTIONS, "custom"] as const;
export type ConnectionPanelSort = (typeof CONNECTION_PANEL_SORT_OPTIONS)[number];

function normalizeConnectionPanelSort(value: unknown): ConnectionPanelSort {
  return CONNECTION_PANEL_SORT_OPTIONS.includes(value as ConnectionPanelSort)
    ? (value as ConnectionPanelSort)
    : "name-asc";
}
type FontSize = 12 | 14 | 16 | 17 | 19 | 22 | 26 | 30 | 34;
export type VisualTheme = "default" | "sillytavern";
export type ChatWidgetPreset = "default" | "dottore" | "mari";
export type ChatWidgetShape = "preset" | "rounded" | "square" | "cut-corner" | "arched";

export function normalizeChatWidgetPreset(value: unknown): ChatWidgetPreset {
  return value === "dottore" || value === "mari" ? value : "default";
}

export function normalizeChatWidgetShape(value: unknown): ChatWidgetShape {
  return value === "rounded" || value === "square" || value === "cut-corner" || value === "arched" ? value : "preset";
}

/** No override preserves the existing desktop, phone and custom-theme sizes. */
export function normalizeChatWidgetButtonSize(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(32, Math.min(96, Math.round(value))) : null;
}

export function normalizeChatWidgetColor(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
export type ConversationMessageStyle = "classic" | "bubble";
export type ConversationAvatarShape = "circle" | "square";
export type TrackerPanelSide = "left" | "right";
export type TrackerThoughtBubbleDisplay = "inline" | "floating";
export type TrackerStatDisplayMode = "bars" | "gauges";
const TRACKER_TEMPERATURE_UNITS = ["celsius", "fahrenheit"] as const;
export type TrackerTemperatureUnit = (typeof TRACKER_TEMPERATURE_UNITS)[number];
export const QUICK_REPLIES_SETTINGS_CONTROL_ID = "quick-replies" as const;
const TRACKER_PANEL_SIZE_PROFILES = ["compact", "standard", "expanded"] as const;
export type TrackerPanelSizeProfile = (typeof TRACKER_PANEL_SIZE_PROFILES)[number];
export type TrackerDataPanelSection = "world" | "persona" | "characters" | "inventory" | "quests" | "custom";
export type TrackerPanelCollapsedSections = Partial<Record<TrackerDataPanelSection, boolean>>;
type TrackerPanelSectionOrder = TrackerDataPanelSection[];
export type RoleplayAvatarStyle = "none" | "circles" | "rectangles" | "panel";
export type RoleplayChatPosition = "left" | "center" | "right";

/** Stale or unknown synced values fall back to the centred layout. */
function normalizeRoleplayChatPosition(value: unknown): RoleplayChatPosition {
  return value === "left" || value === "right" ? value : "center";
}
/** How much of the chat list shows each chat's background as a row banner. */
export type ChatListBackgroundMode = "hover" | "always" | "off";
type SummaryPopoverSourceMode = "last" | "range";
export const DEFAULT_ROLEPLAY_BACKGROUND_URL = "/api/backgrounds/file/Black.jpg";
const DEFAULT_CONVERSATION_BACKGROUND_IMAGE_OPACITY = 45;

export function normalizeConversationBackgroundImageOpacity(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : DEFAULT_CONVERSATION_BACKGROUND_IMAGE_OPACITY;
}
interface SummaryPopoverSettings {
  sourceMode: SummaryPopoverSourceMode;
  contextSize: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  hideSummarisedMessages: boolean;
  collapseHiddenMessages: boolean;
}
interface PendingSpatialMapDraftReview {
  chatId: string;
  result?: GenerateSpatialMapDraftResponse;
  source: "game_setup";
  mode?: "ai" | "template";
  /** Opaque package-owned selection handed from a capability setup surface to its review surface. */
  selection?: unknown;
}

export const SIDEBAR_WIDTH_MIN = 240;
export const SIDEBAR_WIDTH_MAX = 480;
export const RIGHT_PANEL_WIDTH_MIN = 280;
export const RIGHT_PANEL_WIDTH_MAX = 520;
const TRACKER_PANEL_SIZE_PROFILE_WIDTHS: Record<TrackerPanelSizeProfile, number> = {
  compact: 280,
  standard: 340,
  expanded: 420,
};

interface ImmediateUiStorageSnapshot {
  customCursorEnabled: boolean | undefined;
}

function readImmediateUiStorageSnapshot(value: string | null): ImmediateUiStorageSnapshot {
  if (!value) {
    return {
      customCursorEnabled: undefined,
    };
  }

  try {
    const parsed = JSON.parse(value) as {
      state?: {
        customCursorEnabled?: unknown;
      };
    };
    return {
      customCursorEnabled:
        typeof parsed.state?.customCursorEnabled === "boolean" ? parsed.state.customCursorEnabled : undefined,
    };
  } catch {
    return {
      customCursorEnabled: undefined,
    };
  }
}

function shouldFlushUiStorageImmediately(previousValue: string | null, nextValue: string): boolean {
  const previous = readImmediateUiStorageSnapshot(previousValue);
  const next = readImmediateUiStorageSnapshot(nextValue);
  return previous.customCursorEnabled !== next.customCursorEnabled;
}
const TRACKER_PANEL_WIDTH_DEFAULT = TRACKER_PANEL_SIZE_PROFILE_WIDTHS.standard;
const TRACKER_PANEL_WIDTH_MIN = TRACKER_PANEL_SIZE_PROFILE_WIDTHS.compact;
const TRACKER_PANEL_WIDTH_MAX = TRACKER_PANEL_SIZE_PROFILE_WIDTHS.expanded;
export const TRACKER_PANEL_DEFAULT_BACKGROUND_COLOR = "#09090b";
const DEFAULT_APP_BACKGROUND_DARK = "#050312";
const DEFAULT_APP_BACKGROUND_LIGHT = "#faf8ff";
const DEFAULT_APP_BACKGROUNDS = new Set([DEFAULT_APP_BACKGROUND_DARK, DEFAULT_APP_BACKGROUND_LIGHT]);
const LEGACY_DEFAULT_APP_ACCENTS = new Set(["#d4d4d4", "#1a1025"]);
const DEFAULT_CHAT_TEXT_DARK = "#d4d4d4";
const DEFAULT_CHAT_TEXT_LIGHT = "#1a1025";
const DEFAULT_CHAT_CHROME_TEXT_DARK = "#d4d4d4";
const DEFAULT_CHAT_CHROME_TEXT_LIGHT = "#1a1025";
const IMAGE_DIMENSION_MIN = 64;
const IMAGE_DIMENSION_MAX = 4096;
export const TRACKER_DATA_PANEL_SECTIONS: TrackerDataPanelSection[] = [
  "world",
  "persona",
  "characters",
  "quests",
  "inventory",
  "custom",
];
const LEGACY_TRACKER_DATA_PANEL_SECTIONS: TrackerDataPanelSection[] = [
  "world",
  "persona",
  "characters",
  "inventory",
  "quests",
  "custom",
];
const ROLEPLAY_AVATAR_SCALE_MIN = 0.75;
const ROLEPLAY_AVATAR_SCALE_MAX = 2.5;
const ROLEPLAY_SPRITE_SCALE_MIN = 0.5;
const ROLEPLAY_SPRITE_SCALE_MAX = 1.75;

const DEFAULT_SUMMARY_POPOVER_SETTINGS: SummaryPopoverSettings = {
  sourceMode: "last",
  contextSize: null,
  rangeStart: null,
  rangeEnd: null,
  hideSummarisedMessages: false,
  collapseHiddenMessages: false,
};
const DEFAULT_SCENE_PROMPT_PREFERENCES: ScenePromptPreferences = {
  pov: "third_person",
  tense: "present",
  extraInstructions: "",
};

export function getDefaultAppAccentColor() {
  return "#7394bd";
}

export function getDefaultAppBackgroundColor(theme: "dark" | "light") {
  return theme === "light" ? DEFAULT_APP_BACKGROUND_LIGHT : DEFAULT_APP_BACKGROUND_DARK;
}

export function getDefaultChatTextColor(theme: "dark" | "light") {
  return theme === "light" ? DEFAULT_CHAT_TEXT_LIGHT : DEFAULT_CHAT_TEXT_DARK;
}

export function getDefaultChatChromeTextColor(theme: "dark" | "light") {
  return theme === "light" ? DEFAULT_CHAT_CHROME_TEXT_LIGHT : DEFAULT_CHAT_CHROME_TEXT_DARK;
}

function normalizeCharacterLibrarySort(value: unknown): CharacterLibrarySort {
  return CHARACTER_LIBRARY_SORT_OPTIONS.includes(value as CharacterLibrarySort)
    ? (value as CharacterLibrarySort)
    : "name-asc";
}

function normalizeCharacterPanelFavoriteFilter(value: unknown): CharacterPanelFavoriteFilter {
  return CHARACTER_PANEL_FAVORITE_FILTER_OPTIONS.includes(value as CharacterPanelFavoriteFilter)
    ? (value as CharacterPanelFavoriteFilter)
    : "all";
}

function normalizeLorebookPanelCategory(value: unknown): LorebookPanelCategory {
  return LOREBOOK_PANEL_CATEGORY_OPTIONS.includes(value as LorebookPanelCategory)
    ? (value as LorebookPanelCategory)
    : "all";
}

function normalizeLorebookPanelSort(value: unknown): LorebookPanelSort {
  return LOREBOOK_PANEL_SORT_OPTIONS.includes(value as LorebookPanelSort) ? (value as LorebookPanelSort) : "name-asc";
}

function normalizePanelText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizePanelStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeScrollTop(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

let mobileShellQuery: MediaQueryList | null = null;

export function isMobileShellViewport(): boolean {
  if (typeof window === "undefined") return false;
  mobileShellQuery ??= window.matchMedia(MOBILE_SHELL_MEDIA_QUERY);
  if (mobileShellQuery.matches) return true;
  const { sidebarWidth, rightPanelWidth } = useUIStore.getState();
  // Reserve both docked widths plus room for the topbar controls. Checking
  // capacity, not open panels, avoids layout flips while switching sidebars.
  return window.innerWidth < 2 * (rightPanelWidth || sidebarWidth) + 384;
}

function dismissChatFloatingUiForMobilePanel(open: boolean) {
  if (open && isMobileShellViewport()) announceChatFloatingUiDismiss();
}

function normalizeAppAccentColor(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return LEGACY_DEFAULT_APP_ACCENTS.has(normalized.toLowerCase()) ? "" : normalized;
}

function normalizeAppBackgroundColor(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return DEFAULT_APP_BACKGROUNDS.has(normalized.toLowerCase()) ? "" : normalized;
}

function normalizeChatChromeTextColor(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampImageDimension(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.max(IMAGE_DIMENSION_MIN, Math.min(IMAGE_DIMENSION_MAX, rounded));
}

function clampTrackerPanelWidth(value: unknown) {
  const width = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : TRACKER_PANEL_WIDTH_DEFAULT;
  return Math.max(TRACKER_PANEL_WIDTH_MIN, Math.min(TRACKER_PANEL_WIDTH_MAX, width));
}

export function getTrackerPanelWidthForProfile(profile: TrackerPanelSizeProfile) {
  return TRACKER_PANEL_SIZE_PROFILE_WIDTHS[profile] ?? TRACKER_PANEL_SIZE_PROFILE_WIDTHS.standard;
}

export function normalizeTrackerPanelSizeProfile(value: unknown, legacyWidth?: unknown): TrackerPanelSizeProfile {
  if (TRACKER_PANEL_SIZE_PROFILES.includes(value as TrackerPanelSizeProfile)) {
    return value as TrackerPanelSizeProfile;
  }

  const width =
    typeof legacyWidth === "number" && Number.isFinite(legacyWidth) ? clampTrackerPanelWidth(legacyWidth) : null;
  if (width !== null) {
    if (width <= 300) return "compact";
    if (width >= 380) return "expanded";
  }

  return "standard";
}

export function normalizeTrackerPanelCollapsedSections(value: unknown): TrackerPanelCollapsedSections {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const collapsed: TrackerPanelCollapsedSections = {};
  for (const section of TRACKER_DATA_PANEL_SECTIONS) {
    if (raw[section] === true) collapsed[section] = true;
  }
  return collapsed;
}

export function normalizeTrackerPanelSectionOrder(value: unknown): TrackerPanelSectionOrder {
  const order: TrackerPanelSectionOrder = [];
  const seen = new Set<TrackerDataPanelSection>();
  const raw = Array.isArray(value) ? value : [];

  for (const section of raw) {
    if (!TRACKER_DATA_PANEL_SECTIONS.includes(section as TrackerDataPanelSection)) continue;
    const validSection = section as TrackerDataPanelSection;
    if (seen.has(validSection)) continue;
    seen.add(validSection);
    order.push(validSection);
  }

  for (const section of TRACKER_DATA_PANEL_SECTIONS) {
    if (!seen.has(section)) order.push(section);
  }

  if (order.every((section, index) => section === LEGACY_TRACKER_DATA_PANEL_SECTIONS[index])) {
    return [...TRACKER_DATA_PANEL_SECTIONS];
  }

  const inventoryIndex = order.indexOf("inventory");
  const customIndex = order.indexOf("custom");
  if (inventoryIndex >= 0 && customIndex >= 0 && inventoryIndex > customIndex) {
    order.splice(inventoryIndex, 1);
    order.splice(customIndex, 0, "inventory");
  }

  return order;
}

function normalizeSummaryPopoverSettings(value: unknown): SummaryPopoverSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const numberOrNull = (next: unknown) => (typeof next === "number" && Number.isFinite(next) ? Math.round(next) : null);

  return {
    sourceMode: raw.sourceMode === "range" ? "range" : "last",
    contextSize: numberOrNull(raw.contextSize),
    rangeStart: numberOrNull(raw.rangeStart),
    rangeEnd: numberOrNull(raw.rangeEnd),
    hideSummarisedMessages: raw.hideSummarisedMessages === true,
    collapseHiddenMessages: raw.collapseHiddenMessages === true,
  };
}

export function normalizeScenePromptPreferences(value: unknown): ScenePromptPreferences {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const pov =
    raw.pov === "first_person" || raw.pov === "second_person" || raw.pov === "third_person"
      ? raw.pov
      : DEFAULT_SCENE_PROMPT_PREFERENCES.pov;
  const tense =
    raw.tense === "past" || raw.tense === "present" || raw.tense === "future"
      ? raw.tense
      : DEFAULT_SCENE_PROMPT_PREFERENCES.tense;
  const extraInstructions =
    typeof raw.extraInstructions === "string" ? raw.extraInstructions.trim().slice(0, 2000) : "";
  const promptPresetId = typeof raw.promptPresetId === "string" ? raw.promptPresetId.trim() || null : null;
  return { pov, tense, extraInstructions, promptPresetId };
}

function normalizeConversationMessageStyle(value: unknown): ConversationMessageStyle {
  return value === "bubble" || value === "classic" ? value : "classic";
}

function normalizeConversationAvatarShape(value: unknown): ConversationAvatarShape {
  return value === "square" ? "square" : "circle";
}

export function normalizeTrackerThoughtBubbleDisplay(value: unknown): TrackerThoughtBubbleDisplay {
  return value === "inline" || value === "floating" ? value : "inline";
}

export function normalizeTrackerStatDisplayMode(value: unknown): TrackerStatDisplayMode {
  return value === "gauges" ? "gauges" : "bars";
}

export function normalizeTrackerTemperatureUnit(value: unknown): TrackerTemperatureUnit {
  return TRACKER_TEMPERATURE_UNITS.includes(value as TrackerTemperatureUnit)
    ? (value as TrackerTemperatureUnit)
    : "celsius";
}

function normalizeTrackerPanelBackgroundColor(value: unknown) {
  if (typeof value !== "string") return TRACKER_PANEL_DEFAULT_BACKGROUND_COLOR;
  return value.trim() || TRACKER_PANEL_DEFAULT_BACKGROUND_COLOR;
}

function normalizeDefaultRoleplayBackground(value: unknown) {
  if (typeof value !== "string") return DEFAULT_ROLEPLAY_BACKGROUND_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ROLEPLAY_BACKGROUND_URL;
  if (trimmed.startsWith("/api/backgrounds/file/")) return trimmed;
  if (trimmed.startsWith("/") || /^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `/api/backgrounds/file/${encodeURIComponent(trimmed)}`;
}

/** Legacy browser-local custom theme preserved for one-time migration. */
interface CustomTheme {
  id: string;
  name: string;
  /** Raw CSS that gets injected as a <style> tag */
  css: string;
  /** When this theme was installed */
  installedAt: string;
}

/** A user-defined quick reply that sends a fixed prompt, macro, or slash command. */
interface CustomQuickReply {
  id: string;
  label: string;
  content: string;
  /** Emoji shown on the compact Roleplay quick-reply rail. */
  icon?: string;
}

type MariPanelSortMode = "az" | "za" | "newest" | "oldest";
type MariEditViewMode = "easy" | "raw";

interface UIState {
  /** Transient: the initial cross-device settings fetch has settled. */
  settingsSyncReady: boolean;
  showHomeBrowserAddressBar: boolean;
  showHomeBrowserDesktopBookmarksOnOtherTabs: boolean;
  showHomeBrowserMobileBookmarksOnOtherTabs: boolean;
  sidebarOpen: boolean;
  sidebarWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  rightPanel: Panel;
  trackerPanelEnabled: boolean;
  /** Whether the current chat shows the Tracker Panel. */
  trackerPanelOpen: boolean;
  trackerPanelOpenByChatId: Record<string, boolean>;
  trackerPanelSide: TrackerPanelSide;
  trackerPanelHideHudWidgets: boolean;
  trackerPanelUseExpressionSprites: boolean;
  trackerPanelThoughtBubbleDisplay: TrackerThoughtBubbleDisplay;
  trackerStatDisplayMode: TrackerStatDisplayMode;
  trackerPanelDockedThoughtsAlwaysVisible: boolean;
  trackerPanelSizeProfile: TrackerPanelSizeProfile;
  trackerPanelBackgroundColor: string;
  trackerTemperatureUnit: TrackerTemperatureUnit;
  trackerPanelCollapsedSections: TrackerPanelCollapsedSections;
  trackerPanelSectionOrder: TrackerPanelSectionOrder;
  settingsTab: string;
  /** Transient control id that the Settings panel should reveal and focus. */
  settingsTargetControlId: string | null;
  modal: { type: string; props?: Record<string, unknown> } | null;
  theme: "dark" | "light";
  appBackgroundColor: string;
  appAccentColor: string;
  appAccentPulseMode: boolean;
  appAccentRgbMode: boolean;
  customCursorEnabled: boolean;
  reduceAmbientEffects: boolean;
  mariPanelSortMode: MariPanelSortMode;
  mariEditViewMode: MariEditViewMode;
  chatBackground: string | null;
  /** Default background applied when a Roleplay chat has no saved background yet. */
  defaultRoleplayBackground: string;
  /** Native blur applied to selected chat/game background images, in px. */
  chatBackgroundBlur: number;
  /** Persisted opacity applied to conversation background images, as a percentage. */
  conversationBackgroundImageOpacity: number;
  /** When set, the main area shows the full-page character editor instead of chat */
  characterDetailId: string | null;
  /** When set, the main area shows the full-page lorebook editor instead of chat */
  lorebookDetailId: string | null;
  /** In-app clipboard, intentionally not persisted or synced between devices. */
  lorebookLinkClipboard: { characterIds: string[]; personaIds: string[] } | null;
  /** When set, the main area shows the full-page preset editor instead of chat */
  presetDetailId: string | null;
  /** One-shot tab the preset editor should open to. */
  presetDetailInitialTab: string | null;
  /** When set, the main area shows the full-page connection editor instead of chat */
  connectionDetailId: string | null;
  /** When set, the main area shows the full-page agent editor. Value is the agent *type* id (e.g. "world-state") */
  agentDetailId: string | null;
  /** When set, the main area shows the full-page tool editor */
  toolDetailId: string | null;
  /** When set, the main area shows the full-page persona editor */
  personaDetailId: string | null;
  /** When set, the main area shows the full-page regex script editor */
  regexDetailId: string | null;
  /** When set, the main area shows the hierarchical map editor for this chat */
  spatialMapDetailChatId: string | null;
  /** One-shot generated map preview handed from Game setup into the spatial editor. Never persisted. */
  pendingSpatialMapDraftReview: PendingSpatialMapDraftReview | null;
  /** Pre-selected target characters for a NEW regex script opened via openRegexDetail("__new__") */
  regexDetailDefaultCharacterIds: string[] | null;
  /** Pre-selected preset targets when adding a script from a preset's Regex tab. */
  regexDetailDefaultPresetIds: string[] | null;
  /** Where to return when the regex editor closes — e.g. back to a character's Advanced tab */
  regexDetailReturn: ({ characterId: string; tab?: string } | { presetId: string }) | null;
  /** One-shot tab the character editor should open to (set by the regex-editor return path) */
  characterDetailInitialTab: string | null;
  /** One-shot tab the lorebook editor should open to. */
  lorebookDetailInitialTab: string | null;
  /** One-shot entry the lorebook editor should open expanded. */
  lorebookDetailInitialEntryId: string | null;
  /** One-shot tab the persona editor should open to. */
  personaDetailInitialTab: string | null;
  /** When true, the main area shows the full-page character library */
  characterLibraryOpen: boolean;
  /** Which resource collection the shared full-page card library displays */
  cardLibraryKind: CardLibraryKind;
  /** When true, the main area shows the full-page downloadable agent catalog */
  agentCatalogOpen: boolean;
  /** Optional package selected when opening the downloadable agent catalog */
  agentCatalogInitialPackageId: string | null;
  /** Last selected character card inside the full-page character library */
  characterLibrarySelectedId: string | null;
  /** Optional card to reveal when opening from a library shortcut; not persisted. */
  characterLibraryInitialId: string | null;
  /** Last selected persona card inside the full-page card library */
  personaLibrarySelectedId: string | null;
  /** Last selected sort order for character lists and the full-page character library */
  characterLibrarySort: CharacterLibrarySort;
  /** Last selected sort order for the full-page persona library */
  personaLibrarySort: ResourcePanelSort;
  /** Search text for the compact Characters panel */
  characterPanelSearch: string;
  /** Included tag filters for the compact Characters panel */
  characterPanelIncludedTags: string[];
  /** Excluded tag filters for the compact Characters panel */
  characterPanelExcludedTags: string[];
  /** Whether the compact Characters panel tag filter shelf is expanded */
  characterPanelTagsExpanded: boolean;
  /** Favorite filter for the compact Characters panel */
  characterPanelFavoriteFilter: CharacterPanelFavoriteFilter;
  /** Last scroll offset for the compact Characters panel */
  characterPanelScrollTop: number;
  /** Last scroll offset for the full-page Character Library list */
  characterLibraryScrollTop: number;
  /** Last scroll offset for the full-page Persona Library list */
  personaLibraryScrollTop: number;
  /** Selected category for the compact Lorebooks panel */
  lorebookPanelCategory: LorebookPanelCategory;
  /** Search text for the compact Lorebooks panel */
  lorebookPanelSearch: string;
  /** Sort order for the compact Lorebooks panel */
  lorebookPanelSort: LorebookPanelSort;
  /** Selected tag filter for the compact Lorebooks panel */
  lorebookPanelActiveTag: string | null;
  /** Whether the compact Lorebooks panel tag/category shelf is expanded */
  lorebookPanelTagsExpanded: boolean;
  /** Sort order for imported characters in the Browser panel */
  /** Sort order for the compact Presets panel */
  presetPanelSort: ResourcePanelSort;
  /** Sort order for the compact Connections panel */
  connectionPanelSort: ConnectionPanelSort;
  /** Sort order for the compact Agents panel */
  agentPanelSort: ResourcePanelSort;
  /** True when any open detail editor has unsaved changes */
  editorDirty: boolean;
  /** Mobile-only return target for detail editors opened from a right panel */
  detailReturnRightPanel: Panel | null;

  // ── Settings (persisted) ──
  fontSize: FontSize;
  language: AppLanguage;
  /** Font size for chat messages (px) */
  chatFontSize: number;
  /** Custom font family name (empty = default Inter) */
  fontFamily: string;
  chatWidgetPreset: ChatWidgetPreset;
  chatWidgetFont: string;
  chatWidgetShape: ChatWidgetShape;
  chatWidgetButtonSize: number | null;
  chatWidgetBorderColor: string;
  chatWidgetBackgroundColor: string;
  chatWidgetTextColor: string;
  chatWidgetApplyFont: boolean;
  chatWidgetApplyShape: boolean;
  chatWidgetApplyColors: boolean;
  enableStreaming: boolean;
  debugMode: boolean;
  /** When true, warn when an agent uses the configured default connection. */
  showPaidAgentConnectionWarning: boolean;
  /** Typewriter speed: 1 (very slow) to 100 (instant). Controls how fast streaming tokens appear. */
  streamingSpeed: number;
  /**
   * Chat-list row banners. "hover" (default) paints the active and hovered rows; touch
   * devices have no hover, so there it means the active row only. "always" paints every
   * row — more images decoded at once, though the sidebar requests downscaled copies.
   */
  chatListBackgrounds: ChatListBackgroundMode;
  /** When true, image generation requests are sent one at a time for providers that reject concurrent jobs. */
  queueImageGenerationRequests: boolean;
  /** When true, generated image prompts are shown for review before supported provider calls are sent. */
  reviewImagePromptsBeforeSend: boolean;
  autoSaveGeneratedImagesToGalleries: boolean;
  imageBackgroundWidth: number;
  imageBackgroundHeight: number;
  imageIllustrationWidth: number;
  imageIllustrationHeight: number;
  imageGameWidth: number;
  imageGameHeight: number;
  imagePortraitWidth: number;
  imagePortraitHeight: number;
  imageCharacterSheetWidth: number;
  imageCharacterSheetHeight: number;
  imageSelfieWidth: number;
  imageSelfieHeight: number;
  imageStyleProfiles: ImageStyleProfileSettings;

  conversationMessageStyle: ConversationMessageStyle;
  alwaysDisplayConversationSwipeMenu: boolean;
  alwaysDisplayRoleplaySwipeMenu: boolean;
  conversationAvatarShape: ConversationAvatarShape;
  showTimestamps: boolean;
  showModelName: boolean;
  showTokenUsage: boolean;
  showContextUsage: boolean;
  showMessageNumbers: boolean;
  /** When true, character cards are available in Persona pickers. */
  showCharactersInPersonaPickers: boolean;
  guideGenerations: boolean;
  /** When true, guided regeneration leaves its guidance in the composer instead of clearing it. */
  keepGuidanceAfterRegenerate: boolean;
  showQuickRepliesMenu: boolean;
  showQuickReplyPostOnly: boolean;
  showQuickReplyGuide: boolean;
  showQuickReplyImpersonate: boolean;
  /** User-defined quick replies that send a fixed prompt, macro, or slash command. */
  customQuickReplies: CustomQuickReply[];
  /** Remembered expand/collapse state of Chat Settings sections, keyed by section id. */
  chatSettingsExpandedSections: Record<string, boolean>;
  confirmBeforeDelete: boolean;
  /** When true, chat exports include saved thinking/reasoning metadata. */
  includeReasoningInExports: boolean;
  /** When true, chat exports include private message notes. */
  includePrivateNotesInExports: boolean;
  /** Number of messages to load per page (0 = load all) */
  messagesPerPage: number;
  /** Bold quoted dialogue in chat messages; color highlighting can still remain when this is off */
  boldDialogue: boolean;
  /** When true, character names and aliases are colored in chat prose using the character's nameColor. */
  colorInlineNames: boolean;
  /** When true, inline name coloring uses the first solid color from gradients instead of rendering the gradient. */
  disableInlineNameGradients: boolean;
  /** Preferred quote style applied to AI output and user input. */
  quoteFormat: QuoteFormat;
  /** When true, common LaTeX symbol commands render as plain Unicode symbols in chat text. */
  convertLatexSymbols: boolean;
  /** When true, model responses are trimmed back to the last complete sentence before saving. */
  trimIncompleteModelOutput: boolean;
  /** When true, /continue separates appended text with a blank line. */
  continueAddsNewline: boolean;
  /** When true, chat inputs show a microphone button for browser speech-to-text dictation. */
  speechToTextEnabled: boolean;
  /** User-set TTS line playback volume (0-100). */
  ttsLineVolume: number;
  /** When true, allow the rare Chibi Professor Mari scroll toast. */
  chibiProfessorMariEnabled: boolean;
  /** When true, Professor Mari shows generated suggestion chips and guided-plan options. */
  professorMariSuggestionsEnabled: boolean;
  /** When true, Professor Mari's deterministic Home navigator is available. */
  professorMariNavigationEnabled: boolean;
  /** User-set Conversation Call character voice volume (0–100). */
  conversationCallVoiceVolume: number;
  /** When true, mute character voices in Conversation Calls. */
  conversationCallVoiceMuted: boolean;
  /** When true, Roleplay and Conversation modes support arrow-key and touch-swipe navigation between message swipes. */
  intuitiveSwipeNavigation: boolean;
  /** When true, moving past the newest swipe on the latest assistant message creates a new reroll. */
  intuitiveSwipeRerollLatest: boolean;
  /** When true, pressing Up Arrow with an empty chat input opens the last user message for editing (Conversation/Roleplay). */
  editLastMessageOnArrowUp: boolean;
  /** When true, double-clicking or double-tapping a Roleplay message opens it for editing. */
  editMessageOnDoubleClick: boolean;
  /** Persisted controls shown in the Chat Summary popover settings window. */
  summaryPopoverSettings: SummaryPopoverSettings;
  /** Last-used preferences for generating character/user-initiated roleplay scenes. */
  scenePromptPreferences: ScenePromptPreferences;
  /** A package thread the Home browser should open once: where a scene came from. Not persisted. */
  sceneOriginFocus: ScenePackageOrigin | null;

  // ── Text Appearance ──
  /** Color for chat message text (empty = theme default) */
  chatFontColor: string;
  /** Default dialogue highlight color for cards without one (empty = theme default) */
  defaultDialogueColor: string;
  /** Color for non-action chrome copy in tracker widgets, folder labels, settings descriptors, and popovers (empty = scheme default) */
  chatChromeTextColor: string;
  /** Opacity for roleplay message backgrounds (0–100) */
  chatFontOpacity: number;
  /** When true, flatten expensive Roleplay paint effects for smoother navigation. */
  roleplayReducedPaintEffects: boolean;
  /** When true, show saved and streaming model reasoning inside Roleplay message bubbles. */
  showRoleplayThinkingInMessages: boolean;
  /** When true, inline Roleplay reasoning stays expanded until the user collapses it. */
  keepRoleplayThinkingExpanded: boolean;
  /** Layout style for roleplay message avatars */
  roleplayAvatarStyle: RoleplayAvatarStyle;
  /** Scale multiplier for Roleplay message avatars. */
  roleplayAvatarScale: number;
  /** When true, Roleplay message avatars stay visible while scrolling through long messages. */
  roleplayAvatarsScrollable: boolean;
  /** When true, merged-group Narrator avatars cycle instead of appearing together. */
  roleplayNarratorAvatarCycling: boolean;
  /** Default scale multiplier for Roleplay full-body sprites. */
  roleplaySpriteScale: number;
  /** Default presentation for Roleplay chats without a saved choice. */
  roleplayDisplayStyle: "classic" | "visual-novel";
  /** Where the Roleplay messages and input sit on wide screens. Phones always use the full width. */
  roleplayChatPosition: RoleplayChatPosition;
  roleplayVnAutoPlay: boolean;
  roleplayVnAutoPlayDelay: number;
  roleplayVnPortraitScale: number;
  roleplayVnSpriteScale: number;
  /** Text outline/stroke width in px (0 = off) */
  textStrokeWidth: number;
  /** Text outline/stroke color */
  textStrokeColor: string;

  // ── Visual Theme ──
  visualTheme: VisualTheme;

  // ── Conversation Gradient (per color-scheme) ──
  convoGradient: {
    dark: { from: string; to: string };
    light: { from: string; to: string };
  };

  // ── Sound ──
  convoNotificationSound: boolean;
  rpNotificationSound: boolean;
  notificationSoundsOnlyWhenUnfocused: boolean;
  notificationPosition: "top" | "bottom";
  chatWizardDefaults: Partial<Record<ChatWizardMode, ChatWizardDefaults>>;
  conversationBrowserNotifications: boolean;
  conversationMobileNotifications: boolean;
  generationBrowserNotifications: boolean;
  generationMobileNotifications: boolean;

  // ── Custom Conversation Prompt ──
  /** User's custom default system prompt for new conversations (null = built-in default). */
  customConversationPrompt: string | null;

  // ── Input ──
  enterToSendRP: boolean;
  enterToSendConvo: boolean;

  // ── Roleplay Effects ──
  weatherEffects: boolean;

  // ── Legacy Custom Themes ──
  /** Legacy active custom theme id (null = built-in default). Migration only. */
  activeCustomTheme: string | null;
  /** Legacy browser-local custom themes. Migration only. */
  customThemes: CustomTheme[];
  /** True once legacy browser-local themes have been migrated to the server. */
  hasMigratedCustomThemesToServer: boolean;

  // ── Onboarding ──
  hasCompletedOnboarding: boolean;
  /** Chat modes whose first-chat help overlay has already been dismissed. */
  chatHelpSeenModes: ChatModeShortcut[];
  /** Removes the chat Help button and suppresses automatic help overlays. */
  chatHelpButtonHidden: boolean;

  // ── Dismissals ──
  linkApiBannerDismissed: boolean;

  // ── EchoChamber ──
  echoChamberOpen: boolean;

  // ── Impersonate Settings ──
  /** Custom prompt template for /impersonate (empty = use server default). Persisted. */
  impersonatePromptTemplate: string;
  /** Saved template loaded into the working impersonate prompt, or null for the built-in default. Persisted. */
  activeImpersonatePromptTemplateId: string | null;
  /** When true, CYOA choices generate impersonate requests instead of normal user messages. Persisted. */
  impersonateCyoaChoices: boolean;
  /** Override preset used when impersonating (null = use chat default). Persisted. */
  impersonatePresetId: string | null;
  /** Override connection used when impersonating (null = use chat default). Persisted. */
  impersonateConnectionId: string | null;
  /** When true, suppress agent pipeline during impersonate. Persisted. */
  impersonateBlockAgents: boolean;

  /** Transient: true when center content area is too narrow (overflow detected) */
  centerCompact: boolean;
  /** Transient request for the chat sidebar to focus a fixed mode shortcut. */
  chatModeShortcutRequest: { mode: ChatModeShortcut; token: number } | null;

  // Actions
  setShowHomeBrowserAddressBar: (visible: boolean) => void;
  setShowHomeBrowserDesktopBookmarksOnOtherTabs: (visible: boolean) => void;
  setShowHomeBrowserMobileBookmarksOnOtherTabs: (visible: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleTrackerPanel: (chatId?: string | null) => void;
  setTrackerPanelEnabled: (enabled: boolean) => void;
  setTrackerPanelOpen: (open: boolean, chatId?: string | null) => void;
  restoreTrackerPanelOpenForChat: (chatId: string | null) => void;
  setTrackerPanelSide: (side: TrackerPanelSide) => void;
  setTrackerPanelHideHudWidgets: (hidden: boolean) => void;
  setTrackerPanelUseExpressionSprites: (enabled: boolean) => void;
  setTrackerPanelThoughtBubbleDisplay: (display: TrackerThoughtBubbleDisplay) => void;
  setTrackerStatDisplayMode: (display: TrackerStatDisplayMode) => void;
  setTrackerPanelDockedThoughtsAlwaysVisible: (visible: boolean) => void;
  setTrackerPanelSizeProfile: (profile: TrackerPanelSizeProfile) => void;
  setTrackerPanelBackgroundColor: (color: string) => void;
  setTrackerTemperatureUnit: (unit: TrackerTemperatureUnit) => void;
  setTrackerPanelSectionOrder: (order: TrackerPanelSectionOrder) => void;
  toggleTrackerPanelSectionCollapsed: (section: TrackerDataPanelSection) => void;
  openRightPanel: (panel: Panel) => void;
  closeRightPanel: () => void;
  toggleRightPanel: (panel: Panel) => void;
  setSettingsTab: (tab: string) => void;
  setSettingsTargetControlId: (controlId: string | null) => void;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setAppBackgroundColor: (color: string) => void;
  setAppAccentColor: (color: string) => void;
  setAppAccentPulseMode: (enabled: boolean) => void;
  setAppAccentRgbMode: (enabled: boolean) => void;
  setCustomCursorEnabled: (enabled: boolean) => void;
  setReduceAmbientEffects: (enabled: boolean) => void;
  setMariPanelSortMode: (mode: MariPanelSortMode) => void;
  setMariEditViewMode: (mode: MariEditViewMode) => void;
  setChatBackground: (url: string | null) => void;
  setDefaultRoleplayBackground: (url: string) => void;
  setChatBackgroundBlur: (v: number) => void;
  setConversationBackgroundImageOpacity: (v: number) => void;
  setCharacterLibrarySelectedId: (id: string | null) => void;
  setPersonaLibrarySelectedId: (id: string | null) => void;
  setCharacterLibrarySort: (sort: CharacterLibrarySort) => void;
  setPersonaLibrarySort: (sort: ResourcePanelSort) => void;
  setCharacterPanelSearch: (search: string) => void;
  setCharacterPanelIncludedTags: (tags: string[]) => void;
  setCharacterPanelExcludedTags: (tags: string[]) => void;
  setCharacterPanelTagsExpanded: (expanded: boolean) => void;
  setCharacterPanelFavoriteFilter: (filter: CharacterPanelFavoriteFilter) => void;
  setCharacterPanelScrollTop: (scrollTop: number) => void;
  setCharacterLibraryScrollTop: (scrollTop: number) => void;
  setPersonaLibraryScrollTop: (scrollTop: number) => void;
  setLorebookPanelCategory: (category: LorebookPanelCategory) => void;
  setLorebookPanelSearch: (search: string) => void;
  setLorebookPanelSort: (sort: LorebookPanelSort) => void;
  setLorebookPanelActiveTag: (tag: string | null) => void;
  setLorebookPanelTagsExpanded: (expanded: boolean) => void;
  setPresetPanelSort: (sort: ResourcePanelSort) => void;
  setConnectionPanelSort: (sort: ConnectionPanelSort) => void;
  setAgentPanelSort: (sort: ResourcePanelSort) => void;
  openCharacterDetail: (id: string, options?: { preserveCharacterLibrary?: boolean; initialTab?: string }) => void;
  closeCharacterDetail: () => void;
  openLorebookDetail: (id: string, options?: { initialTab?: string; entryId?: string }) => void;
  closeLorebookDetail: () => void;
  setLorebookLinkClipboard: (links: NonNullable<UIState["lorebookLinkClipboard"]>) => void;
  openPresetDetail: (id: string, options?: { initialTab?: string }) => void;
  closePresetDetail: () => void;
  openConnectionDetail: (id: string) => void;
  closeConnectionDetail: () => void;
  openAgentDetail: (agentType: string) => void;
  closeAgentDetail: () => void;
  openToolDetail: (id: string) => void;
  closeToolDetail: () => void;
  openPersonaDetail: (id: string, options?: { preservePersonaLibrary?: boolean; initialTab?: string }) => void;
  closePersonaDetail: () => void;
  openRegexDetail: (
    id: string,
    options?: {
      defaultCharacterIds?: string[];
      defaultPresetIds?: string[];
      returnTo?: { characterId: string; tab?: string } | { presetId: string };
    },
  ) => void;
  closeRegexDetail: () => void;
  openSpatialMapDetail: (chatId: string) => void;
  openSpatialMapDraftReview: (review: PendingSpatialMapDraftReview) => void;
  clearPendingSpatialMapDraftReview: () => void;
  closeSpatialMapDetail: () => void;
  openCharacterLibrary: (characterId?: string) => void;
  openPersonaLibrary: () => void;
  closeCharacterLibrary: () => void;
  openAgentCatalog: (packageId?: string) => void;
  closeAgentCatalog: () => void;

  /** Returns true if any full-page detail editor is currently open */
  hasAnyDetailOpen: () => boolean;
  /** Close all detail editors at once */
  closeAllDetails: () => void;
  /** Update the editor dirty flag (called by detail editors when their dirty state changes) */
  setEditorDirty: (dirty: boolean) => void;

  // Settings actions
  setFontSize: (size: FontSize) => void;
  setLanguage: (language: AppLanguage) => void;
  setChatFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setChatWidgetPreset: (preset: ChatWidgetPreset) => void;
  setChatWidgetFont: (font: string) => void;
  setChatWidgetShape: (shape: ChatWidgetShape) => void;
  setChatWidgetButtonSize: (size: number | null) => void;
  setChatWidgetBorderColor: (color: string) => void;
  setChatWidgetBackgroundColor: (color: string) => void;
  setChatWidgetTextColor: (color: string) => void;
  setChatWidgetApplyFont: (enabled: boolean) => void;
  setChatWidgetApplyShape: (enabled: boolean) => void;
  setChatWidgetApplyColors: (enabled: boolean) => void;
  setEnableStreaming: (v: boolean) => void;
  setDebugMode: (v: boolean) => void;
  setShowPaidAgentConnectionWarning: (v: boolean) => void;
  setStreamingSpeed: (v: number) => void;
  setChatListBackgrounds: (v: ChatListBackgroundMode) => void;
  setQueueImageGenerationRequests: (v: boolean) => void;
  setReviewImagePromptsBeforeSend: (v: boolean) => void;
  setAutoSaveGeneratedImagesToGalleries: (v: boolean) => void;
  setImageBackgroundDimensions: (width: number, height: number) => void;
  setImageIllustrationDimensions: (width: number, height: number) => void;
  setImageGameDimensions: (width: number, height: number) => void;
  setImagePortraitDimensions: (width: number, height: number) => void;
  setImageCharacterSheetDimensions: (width: number, height: number) => void;
  setImageSelfieDimensions: (width: number, height: number) => void;
  setImageStyleProfiles: (settings: ImageStyleProfileSettings) => void;

  setConversationMessageStyle: (v: ConversationMessageStyle) => void;
  setAlwaysDisplayConversationSwipeMenu: (v: boolean) => void;
  setAlwaysDisplayRoleplaySwipeMenu: (v: boolean) => void;
  setConversationAvatarShape: (v: ConversationAvatarShape) => void;
  setShowTimestamps: (v: boolean) => void;
  setShowModelName: (v: boolean) => void;
  setShowTokenUsage: (v: boolean) => void;
  setShowContextUsage: (v: boolean) => void;
  setShowMessageNumbers: (v: boolean) => void;
  setShowCharactersInPersonaPickers: (v: boolean) => void;
  setGuideGenerations: (v: boolean) => void;
  setKeepGuidanceAfterRegenerate: (v: boolean) => void;
  setShowQuickRepliesMenu: (v: boolean) => void;
  setShowQuickReplyPostOnly: (v: boolean) => void;
  setShowQuickReplyGuide: (v: boolean) => void;
  setShowQuickReplyImpersonate: (v: boolean) => void;
  addCustomQuickReply: (label: string, content: string) => void;
  updateCustomQuickReply: (id: string, patch: Partial<Omit<CustomQuickReply, "id">>) => void;
  removeCustomQuickReply: (id: string) => void;
  setChatSettingsSectionExpanded: (id: string, open: boolean) => void;
  setConfirmBeforeDelete: (v: boolean) => void;
  setIncludeReasoningInExports: (v: boolean) => void;
  setIncludePrivateNotesInExports: (v: boolean) => void;
  setMessagesPerPage: (n: number) => void;
  setBoldDialogue: (v: boolean) => void;
  setColorInlineNames: (v: boolean) => void;
  setDisableInlineNameGradients: (v: boolean) => void;
  setQuoteFormat: (v: QuoteFormat) => void;
  setConvertLatexSymbols: (v: boolean) => void;
  setTrimIncompleteModelOutput: (v: boolean) => void;
  setContinueAddsNewline: (v: boolean) => void;
  setSpeechToTextEnabled: (v: boolean) => void;
  setTTSLineVolume: (v: number) => void;
  setChibiProfessorMariEnabled: (v: boolean) => void;
  setProfessorMariSuggestionsEnabled: (v: boolean) => void;
  setProfessorMariNavigationEnabled: (v: boolean) => void;
  setConversationCallVoiceVolume: (v: number) => void;
  setConversationCallVoiceMuted: (v: boolean) => void;
  setIntuitiveSwipeNavigation: (v: boolean) => void;
  setIntuitiveSwipeRerollLatest: (v: boolean) => void;
  setEditLastMessageOnArrowUp: (v: boolean) => void;
  setEditMessageOnDoubleClick: (v: boolean) => void;
  setSummaryPopoverSettings: (settings: Partial<SummaryPopoverSettings>) => void;
  setScenePromptPreferences: (preferences: ScenePromptPreferences) => void;
  setSceneOriginFocus: (origin: ScenePackageOrigin | null) => void;
  setChatFontColor: (v: string) => void;
  setDefaultDialogueColor: (v: string) => void;
  setChatChromeTextColor: (v: string) => void;
  setChatFontOpacity: (v: number) => void;
  setRoleplayReducedPaintEffects: (v: boolean) => void;
  setShowRoleplayThinkingInMessages: (v: boolean) => void;
  setKeepRoleplayThinkingExpanded: (v: boolean) => void;
  setRoleplayAvatarStyle: (v: RoleplayAvatarStyle) => void;
  setRoleplayAvatarScale: (v: number) => void;
  setRoleplayAvatarsScrollable: (v: boolean) => void;
  setRoleplayNarratorAvatarCycling: (v: boolean) => void;
  setRoleplaySpriteScale: (v: number) => void;
  setRoleplayDisplayStyle: (v: "classic" | "visual-novel") => void;
  setRoleplayChatPosition: (v: RoleplayChatPosition) => void;
  setRoleplayVnAutoPlay: (v: boolean) => void;
  setRoleplayVnAutoPlayDelay: (v: number) => void;
  setRoleplayVnPortraitScale: (v: number) => void;
  setRoleplayVnSpriteScale: (v: number) => void;
  setTextStrokeWidth: (v: number) => void;
  setTextStrokeColor: (v: string) => void;
  setCenterCompact: (v: boolean) => void;
  requestChatModeShortcut: (mode: ChatModeShortcut) => void;
  setVisualTheme: (v: VisualTheme) => void;
  setConvoGradientField: (scheme: "dark" | "light", field: "from" | "to", value: string) => void;
  resetAppearanceSettings: () => void;
  setConvoNotificationSound: (v: boolean) => void;
  setRpNotificationSound: (v: boolean) => void;
  setNotificationSoundsOnlyWhenUnfocused: (v: boolean) => void;
  setNotificationPosition: (v: "top" | "bottom") => void;
  setChatWizardDefaults: (mode: ChatWizardMode, defaults: ChatWizardDefaults | null) => void;
  setConversationBrowserNotifications: (v: boolean) => void;
  setConversationMobileNotifications: (v: boolean) => void;
  setGenerationBrowserNotifications: (v: boolean) => void;
  setGenerationMobileNotifications: (v: boolean) => void;
  setCustomConversationPrompt: (v: string | null) => void;
  setEnterToSendRP: (v: boolean) => void;
  setEnterToSendConvo: (v: boolean) => void;
  setWeatherEffects: (v: boolean) => void;
  // Impersonate settings actions
  setImpersonatePromptTemplate: (v: string) => void;
  selectImpersonatePromptTemplate: (template: { id: string; prompt: string } | null) => void;
  clearActiveImpersonatePromptTemplate: () => void;
  setImpersonateCyoaChoices: (v: boolean) => void;
  setImpersonatePresetId: (id: string | null) => void;
  setImpersonateConnectionId: (id: string | null) => void;
  setImpersonateBlockAgents: (v: boolean) => void;

  /** Legacy migration helpers for browser-local custom themes. */
  setHasMigratedCustomThemesToServer: (v: boolean) => void;
  clearLegacyCustomThemes: () => void;
  setHasCompletedOnboarding: (v: boolean) => void;
  markChatHelpSeen: (mode: ChatModeShortcut) => void;
  setChatHelpButtonHidden: (v: boolean) => void;
  dismissLinkApiBanner: () => void;
  toggleEchoChamber: () => void;
}

function getMobileDetailReturnState(state: UIState) {
  const useOverlayDetailReturn = isMobileShellViewport();
  return {
    detailReturnRightPanel: useOverlayDetailReturn && state.rightPanelOpen ? state.rightPanel : null,
    ...(useOverlayDetailReturn && { rightPanelOpen: false }),
  };
}

function restoreMobileDetailReturnPanel(panel: Panel | null) {
  return {
    detailReturnRightPanel: null,
    ...(panel && { rightPanelOpen: true, rightPanel: panel }),
  };
}

/**
 * Returns the subset of UI state that is synced to the server so it persists
 * across devices and browsers. Excludes device-local sizing preferences,
 * via their own server resources (custom themes).
 */
export function pickSyncedSettings(state: UIState) {
  return {
    showHomeBrowserAddressBar: state.showHomeBrowserAddressBar,
    showHomeBrowserDesktopBookmarksOnOtherTabs: state.showHomeBrowserDesktopBookmarksOnOtherTabs,
    showHomeBrowserMobileBookmarksOnOtherTabs: state.showHomeBrowserMobileBookmarksOnOtherTabs,
    sidebarOpen: state.sidebarOpen,
    sidebarWidth: state.sidebarWidth,
    rightPanelWidth: state.rightPanelWidth,
    trackerPanelEnabled: state.trackerPanelEnabled,
    trackerPanelSide: state.trackerPanelSide,
    trackerPanelHideHudWidgets: state.trackerPanelHideHudWidgets,
    trackerPanelUseExpressionSprites: state.trackerPanelUseExpressionSprites,
    trackerPanelThoughtBubbleDisplay: state.trackerPanelThoughtBubbleDisplay,
    trackerStatDisplayMode: state.trackerStatDisplayMode,
    trackerPanelDockedThoughtsAlwaysVisible: state.trackerPanelDockedThoughtsAlwaysVisible,
    trackerPanelSizeProfile: state.trackerPanelSizeProfile,
    trackerPanelBackgroundColor: state.trackerPanelBackgroundColor,
    trackerTemperatureUnit: state.trackerTemperatureUnit,
    trackerPanelCollapsedSections: state.trackerPanelCollapsedSections,
    trackerPanelSectionOrder: state.trackerPanelSectionOrder,
    theme: state.theme,
    appBackgroundColor: state.appBackgroundColor,
    appAccentColor: state.appAccentColor,
    reduceAmbientEffects: state.reduceAmbientEffects,
    chatBackground: state.chatBackground,
    defaultRoleplayBackground: state.defaultRoleplayBackground,
    chatBackgroundBlur: state.chatBackgroundBlur,
    conversationBackgroundImageOpacity: state.conversationBackgroundImageOpacity,
    language: state.language,
    fontFamily: state.fontFamily,
    chatWidgetPreset: state.chatWidgetPreset,
    chatWidgetFont: state.chatWidgetFont,
    chatWidgetShape: state.chatWidgetShape,
    chatWidgetButtonSize: state.chatWidgetButtonSize,
    chatWidgetBorderColor: state.chatWidgetBorderColor,
    chatWidgetBackgroundColor: state.chatWidgetBackgroundColor,
    chatWidgetTextColor: state.chatWidgetTextColor,
    chatWidgetApplyFont: state.chatWidgetApplyFont,
    chatWidgetApplyShape: state.chatWidgetApplyShape,
    chatWidgetApplyColors: state.chatWidgetApplyColors,
    enableStreaming: state.enableStreaming,
    streamingSpeed: state.streamingSpeed,
    showPaidAgentConnectionWarning: state.showPaidAgentConnectionWarning,
    chatListBackgrounds: state.chatListBackgrounds,
    queueImageGenerationRequests: state.queueImageGenerationRequests,
    reviewImagePromptsBeforeSend: state.reviewImagePromptsBeforeSend,
    autoSaveGeneratedImagesToGalleries: state.autoSaveGeneratedImagesToGalleries,
    imageBackgroundWidth: state.imageBackgroundWidth,
    imageBackgroundHeight: state.imageBackgroundHeight,
    imageIllustrationWidth: state.imageIllustrationWidth,
    imageIllustrationHeight: state.imageIllustrationHeight,
    imageGameWidth: state.imageGameWidth,
    imageGameHeight: state.imageGameHeight,
    imagePortraitWidth: state.imagePortraitWidth,
    imagePortraitHeight: state.imagePortraitHeight,
    imageCharacterSheetWidth: state.imageCharacterSheetWidth,
    imageCharacterSheetHeight: state.imageCharacterSheetHeight,
    imageSelfieWidth: state.imageSelfieWidth,
    imageSelfieHeight: state.imageSelfieHeight,
    [IMAGE_STYLE_PROFILES_STORAGE_KEY]: state.imageStyleProfiles,

    conversationMessageStyle: state.conversationMessageStyle,
    alwaysDisplayConversationSwipeMenu: state.alwaysDisplayConversationSwipeMenu,
    alwaysDisplayRoleplaySwipeMenu: state.alwaysDisplayRoleplaySwipeMenu,
    conversationAvatarShape: state.conversationAvatarShape,
    showTimestamps: state.showTimestamps,
    showModelName: state.showModelName,
    showTokenUsage: state.showTokenUsage,
    showContextUsage: state.showContextUsage,
    showMessageNumbers: state.showMessageNumbers,
    showCharactersInPersonaPickers: state.showCharactersInPersonaPickers,
    guideGenerations: state.guideGenerations,
    keepGuidanceAfterRegenerate: state.keepGuidanceAfterRegenerate,
    showQuickRepliesMenu: state.showQuickRepliesMenu,
    showQuickReplyPostOnly: state.showQuickReplyPostOnly,
    showQuickReplyGuide: state.showQuickReplyGuide,
    showQuickReplyImpersonate: state.showQuickReplyImpersonate,
    customQuickReplies: state.customQuickReplies,
    chatSettingsExpandedSections: state.chatSettingsExpandedSections,
    confirmBeforeDelete: state.confirmBeforeDelete,
    includeReasoningInExports: state.includeReasoningInExports,
    includePrivateNotesInExports: state.includePrivateNotesInExports,
    messagesPerPage: state.messagesPerPage,
    boldDialogue: state.boldDialogue,
    colorInlineNames: state.colorInlineNames,
    disableInlineNameGradients: state.disableInlineNameGradients,
    quoteFormat: state.quoteFormat,
    convertLatexSymbols: state.convertLatexSymbols,
    trimIncompleteModelOutput: state.trimIncompleteModelOutput,
    continueAddsNewline: state.continueAddsNewline,
    speechToTextEnabled: state.speechToTextEnabled,
    ttsLineVolume: state.ttsLineVolume,
    chibiProfessorMariEnabled: state.chibiProfessorMariEnabled,
    professorMariSuggestionsEnabled: state.professorMariSuggestionsEnabled,
    professorMariNavigationEnabled: state.professorMariNavigationEnabled,
    conversationCallVoiceVolume: state.conversationCallVoiceVolume,
    conversationCallVoiceMuted: state.conversationCallVoiceMuted,
    intuitiveSwipeNavigation: state.intuitiveSwipeNavigation,
    intuitiveSwipeRerollLatest: state.intuitiveSwipeRerollLatest,
    editLastMessageOnArrowUp: state.editLastMessageOnArrowUp,
    editMessageOnDoubleClick: state.editMessageOnDoubleClick,
    summaryPopoverSettings: state.summaryPopoverSettings,
    scenePromptPreferences: state.scenePromptPreferences,
    chatFontColor: state.chatFontColor,
    defaultDialogueColor: state.defaultDialogueColor,
    chatChromeTextColor: state.chatChromeTextColor,
    chatFontOpacity: state.chatFontOpacity,
    showRoleplayThinkingInMessages: state.showRoleplayThinkingInMessages,
    keepRoleplayThinkingExpanded: state.keepRoleplayThinkingExpanded,
    roleplayAvatarStyle: state.roleplayAvatarStyle,
    roleplayAvatarScale: state.roleplayAvatarScale,
    roleplayAvatarsScrollable: state.roleplayAvatarsScrollable,
    roleplayNarratorAvatarCycling: state.roleplayNarratorAvatarCycling,
    roleplaySpriteScale: state.roleplaySpriteScale,
    roleplayDisplayStyle: state.roleplayDisplayStyle,
    roleplayChatPosition: state.roleplayChatPosition,
    roleplayVnAutoPlay: state.roleplayVnAutoPlay,
    roleplayVnAutoPlayDelay: state.roleplayVnAutoPlayDelay,
    roleplayVnPortraitScale: state.roleplayVnPortraitScale,
    roleplayVnSpriteScale: state.roleplayVnSpriteScale,
    textStrokeWidth: state.textStrokeWidth,
    textStrokeColor: state.textStrokeColor,
    visualTheme: state.visualTheme,
    convoGradient: state.convoGradient,
    enterToSendRP: state.enterToSendRP,
    enterToSendConvo: state.enterToSendConvo,
    weatherEffects: state.weatherEffects,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    chatHelpSeenModes: state.chatHelpSeenModes,
    chatHelpButtonHidden: state.chatHelpButtonHidden,
    linkApiBannerDismissed: state.linkApiBannerDismissed,
    echoChamberOpen: state.echoChamberOpen,
    convoNotificationSound: state.convoNotificationSound,
    rpNotificationSound: state.rpNotificationSound,
    notificationSoundsOnlyWhenUnfocused: state.notificationSoundsOnlyWhenUnfocused,
    notificationPosition: state.notificationPosition,
    chatWizardDefaults: state.chatWizardDefaults,
    conversationBrowserNotifications: state.conversationBrowserNotifications,
    conversationMobileNotifications: state.conversationMobileNotifications,
    generationBrowserNotifications: state.generationBrowserNotifications,
    generationMobileNotifications: state.generationMobileNotifications,
    customConversationPrompt: state.customConversationPrompt,
    impersonateCyoaChoices: state.impersonateCyoaChoices,
    impersonatePresetId: state.impersonatePresetId,
    impersonateConnectionId: state.impersonateConnectionId,
    impersonateBlockAgents: state.impersonateBlockAgents,
  };
}

function pickPersistedUIState(state: UIState) {
  return {
    showHomeBrowserAddressBar: state.showHomeBrowserAddressBar,
    showHomeBrowserDesktopBookmarksOnOtherTabs: state.showHomeBrowserDesktopBookmarksOnOtherTabs,
    showHomeBrowserMobileBookmarksOnOtherTabs: state.showHomeBrowserMobileBookmarksOnOtherTabs,
    sidebarOpen: state.sidebarOpen,
    sidebarWidth: state.sidebarWidth,
    rightPanelOpen: state.rightPanelOpen,
    rightPanelWidth: state.rightPanelWidth,
    rightPanel: state.rightPanel,
    settingsTab: state.settingsTab,
    characterDetailId: state.characterDetailId,
    lorebookDetailId: state.lorebookDetailId,
    presetDetailId: state.presetDetailId,
    connectionDetailId: state.connectionDetailId,
    agentDetailId: state.agentDetailId,
    toolDetailId: state.toolDetailId,
    personaDetailId: state.personaDetailId,
    regexDetailId: state.regexDetailId,
    spatialMapDetailChatId: state.spatialMapDetailChatId,
    characterLibraryOpen: state.characterLibraryOpen,
    cardLibraryKind: state.cardLibraryKind,
    agentCatalogOpen: state.agentCatalogOpen,
    characterLibrarySelectedId: state.characterLibrarySelectedId,
    personaLibrarySelectedId: state.personaLibrarySelectedId,
    characterLibrarySort: state.characterLibrarySort,
    personaLibrarySort: state.personaLibrarySort,
    characterLibraryScrollTop: state.characterLibraryScrollTop,
    personaLibraryScrollTop: state.personaLibraryScrollTop,
    lorebookPanelCategory: state.lorebookPanelCategory,
    lorebookPanelSearch: state.lorebookPanelSearch,
    lorebookPanelSort: state.lorebookPanelSort,
    lorebookPanelActiveTag: state.lorebookPanelActiveTag,
    lorebookPanelTagsExpanded: state.lorebookPanelTagsExpanded,
    presetPanelSort: state.presetPanelSort,
    connectionPanelSort: state.connectionPanelSort,
    agentPanelSort: state.agentPanelSort,
    trackerPanelEnabled: state.trackerPanelEnabled,
    trackerPanelOpen: state.trackerPanelOpen,
    trackerPanelOpenByChatId: state.trackerPanelOpenByChatId,
    trackerPanelSide: state.trackerPanelSide,
    trackerPanelHideHudWidgets: state.trackerPanelHideHudWidgets,
    trackerPanelUseExpressionSprites: state.trackerPanelUseExpressionSprites,
    trackerPanelThoughtBubbleDisplay: state.trackerPanelThoughtBubbleDisplay,
    trackerStatDisplayMode: state.trackerStatDisplayMode,
    trackerPanelDockedThoughtsAlwaysVisible: state.trackerPanelDockedThoughtsAlwaysVisible,
    trackerPanelSizeProfile: state.trackerPanelSizeProfile,
    trackerPanelBackgroundColor: state.trackerPanelBackgroundColor,
    trackerTemperatureUnit: state.trackerTemperatureUnit,
    trackerPanelCollapsedSections: state.trackerPanelCollapsedSections,
    trackerPanelSectionOrder: state.trackerPanelSectionOrder,
    theme: state.theme,
    appBackgroundColor: state.appBackgroundColor,
    appAccentColor: state.appAccentColor,
    appAccentPulseMode: state.appAccentPulseMode,
    appAccentRgbMode: state.appAccentRgbMode,
    customCursorEnabled: state.customCursorEnabled,
    reduceAmbientEffects: state.reduceAmbientEffects,
    mariPanelSortMode: state.mariPanelSortMode,
    mariEditViewMode: state.mariEditViewMode,
    chatBackground: state.chatBackground,
    defaultRoleplayBackground: state.defaultRoleplayBackground,
    chatBackgroundBlur: state.chatBackgroundBlur,
    conversationBackgroundImageOpacity: state.conversationBackgroundImageOpacity,
    fontSize: state.fontSize,
    language: state.language,
    chatFontSize: state.chatFontSize,
    fontFamily: state.fontFamily,
    chatWidgetPreset: state.chatWidgetPreset,
    chatWidgetFont: state.chatWidgetFont,
    chatWidgetShape: state.chatWidgetShape,
    chatWidgetButtonSize: state.chatWidgetButtonSize,
    chatWidgetBorderColor: state.chatWidgetBorderColor,
    chatWidgetBackgroundColor: state.chatWidgetBackgroundColor,
    chatWidgetTextColor: state.chatWidgetTextColor,
    chatWidgetApplyFont: state.chatWidgetApplyFont,
    chatWidgetApplyShape: state.chatWidgetApplyShape,
    chatWidgetApplyColors: state.chatWidgetApplyColors,
    enableStreaming: state.enableStreaming,
    debugMode: state.debugMode,
    showPaidAgentConnectionWarning: state.showPaidAgentConnectionWarning,
    streamingSpeed: state.streamingSpeed,
    chatListBackgrounds: state.chatListBackgrounds,
    queueImageGenerationRequests: state.queueImageGenerationRequests,
    reviewImagePromptsBeforeSend: state.reviewImagePromptsBeforeSend,
    autoSaveGeneratedImagesToGalleries: state.autoSaveGeneratedImagesToGalleries,
    imageBackgroundWidth: state.imageBackgroundWidth,
    imageBackgroundHeight: state.imageBackgroundHeight,
    imageIllustrationWidth: state.imageIllustrationWidth,
    imageIllustrationHeight: state.imageIllustrationHeight,
    imageGameWidth: state.imageGameWidth,
    imageGameHeight: state.imageGameHeight,
    imagePortraitWidth: state.imagePortraitWidth,
    imagePortraitHeight: state.imagePortraitHeight,
    imageCharacterSheetWidth: state.imageCharacterSheetWidth,
    imageCharacterSheetHeight: state.imageCharacterSheetHeight,
    imageSelfieWidth: state.imageSelfieWidth,
    imageSelfieHeight: state.imageSelfieHeight,
    imageStyleProfiles: state.imageStyleProfiles,

    conversationMessageStyle: state.conversationMessageStyle,
    alwaysDisplayConversationSwipeMenu: state.alwaysDisplayConversationSwipeMenu,
    alwaysDisplayRoleplaySwipeMenu: state.alwaysDisplayRoleplaySwipeMenu,
    conversationAvatarShape: state.conversationAvatarShape,
    showTimestamps: state.showTimestamps,
    showModelName: state.showModelName,
    showTokenUsage: state.showTokenUsage,
    showContextUsage: state.showContextUsage,
    showMessageNumbers: state.showMessageNumbers,
    showCharactersInPersonaPickers: state.showCharactersInPersonaPickers,
    guideGenerations: state.guideGenerations,
    keepGuidanceAfterRegenerate: state.keepGuidanceAfterRegenerate,
    showQuickRepliesMenu: state.showQuickRepliesMenu,
    showQuickReplyPostOnly: state.showQuickReplyPostOnly,
    showQuickReplyGuide: state.showQuickReplyGuide,
    showQuickReplyImpersonate: state.showQuickReplyImpersonate,
    customQuickReplies: state.customQuickReplies,
    chatSettingsExpandedSections: state.chatSettingsExpandedSections,
    confirmBeforeDelete: state.confirmBeforeDelete,
    includeReasoningInExports: state.includeReasoningInExports,
    includePrivateNotesInExports: state.includePrivateNotesInExports,
    messagesPerPage: state.messagesPerPage,
    boldDialogue: state.boldDialogue,
    colorInlineNames: state.colorInlineNames,
    disableInlineNameGradients: state.disableInlineNameGradients,
    quoteFormat: state.quoteFormat,
    convertLatexSymbols: state.convertLatexSymbols,
    trimIncompleteModelOutput: state.trimIncompleteModelOutput,
    continueAddsNewline: state.continueAddsNewline,
    speechToTextEnabled: state.speechToTextEnabled,
    ttsLineVolume: state.ttsLineVolume,
    chibiProfessorMariEnabled: state.chibiProfessorMariEnabled,
    professorMariSuggestionsEnabled: state.professorMariSuggestionsEnabled,
    professorMariNavigationEnabled: state.professorMariNavigationEnabled,
    conversationCallVoiceVolume: state.conversationCallVoiceVolume,
    conversationCallVoiceMuted: state.conversationCallVoiceMuted,
    intuitiveSwipeNavigation: state.intuitiveSwipeNavigation,
    intuitiveSwipeRerollLatest: state.intuitiveSwipeRerollLatest,
    editLastMessageOnArrowUp: state.editLastMessageOnArrowUp,
    editMessageOnDoubleClick: state.editMessageOnDoubleClick,
    summaryPopoverSettings: state.summaryPopoverSettings,
    scenePromptPreferences: state.scenePromptPreferences,
    chatFontColor: state.chatFontColor,
    defaultDialogueColor: state.defaultDialogueColor,
    chatChromeTextColor: state.chatChromeTextColor,
    chatFontOpacity: state.chatFontOpacity,
    roleplayReducedPaintEffects: state.roleplayReducedPaintEffects,
    showRoleplayThinkingInMessages: state.showRoleplayThinkingInMessages,
    keepRoleplayThinkingExpanded: state.keepRoleplayThinkingExpanded,
    roleplayAvatarStyle: state.roleplayAvatarStyle,
    roleplayAvatarScale: state.roleplayAvatarScale,
    roleplayAvatarsScrollable: state.roleplayAvatarsScrollable,
    roleplayNarratorAvatarCycling: state.roleplayNarratorAvatarCycling,
    roleplaySpriteScale: state.roleplaySpriteScale,
    roleplayDisplayStyle: state.roleplayDisplayStyle,
    roleplayChatPosition: state.roleplayChatPosition,
    roleplayVnAutoPlay: state.roleplayVnAutoPlay,
    roleplayVnAutoPlayDelay: state.roleplayVnAutoPlayDelay,
    roleplayVnPortraitScale: state.roleplayVnPortraitScale,
    roleplayVnSpriteScale: state.roleplayVnSpriteScale,
    textStrokeWidth: state.textStrokeWidth,
    textStrokeColor: state.textStrokeColor,
    visualTheme: state.visualTheme,
    convoGradient: state.convoGradient,
    enterToSendRP: state.enterToSendRP,
    enterToSendConvo: state.enterToSendConvo,
    weatherEffects: state.weatherEffects,
    hasMigratedCustomThemesToServer: state.hasMigratedCustomThemesToServer,
    activeCustomTheme: state.activeCustomTheme,
    customThemes: state.customThemes,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    chatHelpSeenModes: state.chatHelpSeenModes,
    chatHelpButtonHidden: state.chatHelpButtonHidden,
    linkApiBannerDismissed: state.linkApiBannerDismissed,
    echoChamberOpen: state.echoChamberOpen,
    convoNotificationSound: state.convoNotificationSound,
    rpNotificationSound: state.rpNotificationSound,
    notificationSoundsOnlyWhenUnfocused: state.notificationSoundsOnlyWhenUnfocused,
    notificationPosition: state.notificationPosition,
    chatWizardDefaults: state.chatWizardDefaults,
    conversationBrowserNotifications: state.conversationBrowserNotifications,
    conversationMobileNotifications: state.conversationMobileNotifications,
    generationBrowserNotifications: state.generationBrowserNotifications,
    generationMobileNotifications: state.generationMobileNotifications,
    customConversationPrompt: state.customConversationPrompt,
    impersonatePromptTemplate: state.impersonatePromptTemplate,
    activeImpersonatePromptTemplateId: state.activeImpersonatePromptTemplateId,
    impersonateCyoaChoices: state.impersonateCyoaChoices,
    impersonatePresetId: state.impersonatePresetId,
    impersonateConnectionId: state.impersonateConnectionId,
    impersonateBlockAgents: state.impersonateBlockAgents,
  };
}

export const useUIStore = create<UIState>()(
  persist(
    (setState, get) => {
      const set = (next: Partial<UIState> | ((state: UIState) => Partial<UIState>)) => {
        const state = get();
        const patch = typeof next === "function" ? next(state) : next;
        const apply = () => setState(patch);
        if (!deferEditorLeave(state, patch, apply)) apply();
      };
      return {
        settingsSyncReady: false,
        showHomeBrowserAddressBar: true,
        showHomeBrowserDesktopBookmarksOnOtherTabs: true,
        showHomeBrowserMobileBookmarksOnOtherTabs: true,
        sidebarOpen: true,
        sidebarWidth: 320,
        rightPanelOpen: false,
        rightPanelWidth: 320,
        rightPanel: "chat" as Panel,
        trackerPanelEnabled: true,
        trackerPanelOpen: false,
        trackerPanelOpenByChatId: {},
        trackerPanelSide: "right" as TrackerPanelSide,
        trackerPanelHideHudWidgets: false,
        trackerPanelUseExpressionSprites: false,
        trackerPanelThoughtBubbleDisplay: "inline" as TrackerThoughtBubbleDisplay,
        trackerStatDisplayMode: "bars" as TrackerStatDisplayMode,
        trackerPanelDockedThoughtsAlwaysVisible: false,
        trackerPanelSizeProfile: "standard" as TrackerPanelSizeProfile,
        trackerPanelBackgroundColor: TRACKER_PANEL_DEFAULT_BACKGROUND_COLOR,
        trackerTemperatureUnit: "celsius" as TrackerTemperatureUnit,
        trackerPanelCollapsedSections: {},
        trackerPanelSectionOrder: [...TRACKER_DATA_PANEL_SECTIONS],
        settingsTab: "general",
        settingsTargetControlId: null,
        modal: null,
        theme: "dark" as const,
        appBackgroundColor: "",
        appAccentColor: "",
        appAccentPulseMode: false,
        appAccentRgbMode: false,
        customCursorEnabled: false,
        reduceAmbientEffects: false,
        mariPanelSortMode: "az",
        mariEditViewMode: "easy",
        chatBackground: null,
        defaultRoleplayBackground: DEFAULT_ROLEPLAY_BACKGROUND_URL,
        chatBackgroundBlur: 0,
        conversationBackgroundImageOpacity: DEFAULT_CONVERSATION_BACKGROUND_IMAGE_OPACITY,
        characterDetailId: null,
        lorebookDetailId: null,
        lorebookLinkClipboard: null,
        presetDetailId: null,
        presetDetailInitialTab: null,
        connectionDetailId: null,
        agentDetailId: null,
        toolDetailId: null,
        personaDetailId: null,
        regexDetailId: null,
        spatialMapDetailChatId: null,
        pendingSpatialMapDraftReview: null,
        regexDetailDefaultCharacterIds: null,
        regexDetailDefaultPresetIds: null,
        regexDetailReturn: null,
        characterDetailInitialTab: null,
        lorebookDetailInitialTab: null,
        lorebookDetailInitialEntryId: null,
        personaDetailInitialTab: null,
        characterLibraryOpen: false,
        cardLibraryKind: "characters" as CardLibraryKind,
        agentCatalogOpen: false,
        agentCatalogInitialPackageId: null,
        characterLibrarySelectedId: null,
        characterLibraryInitialId: null,
        personaLibrarySelectedId: null,
        characterLibrarySort: "name-asc" as CharacterLibrarySort,
        personaLibrarySort: "name-asc" as ResourcePanelSort,
        characterPanelSearch: "",
        characterPanelIncludedTags: [],
        characterPanelExcludedTags: [],
        characterPanelTagsExpanded: false,
        characterPanelFavoriteFilter: "all" as CharacterPanelFavoriteFilter,
        characterPanelScrollTop: 0,
        characterLibraryScrollTop: 0,
        personaLibraryScrollTop: 0,
        lorebookPanelCategory: "all" as LorebookPanelCategory,
        lorebookPanelSearch: "",
        lorebookPanelSort: "name-asc" as LorebookPanelSort,
        lorebookPanelActiveTag: null,
        lorebookPanelTagsExpanded: false,
        presetPanelSort: "name-asc" as ResourcePanelSort,
        connectionPanelSort: "name-asc" as ConnectionPanelSort,
        agentPanelSort: "name-asc" as ResourcePanelSort,
        editorDirty: false,
        detailReturnRightPanel: null,

        // Settings defaults
        fontSize: 17 as FontSize,
        language: DEFAULT_APP_LANGUAGE as AppLanguage,
        chatFontSize: 16,
        fontFamily: "",
        chatWidgetPreset: "default" as ChatWidgetPreset,
        chatWidgetFont: "",
        chatWidgetShape: "preset" as ChatWidgetShape,
        chatWidgetButtonSize: null,
        chatWidgetBorderColor: "",
        chatWidgetBackgroundColor: "",
        chatWidgetTextColor: "",
        chatWidgetApplyFont: false,
        chatWidgetApplyShape: false,
        chatWidgetApplyColors: false,
        enableStreaming: true,
        debugMode: false,
        showPaidAgentConnectionWarning: true,
        streamingSpeed: 50,
        chatListBackgrounds: "hover" as ChatListBackgroundMode,
        queueImageGenerationRequests: true,
        reviewImagePromptsBeforeSend: false,
        autoSaveGeneratedImagesToGalleries: true,
        imageBackgroundWidth: 1280,
        imageBackgroundHeight: 720,
        imageIllustrationWidth: 896,
        imageIllustrationHeight: 1280,
        imageGameWidth: 1280,
        imageGameHeight: 720,
        imagePortraitWidth: 1024,
        imagePortraitHeight: 1024,
        imageCharacterSheetWidth: 1280,
        imageCharacterSheetHeight: 720,
        imageSelfieWidth: 896,
        imageSelfieHeight: 1152,
        imageStyleProfiles: normalizeImageStyleProfileSettings(null),

        conversationMessageStyle: "classic" as ConversationMessageStyle,
        alwaysDisplayConversationSwipeMenu: true,
        alwaysDisplayRoleplaySwipeMenu: true,
        conversationAvatarShape: "circle" as ConversationAvatarShape,
        showTimestamps: false,
        showModelName: false,
        showTokenUsage: false,
        showContextUsage: true,
        showMessageNumbers: false,
        showCharactersInPersonaPickers: false,
        guideGenerations: false,
        keepGuidanceAfterRegenerate: true,
        showQuickRepliesMenu: false,
        showQuickReplyPostOnly: true,
        showQuickReplyGuide: true,
        showQuickReplyImpersonate: true,
        customQuickReplies: [],
        chatSettingsExpandedSections: {},
        confirmBeforeDelete: true,
        includeReasoningInExports: false,
        includePrivateNotesInExports: false,
        messagesPerPage: 20,
        boldDialogue: true,
        colorInlineNames: false,
        disableInlineNameGradients: false,
        quoteFormat: "straight" as QuoteFormat,
        convertLatexSymbols: true,
        trimIncompleteModelOutput: false,
        continueAddsNewline: true,
        speechToTextEnabled: false,
        ttsLineVolume: 50,
        chibiProfessorMariEnabled: true,
        professorMariSuggestionsEnabled: true,
        professorMariNavigationEnabled: true,
        conversationCallVoiceVolume: 100,
        conversationCallVoiceMuted: false,
        intuitiveSwipeNavigation: false,
        intuitiveSwipeRerollLatest: false,
        editLastMessageOnArrowUp: true,
        editMessageOnDoubleClick: true,
        summaryPopoverSettings: DEFAULT_SUMMARY_POPOVER_SETTINGS,
        scenePromptPreferences: DEFAULT_SCENE_PROMPT_PREFERENCES,
        sceneOriginFocus: null,
        chatFontColor: "",
        defaultDialogueColor: "",
        chatChromeTextColor: "",
        chatFontOpacity: 90,
        roleplayReducedPaintEffects: false,
        showRoleplayThinkingInMessages: false,
        keepRoleplayThinkingExpanded: false,
        roleplayAvatarStyle: "circles" as RoleplayAvatarStyle,
        roleplayAvatarScale: 1,
        roleplayAvatarsScrollable: false,
        roleplayNarratorAvatarCycling: true,
        roleplaySpriteScale: 1,
        roleplayDisplayStyle: "classic",
        roleplayChatPosition: "center",
        roleplayVnAutoPlay: false,
        roleplayVnAutoPlayDelay: 3000,
        roleplayVnPortraitScale: 1,
        roleplayVnSpriteScale: 1.35,
        textStrokeWidth: 0.5,
        textStrokeColor: "#000000",
        visualTheme: "default" as VisualTheme,
        convoGradient: {
          dark: { from: "#0a0a0e", to: "#1c2133" },
          light: { from: "#f2eff7", to: "#eae6f0" },
        },
        convoNotificationSound: true,
        rpNotificationSound: true,
        notificationSoundsOnlyWhenUnfocused: false,
        notificationPosition: "top",
        chatWizardDefaults: {},
        conversationBrowserNotifications: false,
        conversationMobileNotifications: false,
        generationBrowserNotifications: false,
        generationMobileNotifications: false,
        customConversationPrompt: null,
        enterToSendRP: false,
        enterToSendConvo: true,
        weatherEffects: true,
        activeCustomTheme: null,
        customThemes: [],
        hasMigratedCustomThemesToServer: false,
        hasCompletedOnboarding: false,
        chatHelpSeenModes: [],
        chatHelpButtonHidden: false,
        linkApiBannerDismissed: false,
        echoChamberOpen: true,
        centerCompact: false,
        chatModeShortcutRequest: null,

        // Impersonate settings defaults
        impersonatePromptTemplate: "",
        activeImpersonatePromptTemplateId: null,
        impersonateCyoaChoices: false,
        impersonatePresetId: null,
        impersonateConnectionId: null,
        impersonateBlockAgents: false,

        toggleSidebar: () =>
          set((s) => {
            const mobile = isMobileShellViewport();
            const sidebarOpen = !s.sidebarOpen || (mobile && s.rightPanelOpen);
            dismissChatFloatingUiForMobilePanel(sidebarOpen);
            return {
              sidebarOpen,
              ...(mobile && sidebarOpen ? { rightPanelOpen: false } : {}),
            };
          }),
        setSidebarOpen: (open) => {
          dismissChatFloatingUiForMobilePanel(open);
          set({ sidebarOpen: open });
        },
        setSidebarWidth: (width) =>
          set({ sidebarWidth: Math.max(SIDEBAR_WIDTH_MIN, Math.min(SIDEBAR_WIDTH_MAX, width)) }),
        setRightPanelWidth: (width) =>
          set({ rightPanelWidth: Math.max(RIGHT_PANEL_WIDTH_MIN, Math.min(RIGHT_PANEL_WIDTH_MAX, width)) }),
        toggleTrackerPanel: (chatId) =>
          set((s) => {
            const trackerPanelOpen = s.trackerPanelEnabled ? !s.trackerPanelOpen : false;
            return {
              trackerPanelOpen,
              ...(chatId
                ? { trackerPanelOpenByChatId: { ...s.trackerPanelOpenByChatId, [chatId]: trackerPanelOpen } }
                : {}),
            };
          }),
        setTrackerPanelEnabled: (enabled) =>
          set({
            trackerPanelEnabled: enabled,
            trackerPanelOpen: enabled ? get().trackerPanelOpen : false,
          }),
        setTrackerPanelOpen: (open, chatId) =>
          set((s) => {
            const trackerPanelOpen = s.trackerPanelEnabled ? open : false;
            return {
              trackerPanelOpen,
              ...(chatId
                ? { trackerPanelOpenByChatId: { ...s.trackerPanelOpenByChatId, [chatId]: trackerPanelOpen } }
                : {}),
            };
          }),
        restoreTrackerPanelOpenForChat: (chatId) => {
          if (!chatId) return;
          set((s) => {
            const hasRememberedState = Object.prototype.hasOwnProperty.call(s.trackerPanelOpenByChatId, chatId);
            const legacyOpen = Object.keys(s.trackerPanelOpenByChatId).length === 0 && s.trackerPanelOpen;
            const rememberedOpen = hasRememberedState ? s.trackerPanelOpenByChatId[chatId] === true : legacyOpen;
            return {
              trackerPanelOpen: s.trackerPanelEnabled && rememberedOpen,
              ...(hasRememberedState
                ? {}
                : { trackerPanelOpenByChatId: { ...s.trackerPanelOpenByChatId, [chatId]: rememberedOpen } }),
            };
          });
        },
        setTrackerPanelSide: (side) => set({ trackerPanelSide: side }),
        setTrackerPanelHideHudWidgets: (hidden) => set({ trackerPanelHideHudWidgets: hidden }),
        setTrackerPanelUseExpressionSprites: (enabled) => set({ trackerPanelUseExpressionSprites: enabled }),
        setTrackerPanelThoughtBubbleDisplay: (display) =>
          set({ trackerPanelThoughtBubbleDisplay: normalizeTrackerThoughtBubbleDisplay(display) }),
        setTrackerStatDisplayMode: (display) =>
          set({ trackerStatDisplayMode: normalizeTrackerStatDisplayMode(display) }),
        setTrackerPanelDockedThoughtsAlwaysVisible: (visible) =>
          set({ trackerPanelDockedThoughtsAlwaysVisible: visible }),
        setTrackerPanelSizeProfile: (profile) =>
          set({ trackerPanelSizeProfile: normalizeTrackerPanelSizeProfile(profile) }),
        setTrackerPanelBackgroundColor: (color) =>
          set({ trackerPanelBackgroundColor: normalizeTrackerPanelBackgroundColor(color) }),
        setTrackerTemperatureUnit: (unit) => set({ trackerTemperatureUnit: normalizeTrackerTemperatureUnit(unit) }),
        setTrackerPanelSectionOrder: (order) =>
          set({ trackerPanelSectionOrder: normalizeTrackerPanelSectionOrder(order) }),
        toggleTrackerPanelSectionCollapsed: (section) =>
          set((s) => {
            const next = { ...s.trackerPanelCollapsedSections };
            if (next[section]) {
              delete next[section];
            } else {
              next[section] = true;
            }
            return { trackerPanelCollapsedSections: next };
          }),

        openRightPanel: (panel) =>
          set(() => {
            const mobile = isMobileShellViewport();
            dismissChatFloatingUiForMobilePanel(true);
            return {
              rightPanelOpen: true,
              rightPanel: panel,
              ...(mobile ? { sidebarOpen: false } : {}),
            };
          }),
        closeRightPanel: () => set({ rightPanelOpen: false }),
        toggleRightPanel: (panel) =>
          set((s) => {
            if (s.rightPanelOpen && s.rightPanel === panel) return { rightPanelOpen: false };
            const mobile = isMobileShellViewport();
            dismissChatFloatingUiForMobilePanel(true);
            return {
              rightPanelOpen: true,
              rightPanel: panel,
              ...(mobile ? { sidebarOpen: false } : {}),
            };
          }),

        setSettingsTab: (tab) => set({ settingsTab: tab }),
        setSettingsTargetControlId: (controlId) => set({ settingsTargetControlId: controlId }),
        openModal: (type, props) => set({ modal: { type, props } }),
        closeModal: () => set({ modal: null }),
        setTheme: (theme) => set({ theme }),
        setAppBackgroundColor: (color) => set({ appBackgroundColor: normalizeAppBackgroundColor(color) }),
        setAppAccentColor: (color) => set({ appAccentColor: normalizeAppAccentColor(color) }),
        setAppAccentPulseMode: (enabled) => set({ appAccentPulseMode: enabled }),
        setAppAccentRgbMode: (enabled) => set({ appAccentRgbMode: enabled }),
        setCustomCursorEnabled: (enabled) => set({ customCursorEnabled: enabled }),
        setReduceAmbientEffects: (enabled) => set({ reduceAmbientEffects: enabled }),
        setMariPanelSortMode: (mode) => set({ mariPanelSortMode: mode }),
        setMariEditViewMode: (mode) => set({ mariEditViewMode: mode }),
        setChatBackground: (url) => set({ chatBackground: url }),
        setDefaultRoleplayBackground: (url) =>
          set({ defaultRoleplayBackground: normalizeDefaultRoleplayBackground(url) }),
        setChatBackgroundBlur: (v) => set({ chatBackgroundBlur: Math.max(0, Math.min(24, Math.round(v))) }),
        setConversationBackgroundImageOpacity: (v) =>
          set({ conversationBackgroundImageOpacity: normalizeConversationBackgroundImageOpacity(v) }),
        setCharacterLibrarySelectedId: (id) => set({ characterLibrarySelectedId: id }),
        setPersonaLibrarySelectedId: (id) => set({ personaLibrarySelectedId: id }),
        setCharacterLibrarySort: (sort) => set({ characterLibrarySort: normalizeCharacterLibrarySort(sort) }),
        setPersonaLibrarySort: (sort) => set({ personaLibrarySort: normalizeBasicPanelSort(sort) }),
        setCharacterPanelSearch: (search) => set({ characterPanelSearch: normalizePanelText(search) }),
        setCharacterPanelIncludedTags: (tags) => set({ characterPanelIncludedTags: normalizePanelStringArray(tags) }),
        setCharacterPanelExcludedTags: (tags) => set({ characterPanelExcludedTags: normalizePanelStringArray(tags) }),
        setCharacterPanelTagsExpanded: (expanded) => set({ characterPanelTagsExpanded: expanded }),
        setCharacterPanelFavoriteFilter: (filter) =>
          set({ characterPanelFavoriteFilter: normalizeCharacterPanelFavoriteFilter(filter) }),
        setCharacterPanelScrollTop: (scrollTop) => set({ characterPanelScrollTop: normalizeScrollTop(scrollTop) }),
        setCharacterLibraryScrollTop: (scrollTop) => set({ characterLibraryScrollTop: normalizeScrollTop(scrollTop) }),
        setPersonaLibraryScrollTop: (scrollTop) => set({ personaLibraryScrollTop: normalizeScrollTop(scrollTop) }),
        setLorebookPanelCategory: (category) =>
          set({ lorebookPanelCategory: normalizeLorebookPanelCategory(category) }),
        setLorebookPanelSearch: (search) => set({ lorebookPanelSearch: normalizePanelText(search) }),
        setLorebookPanelSort: (sort) => set({ lorebookPanelSort: normalizeLorebookPanelSort(sort) }),
        setLorebookPanelActiveTag: (tag) => set({ lorebookPanelActiveTag: tag ? tag.trim() || null : null }),
        setLorebookPanelTagsExpanded: (expanded) => set({ lorebookPanelTagsExpanded: expanded }),
        setPresetPanelSort: (sort) => set({ presetPanelSort: normalizeBasicPanelSort(sort) }),
        setConnectionPanelSort: (sort) => set({ connectionPanelSort: normalizeConnectionPanelSort(sort) }),
        setAgentPanelSort: (sort) => set({ agentPanelSort: normalizeBasicPanelSort(sort) }),
        openCharacterDetail: (id, options) =>
          set((s) => {
            const preserveCharacterLibrary =
              options?.preserveCharacterLibrary ?? (s.characterLibraryOpen && s.cardLibraryKind === "characters");
            return {
              characterDetailId: id,
              characterDetailInitialTab: options?.initialTab ?? null,
              lorebookDetailId: null,
              presetDetailId: null,
              connectionDetailId: null,
              agentDetailId: null,
              toolDetailId: null,
              personaDetailId: null,
              regexDetailId: null,
              spatialMapDetailChatId: null,
              characterLibraryOpen: preserveCharacterLibrary ? s.characterLibraryOpen : false,
              agentCatalogOpen: false,
              characterLibrarySelectedId: preserveCharacterLibrary ? id : s.characterLibrarySelectedId,
              ...getMobileDetailReturnState(s),
            };
          }),
        closeCharacterDetail: () =>
          set((s) => ({
            characterDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        setLorebookLinkClipboard: (links) => set({ lorebookLinkClipboard: links }),
        openLorebookDetail: (id, options) =>
          set((s) => ({
            lorebookDetailId: id,
            lorebookDetailInitialTab: options?.initialTab ?? null,
            lorebookDetailInitialEntryId: options?.entryId ?? null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closeLorebookDetail: () =>
          set((s) => ({
            lorebookDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openPresetDetail: (id, options) =>
          set((s) => ({
            presetDetailId: id,
            presetDetailInitialTab: options?.initialTab ?? null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closePresetDetail: () =>
          set((s) => ({
            presetDetailId: null,
            presetDetailInitialTab: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openConnectionDetail: (id) =>
          set((s) => ({
            connectionDetailId: id,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closeConnectionDetail: () =>
          set((s) => ({
            connectionDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openAgentDetail: (agentType) =>
          set((s) => ({
            agentDetailId: agentType,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closeAgentDetail: () =>
          set((s) => ({
            agentDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openToolDetail: (id) =>
          set((s) => ({
            toolDetailId: id,
            agentDetailId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closeToolDetail: () =>
          set((s) => ({
            toolDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openPersonaDetail: (id, options) =>
          set((s) => {
            const preservePersonaLibrary =
              options?.preservePersonaLibrary ?? (s.characterLibraryOpen && s.cardLibraryKind === "personas");
            return {
              personaDetailId: id,
              personaDetailInitialTab: options?.initialTab ?? null,
              characterLibraryOpen: preservePersonaLibrary ? s.characterLibraryOpen : false,
              personaLibrarySelectedId: preservePersonaLibrary ? id : s.personaLibrarySelectedId,
              agentCatalogOpen: false,
              characterDetailId: null,
              lorebookDetailId: null,
              presetDetailId: null,
              connectionDetailId: null,
              agentDetailId: null,
              toolDetailId: null,
              regexDetailId: null,
              spatialMapDetailChatId: null,
              ...getMobileDetailReturnState(s),
            };
          }),
        closePersonaDetail: () =>
          set((s) => ({
            personaDetailId: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openRegexDetail: (id, options) =>
          set((s) => ({
            regexDetailId: id,
            regexDetailDefaultCharacterIds: options?.defaultCharacterIds ?? null,
            regexDetailDefaultPresetIds: options?.defaultPresetIds ?? null,
            regexDetailReturn: options?.returnTo ?? null,
            personaDetailId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            spatialMapDetailChatId: null,
            ...getMobileDetailReturnState(s),
          })),
        closeRegexDetail: () =>
          set((s) => {
            const ret = s.regexDetailReturn;
            if (ret) {
              // Return to the character/preset manager that opened the existing editor.
              return {
                regexDetailId: null,
                regexDetailReturn: null,
                regexDetailDefaultCharacterIds: null,
                regexDetailDefaultPresetIds: null,
                ...("presetId" in ret
                  ? { presetDetailId: ret.presetId, presetDetailInitialTab: "regex" }
                  : { characterDetailId: ret.characterId, characterDetailInitialTab: ret.tab ?? null }),
                editorDirty: false,
              };
            }
            return {
              regexDetailId: null,
              regexDetailReturn: null,
              regexDetailDefaultCharacterIds: null,
              regexDetailDefaultPresetIds: null,
              editorDirty: false,
              ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
            };
          }),
        openSpatialMapDetail: (chatId) =>
          set((s) => ({
            spatialMapDetailChatId: chatId,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            ...getMobileDetailReturnState(s),
          })),
        openSpatialMapDraftReview: (review) =>
          set((s) => ({
            pendingSpatialMapDraftReview: review,
            spatialMapDetailChatId: review.chatId,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            ...getMobileDetailReturnState(s),
          })),
        clearPendingSpatialMapDraftReview: () => set({ pendingSpatialMapDraftReview: null }),
        closeSpatialMapDetail: () =>
          set((s) => ({
            spatialMapDetailChatId: null,
            pendingSpatialMapDraftReview: null,
            editorDirty: false,
            ...restoreMobileDetailReturnPanel(s.detailReturnRightPanel),
          })),
        openCharacterLibrary: (characterId) =>
          set((state) => ({
            characterLibraryOpen: true,
            characterLibraryInitialId: characterId ?? null,
            characterLibrarySelectedId: characterId ?? state.characterLibrarySelectedId,
            cardLibraryKind: "characters",
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            pendingSpatialMapDraftReview: null,
            editorDirty: false,
            detailReturnRightPanel: null,
            rightPanelOpen: isMobileShellViewport() ? false : state.rightPanelOpen,
          })),
        openPersonaLibrary: () =>
          set((state) => ({
            characterLibraryOpen: true,
            cardLibraryKind: "personas",
            agentCatalogOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            pendingSpatialMapDraftReview: null,
            editorDirty: false,
            detailReturnRightPanel: null,
            rightPanelOpen: isMobileShellViewport() ? false : state.rightPanelOpen,
          })),
        closeCharacterLibrary: () => set({ characterLibraryOpen: false, characterLibraryInitialId: null }),
        openAgentCatalog: (packageId) =>
          set((state) => ({
            agentCatalogOpen: true,
            agentCatalogInitialPackageId: packageId ?? null,
            characterLibraryOpen: false,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            pendingSpatialMapDraftReview: null,
            editorDirty: false,
            detailReturnRightPanel: null,
            rightPanelOpen: isMobileShellViewport() ? false : state.rightPanelOpen,
          })),
        closeAgentCatalog: () => set({ agentCatalogOpen: false, agentCatalogInitialPackageId: null }),
        hasAnyDetailOpen: () => {
          const s = get();
          return !!(
            s.characterDetailId ||
            s.lorebookDetailId ||
            s.presetDetailId ||
            s.connectionDetailId ||
            s.agentDetailId ||
            s.toolDetailId ||
            s.personaDetailId ||
            s.regexDetailId ||
            s.spatialMapDetailChatId ||
            s.characterLibraryOpen ||
            s.agentCatalogOpen
          );
        },
        closeAllDetails: () =>
          set({
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            editorDirty: false,
            detailReturnRightPanel: null,
          }),
        setEditorDirty: (dirty) => set({ editorDirty: dirty }),
        requestChatModeShortcut: (mode) =>
          set((state) => ({
            sidebarOpen: true,
            rightPanelOpen: isMobileShellViewport() ? false : state.rightPanelOpen,
            characterDetailId: null,
            lorebookDetailId: null,
            presetDetailId: null,
            connectionDetailId: null,
            agentDetailId: null,
            toolDetailId: null,
            personaDetailId: null,
            regexDetailId: null,
            spatialMapDetailChatId: null,
            characterLibraryOpen: false,
            agentCatalogOpen: false,
            editorDirty: false,
            detailReturnRightPanel: null,
            chatModeShortcutRequest: {
              mode,
              token: (state.chatModeShortcutRequest?.token ?? 0) + 1,
            },
          })),

        // Settings actions
        setFontSize: (size) => set({ fontSize: size }),
        setLanguage: (language) => set({ language }),
        setChatFontSize: (size) => set({ chatFontSize: size }),
        setFontFamily: (family) => set({ fontFamily: family }),
        setChatWidgetPreset: (preset) =>
          set({
            chatWidgetPreset: normalizeChatWidgetPreset(preset),
            chatWidgetFont: "",
            chatWidgetShape: "preset",
            chatWidgetBorderColor: "",
            chatWidgetBackgroundColor: "",
            chatWidgetTextColor: "",
          }),
        setChatWidgetFont: (font) => set({ chatWidgetFont: normalizeChatWidgetFont(font) }),
        setChatWidgetShape: (shape) => set({ chatWidgetShape: normalizeChatWidgetShape(shape) }),
        setChatWidgetButtonSize: (size) => set({ chatWidgetButtonSize: normalizeChatWidgetButtonSize(size) }),
        setChatWidgetBorderColor: (color) => set({ chatWidgetBorderColor: normalizeChatWidgetColor(color) }),
        setChatWidgetBackgroundColor: (color) => set({ chatWidgetBackgroundColor: normalizeChatWidgetColor(color) }),
        setChatWidgetTextColor: (color) => set({ chatWidgetTextColor: normalizeChatWidgetColor(color) }),
        setChatWidgetApplyFont: (enabled) => set({ chatWidgetApplyFont: enabled }),
        setChatWidgetApplyShape: (enabled) => set({ chatWidgetApplyShape: enabled }),
        setChatWidgetApplyColors: (enabled) => set({ chatWidgetApplyColors: enabled }),
        setEnableStreaming: (v) => set({ enableStreaming: v }),
        setDebugMode: (v) => set({ debugMode: v }),
        setShowPaidAgentConnectionWarning: (v) => set({ showPaidAgentConnectionWarning: v }),
        setStreamingSpeed: (v) => set({ streamingSpeed: Math.max(1, Math.min(100, v)) }),
        setChatListBackgrounds: (v) => set({ chatListBackgrounds: v }),
        setQueueImageGenerationRequests: (v) => set({ queueImageGenerationRequests: v }),
        setReviewImagePromptsBeforeSend: (v) => set({ reviewImagePromptsBeforeSend: v }),
        setAutoSaveGeneratedImagesToGalleries: (v) => set({ autoSaveGeneratedImagesToGalleries: v }),
        setImageBackgroundDimensions: (width, height) =>
          set({
            imageBackgroundWidth: clampImageDimension(width),
            imageBackgroundHeight: clampImageDimension(height),
          }),
        setImageIllustrationDimensions: (width, height) =>
          set({
            imageIllustrationWidth: clampImageDimension(width),
            imageIllustrationHeight: clampImageDimension(height),
          }),
        setImageGameDimensions: (width, height) =>
          set({
            imageGameWidth: clampImageDimension(width),
            imageGameHeight: clampImageDimension(height),
          }),
        setImagePortraitDimensions: (width, height) =>
          set({
            imagePortraitWidth: clampImageDimension(width),
            imagePortraitHeight: clampImageDimension(height),
          }),
        setImageCharacterSheetDimensions: (width, height) =>
          set({
            imageCharacterSheetWidth: clampImageDimension(width),
            imageCharacterSheetHeight: clampImageDimension(height),
          }),
        setImageSelfieDimensions: (width, height) =>
          set({
            imageSelfieWidth: clampImageDimension(width),
            imageSelfieHeight: clampImageDimension(height),
          }),
        setImageStyleProfiles: (settings) => set({ imageStyleProfiles: normalizeImageStyleProfileSettings(settings) }),

        setConversationMessageStyle: (v) => set({ conversationMessageStyle: normalizeConversationMessageStyle(v) }),
        setAlwaysDisplayConversationSwipeMenu: (v) => set({ alwaysDisplayConversationSwipeMenu: v }),
        setAlwaysDisplayRoleplaySwipeMenu: (v) => set({ alwaysDisplayRoleplaySwipeMenu: v }),
        setConversationAvatarShape: (v) => set({ conversationAvatarShape: normalizeConversationAvatarShape(v) }),
        setShowTimestamps: (v) => set({ showTimestamps: v }),
        setShowModelName: (v) => set({ showModelName: v }),
        setShowTokenUsage: (v) => set({ showTokenUsage: v }),
        setShowContextUsage: (v) => set({ showContextUsage: v }),
        setShowMessageNumbers: (v) => set({ showMessageNumbers: v }),
        setShowCharactersInPersonaPickers: (v) => set({ showCharactersInPersonaPickers: v }),
        setGuideGenerations: (v) => set({ guideGenerations: v }),
        setKeepGuidanceAfterRegenerate: (v) => set({ keepGuidanceAfterRegenerate: v }),
        setShowQuickRepliesMenu: (v) => set({ showQuickRepliesMenu: v }),
        setShowQuickReplyPostOnly: (v) => set({ showQuickReplyPostOnly: v }),
        setShowQuickReplyGuide: (v) => set({ showQuickReplyGuide: v }),
        setShowQuickReplyImpersonate: (v) => set({ showQuickReplyImpersonate: v }),
        addCustomQuickReply: (label, content) =>
          set((state) => ({
            customQuickReplies: [
              ...state.customQuickReplies,
              { id: generateClientId(), label: label.trim(), content, icon: "✨" },
            ],
          })),
        updateCustomQuickReply: (id, patch) =>
          set((state) => ({
            customQuickReplies: state.customQuickReplies.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    ...(patch.label !== undefined ? { label: patch.label } : {}),
                    ...(patch.content !== undefined ? { content: patch.content } : {}),
                    ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
                  }
                : entry,
            ),
          })),
        removeCustomQuickReply: (id) =>
          set((state) => ({ customQuickReplies: state.customQuickReplies.filter((entry) => entry.id !== id) })),
        setChatSettingsSectionExpanded: (id, open) =>
          set((state) => ({
            chatSettingsExpandedSections: { ...state.chatSettingsExpandedSections, [id]: open },
          })),
        setConfirmBeforeDelete: (v) => set({ confirmBeforeDelete: v }),
        setIncludeReasoningInExports: (v) => set({ includeReasoningInExports: v }),
        setIncludePrivateNotesInExports: (v) => set({ includePrivateNotesInExports: v }),
        setMessagesPerPage: (n) => set({ messagesPerPage: n }),
        setBoldDialogue: (v) => set({ boldDialogue: v }),
        setColorInlineNames: (v) => set({ colorInlineNames: v }),
        setDisableInlineNameGradients: (v) => set({ disableInlineNameGradients: v }),
        setQuoteFormat: (v) => set({ quoteFormat: normalizeQuoteFormat(v) }),
        setConvertLatexSymbols: (v) => set({ convertLatexSymbols: v }),
        setTrimIncompleteModelOutput: (v) => set({ trimIncompleteModelOutput: v }),
        setShowHomeBrowserAddressBar: (visible) => set({ showHomeBrowserAddressBar: visible }),
        setShowHomeBrowserDesktopBookmarksOnOtherTabs: (visible) =>
          set({ showHomeBrowserDesktopBookmarksOnOtherTabs: visible }),
        setShowHomeBrowserMobileBookmarksOnOtherTabs: (visible) =>
          set({ showHomeBrowserMobileBookmarksOnOtherTabs: visible }),
        setContinueAddsNewline: (v) => set({ continueAddsNewline: v }),
        setSpeechToTextEnabled: (v) => set({ speechToTextEnabled: v }),
        setTTSLineVolume: (v) => set({ ttsLineVolume: Math.max(0, Math.min(100, Math.round(v))) }),
        setChibiProfessorMariEnabled: (v) => set({ chibiProfessorMariEnabled: v }),
        setProfessorMariSuggestionsEnabled: (v) => set({ professorMariSuggestionsEnabled: v }),
        setProfessorMariNavigationEnabled: (v) => {
          set({ professorMariNavigationEnabled: v });
        },
        setConversationCallVoiceVolume: (v) =>
          set({ conversationCallVoiceVolume: Math.max(0, Math.min(100, Math.round(v))) }),
        setConversationCallVoiceMuted: (v) => set({ conversationCallVoiceMuted: v }),
        setIntuitiveSwipeNavigation: (v) => set({ intuitiveSwipeNavigation: v }),
        setIntuitiveSwipeRerollLatest: (v) => set({ intuitiveSwipeRerollLatest: v }),
        setEditLastMessageOnArrowUp: (v) => set({ editLastMessageOnArrowUp: v }),
        setEditMessageOnDoubleClick: (v) => set({ editMessageOnDoubleClick: v }),
        setSummaryPopoverSettings: (settings) =>
          set((state) => ({
            summaryPopoverSettings: normalizeSummaryPopoverSettings({
              ...state.summaryPopoverSettings,
              ...settings,
            }),
          })),
        setScenePromptPreferences: (preferences) =>
          set({ scenePromptPreferences: normalizeScenePromptPreferences(preferences) }),
        setSceneOriginFocus: (origin) => set({ sceneOriginFocus: origin }),
        setChatFontColor: (v) => set({ chatFontColor: v }),
        setDefaultDialogueColor: (v) => set({ defaultDialogueColor: v }),
        setChatChromeTextColor: (v) => set({ chatChromeTextColor: normalizeChatChromeTextColor(v) }),
        setChatFontOpacity: (v) => set({ chatFontOpacity: Math.max(0, Math.min(100, v)) }),
        setRoleplayReducedPaintEffects: (v) => set({ roleplayReducedPaintEffects: v }),
        setShowRoleplayThinkingInMessages: (v) =>
          set({
            showRoleplayThinkingInMessages: v,
            ...(!v ? { keepRoleplayThinkingExpanded: false } : {}),
          }),
        setKeepRoleplayThinkingExpanded: (v) =>
          set((state) => ({ keepRoleplayThinkingExpanded: state.showRoleplayThinkingInMessages && v })),
        setRoleplayAvatarStyle: (v) => set({ roleplayAvatarStyle: v }),
        setRoleplayAvatarScale: (v) =>
          set({ roleplayAvatarScale: Math.max(ROLEPLAY_AVATAR_SCALE_MIN, Math.min(ROLEPLAY_AVATAR_SCALE_MAX, v)) }),
        setRoleplayAvatarsScrollable: (v) => set({ roleplayAvatarsScrollable: v }),
        setRoleplayNarratorAvatarCycling: (v) => set({ roleplayNarratorAvatarCycling: v }),
        setRoleplaySpriteScale: (v) =>
          set({ roleplaySpriteScale: Math.max(ROLEPLAY_SPRITE_SCALE_MIN, Math.min(ROLEPLAY_SPRITE_SCALE_MAX, v)) }),
        setRoleplayDisplayStyle: (v) => set({ roleplayDisplayStyle: v }),
        setRoleplayChatPosition: (v) => set({ roleplayChatPosition: normalizeRoleplayChatPosition(v) }),
        setRoleplayVnAutoPlay: (v) => set({ roleplayVnAutoPlay: v }),
        setRoleplayVnAutoPlayDelay: (v) =>
          set({ roleplayVnAutoPlayDelay: Math.max(200, Math.min(10000, Math.round(v))) }),
        setRoleplayVnPortraitScale: (v) =>
          set({ roleplayVnPortraitScale: Number.isFinite(v) ? Math.max(0.75, Math.min(1.75, v)) : 1 }),
        setRoleplayVnSpriteScale: (v) =>
          set({ roleplayVnSpriteScale: Number.isFinite(v) ? Math.max(0.75, Math.min(2.75, v)) : 1.35 }),
        setTextStrokeWidth: (v) => set({ textStrokeWidth: Math.max(0, Math.min(5, v)) }),
        setTextStrokeColor: (v) => set({ textStrokeColor: v }),
        setCenterCompact: (v) => set({ centerCompact: v }),
        setVisualTheme: (v) => set({ visualTheme: v }),
        setConvoGradientField: (scheme, field, value) =>
          set((s) => ({
            convoGradient: {
              ...s.convoGradient,
              [scheme]: { ...s.convoGradient[scheme], [field]: value },
            },
          })),
        // Swipe-menu choices intentionally survive appearance resets; only their toggles change them.
        resetAppearanceSettings: () =>
          set({
            trackerPanelEnabled: true,
            trackerPanelOpen: false,
            trackerPanelOpenByChatId: {},
            trackerPanelSide: "right" as TrackerPanelSide,
            trackerPanelHideHudWidgets: false,
            trackerPanelUseExpressionSprites: false,
            trackerPanelThoughtBubbleDisplay: "inline" as TrackerThoughtBubbleDisplay,
            trackerStatDisplayMode: "bars" as TrackerStatDisplayMode,
            trackerPanelDockedThoughtsAlwaysVisible: false,
            trackerPanelSizeProfile: "standard" as TrackerPanelSizeProfile,
            trackerPanelBackgroundColor: TRACKER_PANEL_DEFAULT_BACKGROUND_COLOR,
            trackerTemperatureUnit: "celsius" as TrackerTemperatureUnit,
            trackerPanelCollapsedSections: {},
            trackerPanelSectionOrder: [...TRACKER_DATA_PANEL_SECTIONS],
            theme: "dark" as const,
            appBackgroundColor: "",
            appAccentColor: "",
            appAccentPulseMode: false,
            appAccentRgbMode: false,
            customCursorEnabled: false,
            reduceAmbientEffects: false,
            mariPanelSortMode: "az",
            mariEditViewMode: "easy",
            chatBackground: null,
            defaultRoleplayBackground: DEFAULT_ROLEPLAY_BACKGROUND_URL,
            chatBackgroundBlur: 0,
            conversationBackgroundImageOpacity: DEFAULT_CONVERSATION_BACKGROUND_IMAGE_OPACITY,
            fontSize: 17 as FontSize,
            chatFontSize: 16,
            fontFamily: "",
            chatWidgetPreset: "default" as ChatWidgetPreset,
            chatWidgetFont: "",
            chatWidgetShape: "preset" as ChatWidgetShape,
            chatWidgetButtonSize: null,
            chatWidgetBorderColor: "",
            chatWidgetBackgroundColor: "",
            chatWidgetTextColor: "",
            chatWidgetApplyFont: false,
            chatWidgetApplyShape: false,
            chatWidgetApplyColors: false,
            conversationMessageStyle: "classic" as ConversationMessageStyle,
            conversationAvatarShape: "circle" as ConversationAvatarShape,
            chatFontColor: "",
            defaultDialogueColor: "",
            chatChromeTextColor: "",
            chatFontOpacity: 90,
            roleplayReducedPaintEffects: false,
            showRoleplayThinkingInMessages: false,
            keepRoleplayThinkingExpanded: false,
            roleplayAvatarStyle: "circles" as RoleplayAvatarStyle,
            roleplayAvatarScale: 1,
            roleplayAvatarsScrollable: false,
            roleplayNarratorAvatarCycling: true,
            roleplaySpriteScale: 1,
            roleplayDisplayStyle: "classic",
            roleplayChatPosition: "center",
            roleplayVnAutoPlay: false,
            roleplayVnAutoPlayDelay: 3000,
            roleplayVnPortraitScale: 1,
            roleplayVnSpriteScale: 1.35,
            chatListBackgrounds: "hover" as ChatListBackgroundMode,
            textStrokeWidth: 0.5,
            textStrokeColor: "#000000",
            visualTheme: "default" as VisualTheme,
            convoGradient: {
              dark: { from: "#0a0a0e", to: "#1c2133" },
              light: { from: "#f2eff7", to: "#eae6f0" },
            },
            weatherEffects: true,
          }),
        setConvoNotificationSound: (v) => set({ convoNotificationSound: v }),
        setRpNotificationSound: (v) => set({ rpNotificationSound: v }),
        setNotificationSoundsOnlyWhenUnfocused: (v) => set({ notificationSoundsOnlyWhenUnfocused: v }),
        setNotificationPosition: (v) => set({ notificationPosition: v === "bottom" ? "bottom" : "top" }),
        setChatWizardDefaults: (mode, defaults) =>
          set((state) => {
            const next = { ...state.chatWizardDefaults };
            if (defaults) next[mode] = defaults;
            else delete next[mode];
            return { chatWizardDefaults: next };
          }),
        setConversationBrowserNotifications: (v) => set({ conversationBrowserNotifications: v }),
        setConversationMobileNotifications: (v) => set({ conversationMobileNotifications: v }),
        setGenerationBrowserNotifications: (v) => set({ generationBrowserNotifications: v }),
        setGenerationMobileNotifications: (v) => set({ generationMobileNotifications: v }),
        setCustomConversationPrompt: (v) => set({ customConversationPrompt: v }),
        setEnterToSendRP: (v) => set({ enterToSendRP: v }),
        setEnterToSendConvo: (v) => set({ enterToSendConvo: v }),
        setWeatherEffects: (v) => set({ weatherEffects: v }),
        setImpersonatePromptTemplate: (v) => set({ impersonatePromptTemplate: v }),
        selectImpersonatePromptTemplate: (template) =>
          set({
            activeImpersonatePromptTemplateId: template?.id ?? null,
            impersonatePromptTemplate: template?.prompt ?? "",
          }),
        clearActiveImpersonatePromptTemplate: () => set({ activeImpersonatePromptTemplateId: null }),
        setImpersonateCyoaChoices: (v) => set({ impersonateCyoaChoices: v }),
        setImpersonatePresetId: (id) => set({ impersonatePresetId: id }),
        setImpersonateConnectionId: (id) => set({ impersonateConnectionId: id }),
        setImpersonateBlockAgents: (v) => set({ impersonateBlockAgents: v }),
        setHasMigratedCustomThemesToServer: (v) => set({ hasMigratedCustomThemesToServer: v }),
        clearLegacyCustomThemes: () => set({ customThemes: [], activeCustomTheme: null }),
        setHasCompletedOnboarding: (v) => set({ hasCompletedOnboarding: v }),
        markChatHelpSeen: (mode) =>
          set((state) => {
            const seenModes = state.chatHelpSeenModes ?? [];
            return seenModes.includes(mode) ? state : { chatHelpSeenModes: [...seenModes, mode] };
          }),
        setChatHelpButtonHidden: (v) =>
          set((state) => ({
            chatHelpButtonHidden: v,
            chatHelpSeenModes: v ? ["conversation", "roleplay", "game"] : state.chatHelpSeenModes,
          })),
        dismissLinkApiBanner: () => set({ linkApiBannerDismissed: true }),
        toggleEchoChamber: () => set((s) => ({ echoChamberOpen: !s.echoChamberOpen })),
      };
    },
    {
      name: UI_PERSISTENCE.name,
      // v99 -> v100: separate character-sheet dimensions from backgrounds.
      version: UI_PERSISTENCE.version,
      // Debounce localStorage writes to avoid sync I/O on every state change
      storage: createJSONStorage(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let pendingName: string | null = null;
        let pendingValue: string | null = null;

        const flush = () => {
          if (pendingName !== null && pendingValue !== null) {
            localStorage.setItem(pendingName, pendingValue);
            pendingName = null;
            pendingValue = null;
          }
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        };

        // Flush pending writes before the tab closes
        if (typeof window !== "undefined") {
          window.addEventListener("beforeunload", flush);
          window.addEventListener("pagehide", flush);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") flush();
          });
        }

        return {
          getItem: (name: string) => localStorage.getItem(name),
          setItem: (name: string, value: string) => {
            const previousValue = pendingValue ?? localStorage.getItem(name);
            pendingName = name;
            pendingValue = value;
            if (shouldFlushUiStorageImmediately(previousValue, value)) {
              flush();
              return;
            }
            if (timer) clearTimeout(timer);
            timer = setTimeout(flush, 1000);
          },
          removeItem: (name: string) => localStorage.removeItem(name),
        };
      }),
      migrate: (persisted: any, version: number) => {
        if (version <= 99) {
          persisted.imageCharacterSheetWidth ??= persisted.imageBackgroundWidth ?? 1280;
          persisted.imageCharacterSheetHeight ??= persisted.imageBackgroundHeight ?? 720;
        }
        // v87 -> v88: enable Narrator avatar cycling by default for older stores.
        if (version <= 87 && persisted.roleplayNarratorAvatarCycling === undefined) {
          persisted.roleplayNarratorAvatarCycling = true;
        }
        // v88 -> v89: add the manual ambient-effects preference. The system
        // reduced-motion preference is evaluated live and is not persisted.
        if (version <= 88 && persisted.reduceAmbientEffects === undefined) {
          persisted.reduceAmbientEffects = false;
        }
        // v90 -> v91: make the Home navigation assistant an explicit, default-on preference.
        if (version <= 90 && persisted.professorMariNavigationEnabled === undefined) {
          persisted.professorMariNavigationEnabled = true;
        }
        if (version <= 95) {
          persisted.showRoleplayThinkingInMessages = false;
          persisted.keepRoleplayThinkingExpanded = false;
        }
        // v84 -> v85: keep the historical blank-line behavior for /continue by default.
        if (version <= 84 && persisted.continueAddsNewline === undefined) {
          persisted.continueAddsNewline = true;
        }
        persisted.appAccentRgbMode = persisted.appAccentRgbMode === true;
        persisted.customCursorEnabled = persisted.customCursorEnabled !== false;
        persisted.reduceAmbientEffects = persisted.reduceAmbientEffects === true;
        persisted.professorMariSuggestionsEnabled = persisted.professorMariSuggestionsEnabled !== false;
        persisted.professorMariNavigationEnabled = persisted.professorMariNavigationEnabled !== false;
        persisted.includeReasoningInExports = persisted.includeReasoningInExports === true;
        persisted.includePrivateNotesInExports = persisted.includePrivateNotesInExports === true;
        persisted.roleplayReducedPaintEffects = persisted.roleplayReducedPaintEffects === true;
        persisted.showRoleplayThinkingInMessages = persisted.showRoleplayThinkingInMessages === true;
        persisted.keepRoleplayThinkingExpanded =
          persisted.showRoleplayThinkingInMessages && persisted.keepRoleplayThinkingExpanded === true;
        persisted.roleplayNarratorAvatarCycling = persisted.roleplayNarratorAvatarCycling !== false;
        persisted.defaultDialogueColor =
          typeof persisted.defaultDialogueColor === "string" ? persisted.defaultDialogueColor : "";
        persisted.chatChromeTextColor = normalizeChatChromeTextColor(persisted.chatChromeTextColor);
        persisted.defaultRoleplayBackground = normalizeDefaultRoleplayBackground(persisted.defaultRoleplayBackground);
        delete persisted.trackerPanelWidth;
        return persisted;
      },
      merge: (persistedState: unknown, currentState) => {
        const persisted =
          persistedState && typeof persistedState === "object" ? (persistedState as Record<string, unknown>) : {};
        return {
          ...currentState,
          ...persisted,
          conversationBackgroundImageOpacity: normalizeConversationBackgroundImageOpacity(
            persisted.conversationBackgroundImageOpacity,
          ),
          chatWidgetPreset: normalizeChatWidgetPreset(persisted.chatWidgetPreset),
          roleplayChatPosition: normalizeRoleplayChatPosition(persisted.roleplayChatPosition),
          chatWidgetFont: normalizeChatWidgetFont(persisted.chatWidgetFont),
          chatWidgetShape: normalizeChatWidgetShape(persisted.chatWidgetShape),
          chatWidgetButtonSize: normalizeChatWidgetButtonSize(persisted.chatWidgetButtonSize),
          chatWidgetBorderColor: normalizeChatWidgetColor(persisted.chatWidgetBorderColor),
          chatWidgetBackgroundColor: normalizeChatWidgetColor(persisted.chatWidgetBackgroundColor),
          chatWidgetTextColor: normalizeChatWidgetColor(persisted.chatWidgetTextColor),
          chatWidgetApplyFont: persisted.chatWidgetApplyFont === true,
          chatWidgetApplyShape: persisted.chatWidgetApplyShape === true,
          chatWidgetApplyColors: persisted.chatWidgetApplyColors === true,
        };
      },
      partialize: pickPersistedUIState,
    },
  ),
);
