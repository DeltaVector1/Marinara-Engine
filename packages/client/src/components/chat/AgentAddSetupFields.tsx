import { useRef, type ReactNode } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import {
  DEFAULT_AGENT_PROMPT_TEMPLATE_ID,
  getDefaultBuiltInAgentSettings,
  normalizeAgentPromptTemplateSelectionMap,
  resolveDefaultAgentPromptTemplateId,
  type AgentPromptTemplateOption,
  type KnowledgeAgentSourceSettings,
  type Lorebook,
} from "@marinara-engine/shared";
import { useKnowledgeSources, useUploadKnowledgeSource } from "../../hooks/use-knowledge-sources";
import { api } from "../../lib/api-client";
import { showAlertDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";
import {
  DEFAULT_SPRITE_DISPLAY_MODES,
  SPRITE_DISPLAY_OPACITY_MAX,
  SPRITE_DISPLAY_OPACITY_MIN,
  SPRITE_DISPLAY_OPACITY_PERCENT_MAX,
  SPRITE_DISPLAY_OPACITY_PERCENT_MIN,
  SPRITE_DISPLAY_SCALE_MAX,
  SPRITE_DISPLAY_SCALE_MIN,
  SPRITE_DISPLAY_SCALE_PERCENT_MAX,
  SPRITE_DISPLAY_SCALE_PERCENT_MIN,
  hasSpriteDisplayMode,
  normalizeSpriteDisplayModes,
  type SpriteDisplayMode,
} from "./sprite-display-modes";
import { SettingsSwitch } from "../panels/settings/SettingControls";
import { useTranslation as useUiTranslation } from "react-i18next";

export type KnowledgeAgentType = "knowledge-retrieval" | "knowledge-router";

export type AgentAddSetupState = {
  secretPlotEnabled: boolean;
  secretPlotRunInterval: number;
  proseGuardianBanned: string;
  proseGuardianAvoid: string;
  proseGuardianPrefer: string;
  holdForRewrite: boolean;
  lorebookKeeperTargetLorebookId: string;
  lorebookKeeperReadBehindMessages: number;
  knowledgeSources: Partial<Record<KnowledgeAgentType, KnowledgeAgentSourceSettings>>;
  promptTemplateId: string;
  includeCharacterAppearance: boolean;
  useAvatarReferences: boolean;
  spriteCharacterIds: string[];
  spriteDisplayModes: SpriteDisplayMode[];
  expressionAvatarsEnabled: boolean;
  spritePosition: "left" | "right";
  spriteScale: number;
  expressionSpriteScale: number;
  fullBodySpriteScale: number;
  spriteOpacity: number;
  expressionSpriteOpacity: number;
  fullBodySpriteOpacity: number;
};

export type AgentAddSpriteSubject = {
  id: string;
  name: string;
  subtitle?: string | null;
  avatarPath?: string | null;
};

export const DEFAULT_PROSE_GUARDIAN_BANNED_WORDS = "ozone";
export const DEFAULT_PROSE_GUARDIAN_AVOID =
  "no repetition of any phrases or sentence structure from the last messages, if the last output started with dialogue line, this one needs to start with narration, no purple prose";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(source: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(max, Math.trunc(numeric)));
}

function normalizePositiveInteger(value: unknown, fallback: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(numeric)));
}

function normalizeSpriteDisplayValue(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function clampSpriteDisplayPercent(value: number): number {
  return Math.max(SPRITE_DISPLAY_SCALE_PERCENT_MIN, Math.min(SPRITE_DISPLAY_SCALE_PERCENT_MAX, value));
}

function clampSpriteOpacityPercent(value: number): number {
  return Math.max(SPRITE_DISPLAY_OPACITY_PERCENT_MIN, Math.min(SPRITE_DISPLAY_OPACITY_PERCENT_MAX, value));
}

function readKnowledgeOverride(sources: unknown, agentType: KnowledgeAgentType): Record<string, unknown> | null {
  if (!isRecord(sources)) return null;
  const entry = sources[agentType];
  return isRecord(entry) ? entry : null;
}

function normalizeKnowledgeAgentSourceSettings(
  agentType: KnowledgeAgentType,
  baseSettings: Record<string, unknown>,
  metadataSources: unknown,
): KnowledgeAgentSourceSettings {
  const defaultSettings = getDefaultBuiltInAgentSettings(agentType);
  const override = readKnowledgeOverride(metadataSources, agentType);
  const useChatActiveLorebooks =
    typeof override?.useChatActiveLorebooks === "boolean"
      ? override.useChatActiveLorebooks
      : typeof baseSettings.useChatActiveLorebooks === "boolean"
        ? baseSettings.useChatActiveLorebooks
        : defaultSettings.useChatActiveLorebooks === true;
  const sourceLorebookIds =
    override && hasOwn(override, "sourceLorebookIds")
      ? normalizeStringArray(override.sourceLorebookIds)
      : normalizeStringArray(baseSettings.sourceLorebookIds);
  const sourceFileIds =
    agentType === "knowledge-retrieval"
      ? override && hasOwn(override, "sourceFileIds")
        ? normalizeStringArray(override.sourceFileIds)
        : normalizeStringArray(baseSettings.sourceFileIds)
      : [];

  return {
    useChatActiveLorebooks,
    sourceLorebookIds,
    ...(agentType === "knowledge-retrieval" ? { sourceFileIds } : {}),
  };
}

function readPromptTemplateId(
  metadata: Record<string, unknown>,
  agentId: string,
  settings: Record<string, unknown>,
): string {
  const selections = normalizeAgentPromptTemplateSelectionMap(metadata.agentPromptTemplateIds);
  return selections[agentId] ?? resolveDefaultAgentPromptTemplateId(settings);
}

export function buildInitialAgentAddSetupState({
  agentId,
  settings,
  metadata,
  roleplaySpriteScale,
  allowSecretPlot = true,
}: {
  agentId: string;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  roleplaySpriteScale: number;
  allowSecretPlot?: boolean;
}): AgentAddSetupState {
  const proseBanned = readString(settings.banned, DEFAULT_PROSE_GUARDIAN_BANNED_WORDS);
  const proseAvoid = readString(settings.avoid, DEFAULT_PROSE_GUARDIAN_AVOID);
  const spriteScale = normalizeSpriteDisplayValue(
    metadata.spriteScale,
    roleplaySpriteScale,
    SPRITE_DISPLAY_SCALE_MIN,
    SPRITE_DISPLAY_SCALE_MAX,
  );
  const spriteOpacity = normalizeSpriteDisplayValue(
    metadata.spriteOpacity,
    1,
    SPRITE_DISPLAY_OPACITY_MIN,
    SPRITE_DISPLAY_OPACITY_MAX,
  );

  return {
    secretPlotEnabled:
      allowSecretPlot &&
      (typeof metadata.narrativeDirectorSecretPlotEnabled === "boolean"
        ? metadata.narrativeDirectorSecretPlotEnabled
        : settings.secretPlotEnabled === true),
    secretPlotRunInterval: normalizePositiveInteger(
      metadata.narrativeDirectorSecretPlotRunInterval ?? settings.secretPlotRunInterval,
      8,
      100,
    ),
    proseGuardianBanned: proseBanned,
    proseGuardianAvoid: proseAvoid,
    proseGuardianPrefer: readString(settings.prefer),
    holdForRewrite: settings.holdForRewrite !== false,
    lorebookKeeperTargetLorebookId: readString(metadata.lorebookKeeperTargetLorebookId),
    lorebookKeeperReadBehindMessages: normalizeNonNegativeInteger(metadata.lorebookKeeperReadBehindMessages, 0, 100),
    knowledgeSources: {
      "knowledge-retrieval": normalizeKnowledgeAgentSourceSettings(
        "knowledge-retrieval",
        agentId === "knowledge-retrieval" ? settings : {},
        metadata.knowledgeAgentSources,
      ),
      "knowledge-router": normalizeKnowledgeAgentSourceSettings(
        "knowledge-router",
        agentId === "knowledge-router" ? settings : {},
        metadata.knowledgeAgentSources,
      ),
    },
    promptTemplateId: readPromptTemplateId(metadata, agentId, settings),
    includeCharacterAppearance:
      typeof metadata.illustratorIncludeCharacterAppearance === "boolean"
        ? metadata.illustratorIncludeCharacterAppearance
        : settings.includeCharacterAppearance === true,
    useAvatarReferences:
      typeof metadata.illustratorUseAvatarReferences === "boolean"
        ? metadata.illustratorUseAvatarReferences
        : settings.useAvatarReferences === true,
    spriteCharacterIds: normalizeStringArray(metadata.spriteCharacterIds),
    spriteDisplayModes: normalizeSpriteDisplayModes(metadata.spriteDisplayModes),
    expressionAvatarsEnabled: metadata.expressionAvatarsEnabled === true,
    spritePosition: metadata.spritePosition === "right" ? "right" : "left",
    spriteScale,
    expressionSpriteScale: normalizeSpriteDisplayValue(
      metadata.expressionSpriteScale,
      spriteScale,
      SPRITE_DISPLAY_SCALE_MIN,
      SPRITE_DISPLAY_SCALE_MAX,
    ),
    fullBodySpriteScale: normalizeSpriteDisplayValue(
      metadata.fullBodySpriteScale,
      spriteScale,
      SPRITE_DISPLAY_SCALE_MIN,
      SPRITE_DISPLAY_SCALE_MAX,
    ),
    spriteOpacity,
    expressionSpriteOpacity: normalizeSpriteDisplayValue(
      metadata.expressionSpriteOpacity,
      spriteOpacity,
      SPRITE_DISPLAY_OPACITY_MIN,
      SPRITE_DISPLAY_OPACITY_MAX,
    ),
    fullBodySpriteOpacity: normalizeSpriteDisplayValue(
      metadata.fullBodySpriteOpacity,
      spriteOpacity,
      SPRITE_DISPLAY_OPACITY_MIN,
      SPRITE_DISPLAY_OPACITY_MAX,
    ),
  };
}

export function applyAgentAddSetupToAgentSettings(
  agentId: string,
  setup: AgentAddSetupState,
  settings: Record<string, unknown>,
  options?: { allowSecretPlot?: boolean },
): Record<string, unknown> {
  const next = { ...settings };
  if (agentId === "director") {
    next.secretPlotEnabled = options?.allowSecretPlot === false ? false : setup.secretPlotEnabled;
    next.secretPlotRunInterval = setup.secretPlotRunInterval;
    delete next.runInterval;
  }
  if (agentId === "prose-guardian") {
    next.banned = setup.proseGuardianBanned.trim();
    next.avoid = setup.proseGuardianAvoid.trim();
    next.prefer = setup.proseGuardianPrefer.trim();
    next.holdForRewrite = setup.holdForRewrite;
  }
  if (agentId === "continuity" || agentId === "html") {
    next.holdForRewrite = setup.holdForRewrite;
  }
  if (agentId === "knowledge-retrieval" || agentId === "knowledge-router") {
    next.useChatActiveLorebooks = setup.knowledgeSources[agentId]?.useChatActiveLorebooks !== false;
    next.sourceLorebookIds = setup.knowledgeSources[agentId]?.sourceLorebookIds ?? [];
    if (agentId === "knowledge-retrieval") {
      next.sourceFileIds = setup.knowledgeSources[agentId]?.sourceFileIds ?? [];
    } else {
      delete next.sourceFileIds;
    }
  }
  if (agentId === "illustrator") {
    next.includeCharacterAppearance = setup.includeCharacterAppearance;
    next.useAvatarReferences = setup.useAvatarReferences;
  }
  return next;
}

export function buildAgentAddMetadataPatch(
  agentId: string,
  setup: AgentAddSetupState,
  metadata: Record<string, unknown>,
  options?: {
    allowSecretPlot?: boolean;
    defaultPromptTemplateId?: string;
    illustratorDefaults?: { includeCharacterAppearance: boolean; useAvatarReferences: boolean };
  },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  const existingPromptSelections = normalizeAgentPromptTemplateSelectionMap(metadata.agentPromptTemplateIds);
  const nextPromptSelections = { ...existingPromptSelections };
  const defaultPromptTemplateId =
    options?.defaultPromptTemplateId ?? resolveDefaultAgentPromptTemplateId(getDefaultBuiltInAgentSettings(agentId));
  if (setup.promptTemplateId && setup.promptTemplateId !== defaultPromptTemplateId) {
    nextPromptSelections[agentId] = setup.promptTemplateId;
  } else {
    delete nextPromptSelections[agentId];
  }
  if (
    existingPromptSelections[agentId] !== nextPromptSelections[agentId] ||
    Object.keys(existingPromptSelections).length !== Object.keys(nextPromptSelections).length
  ) {
    patch.agentPromptTemplateIds = nextPromptSelections;
  }

  if (agentId === "director") {
    patch.narrativeDirectorSecretPlotEnabled = options?.allowSecretPlot === false ? false : setup.secretPlotEnabled;
    patch.narrativeDirectorSecretPlotRunInterval = setup.secretPlotRunInterval;
  }
  if (agentId === "prose-guardian") {
    patch.proseGuardianBannedWords = setup.proseGuardianBanned.trim();
    patch.proseGuardianAvoidInstructions = setup.proseGuardianAvoid.trim();
    patch.proseGuardianStyleInstructions = setup.proseGuardianPrefer.trim();
    patch.proseGuardianHoldForRewrite = setup.holdForRewrite;
  }
  if (agentId === "continuity" || agentId === "html") patch.proseGuardianHoldForRewrite = setup.holdForRewrite;
  if (agentId === "knowledge-retrieval" || agentId === "knowledge-router") {
    const currentSources = isRecord(metadata.knowledgeAgentSources) ? metadata.knowledgeAgentSources : {};
    patch.knowledgeAgentSources = {
      ...currentSources,
      [agentId]: setup.knowledgeSources[agentId],
    };
  }
  if (agentId === "lorebook-keeper") {
    patch.lorebookKeeperTargetLorebookId = setup.lorebookKeeperTargetLorebookId || null;
    patch.lorebookKeeperReadBehindMessages = setup.lorebookKeeperReadBehindMessages;
  }
  if (agentId === "expression") {
    patch.spriteDisplayModes = setup.spriteDisplayModes;
    patch.expressionAvatarsEnabled = setup.expressionAvatarsEnabled;
    patch.spriteCharacterIds = setup.spriteCharacterIds;
    patch.spritePosition = setup.spritePosition;
    patch.spriteScale = setup.expressionSpriteScale;
    patch.expressionSpriteScale = setup.expressionSpriteScale;
    patch.fullBodySpriteScale = setup.fullBodySpriteScale;
    patch.spriteOpacity = setup.expressionSpriteOpacity;
    patch.expressionSpriteOpacity = setup.expressionSpriteOpacity;
    patch.fullBodySpriteOpacity = setup.fullBodySpriteOpacity;
  }
  if (agentId === "illustrator") {
    const defaults = options?.illustratorDefaults;
    const applyIllustratorDefault = (
      key: "illustratorIncludeCharacterAppearance" | "illustratorUseAvatarReferences",
      value: boolean,
      defaultValue: boolean | undefined,
    ) => {
      if (defaultValue === undefined || value !== defaultValue) patch[key] = value;
      else if (hasOwn(metadata, key)) patch[key] = null;
    };
    applyIllustratorDefault(
      "illustratorIncludeCharacterAppearance",
      setup.includeCharacterAppearance,
      defaults?.includeCharacterAppearance,
    );
    applyIllustratorDefault("illustratorUseAvatarReferences", setup.useAvatarReferences, defaults?.useAvatarReferences);
  }

  return patch;
}

function SetupLabel({ children }: { children: ReactNode }) {
  return <span className="text-[0.625rem] font-medium text-[var(--foreground)]">{children}</span>;
}

function SetupTextarea({
  label,
  value,
  placeholder,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <SetupLabel>{label}</SetupLabel>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows ?? 3}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[3.25rem] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)]/45 focus:border-[var(--primary)]/50 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function SetupToggle({
  label,
  description,
  enabled,
  disabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <SettingsSwitch
      label={label}
      description={description}
      checked={enabled}
      onChange={onToggle}
      disabled={disabled}
      labelPosition="start"
      className={cn(
        "w-full justify-between rounded-md px-3 py-2.5 text-left",
        enabled
          ? "bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/30"
          : "bg-[var(--background)]/75 ring-1 ring-[var(--border)] hover:bg-[var(--accent)]",
      )}
      labelClassName="text-[0.6875rem] font-medium"
    />
  );
}

function PromptTemplateSelect({
  options,
  value,
  disabled,
  onChange,
}: {
  options: AgentPromptTemplateOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  if (options.length <= 1) return null;
  const activeOption = options.find((option) => option.id === value) ?? options[0];
  return (
    <div className="rounded-lg bg-[var(--background)]/75 px-3 py-2 ring-1 ring-[var(--border)]">
      <label className="flex flex-col gap-1.5">
        <SetupLabel>{localizeUi("ui.chat.prompttemplateselect.promptMode")}</SetupLabel>
        <select
          value={activeOption?.id ?? DEFAULT_AGENT_PROMPT_TEMPLATE_ID}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md bg-[var(--secondary)] px-2 py-1.5 text-[0.6875rem] text-[var(--foreground)] ring-1 ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {activeOption?.description ? (
        <p className="mt-1.5 text-[0.5625rem] leading-snug text-[var(--muted-foreground)]">
          {activeOption.description}
        </p>
      ) : null}
    </div>
  );
}

function KnowledgeSourceFields({
  agentType,
  lorebooks,
  settings,
  disabled,
  onChange,
}: {
  agentType: KnowledgeAgentType;
  lorebooks: Lorebook[];
  settings: KnowledgeAgentSourceSettings;
  disabled?: boolean;
  onChange: (patch: Partial<KnowledgeAgentSourceSettings>) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const knowledgeSourcesQuery = useKnowledgeSources();
  const uploadSource = useUploadKnowledgeSource();
  const sourceLorebookIds = settings.sourceLorebookIds ?? [];
  const sourceFileIds = settings.sourceFileIds ?? [];
  const isRetrieval = agentType === "knowledge-retrieval";

  return (
    <div className="space-y-2.5 rounded-lg bg-[var(--background)]/65 px-3 py-2.5 ring-1 ring-[var(--border)]">
      <SetupToggle
        label={localizeUi("ui.chat.knowledgesourcefields.useChatActiveLorebooks")}
        description={
          sourceLorebookIds.length > 0
            ? localizeUi("ui.chat.knowledgesourcefields.fixedSourceLorebooksAreSelectedBelowSoTheyOverride")
            : localizeUi("ui.chat.knowledgesourcefields.useTheLorebooksCurrentlyActiveForThisChatWhen")
        }
        enabled={settings.useChatActiveLorebooks !== false}
        disabled={disabled}
        onToggle={() => onChange({ useChatActiveLorebooks: settings.useChatActiveLorebooks === false })}
      />

      <div className="space-y-1.5">
        <SetupLabel>{localizeUi("ui.chat.knowledgesourcefields.fixedSourceLorebooks")}</SetupLabel>
        {lorebooks.length > 0 ? (
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]/75 p-2">
            {lorebooks.map((lorebook) => {
              const selected = sourceLorebookIds.includes(lorebook.id);
              return (
                <button
                  key={lorebook.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      sourceLorebookIds: selected
                        ? sourceLorebookIds.filter((id) => id !== lorebook.id)
                        : [...sourceLorebookIds, lorebook.id],
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]/30"
                      : "bg-[var(--secondary)] text-[var(--foreground)] ring-1 ring-transparent hover:bg-[var(--accent)]",
                  )}
                  aria-pressed={selected}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                      selected
                        ? "border-[var(--primary)]/60 bg-[var(--primary)]/20"
                        : "border-[var(--border)] bg-[var(--background)]",
                    )}
                  >
                    {selected && <Check size="0.625rem" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{lorebook.name}</span>
                    {lorebook.description ? (
                      <span className="block truncate text-[0.625rem] text-[var(--muted-foreground)]">
                        {lorebook.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-[var(--background)]/75 px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
            {localizeUi("ui.agents.agenteditor.noLorebooksAvailable")}
          </p>
        )}
      </div>

      {isRetrieval && (
        <div className="space-y-1.5">
          <SetupLabel>{localizeUi("ui.chat.knowledgesourcefields.uploadedFiles")}</SetupLabel>
          {knowledgeSourcesQuery.data?.length ? (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]/75 p-2">
              {knowledgeSourcesQuery.data.map((source) => {
                const selected = sourceFileIds.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        sourceFileIds: selected
                          ? sourceFileIds.filter((id) => id !== source.id)
                          : [...sourceFileIds, source.id],
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-60",
                      selected
                        ? "bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]/30"
                        : "bg-[var(--secondary)] text-[var(--foreground)] ring-1 ring-transparent hover:bg-[var(--accent)]",
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                        selected
                          ? "border-[var(--primary)]/60 bg-[var(--primary)]/20"
                          : "border-[var(--border)] bg-[var(--background)]",
                      )}
                    >
                      {selected && <Check size="0.625rem" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{source.originalName}</span>
                      <span className="block text-[0.625rem] text-[var(--muted-foreground)]">
                        {(source.size / 1024).toFixed(1)} {localizeUi("ui.agents.agenteditor.kb")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-[var(--background)]/75 px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
              {localizeUi("ui.chat.knowledgesourcefields.noUploadedKnowledgeFilesYet")}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.tsv,.pdf"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const uploaded = await uploadSource.mutateAsync(file);
                onChange({ sourceFileIds: Array.from(new Set([...sourceFileIds, uploaded.id])) });
              } catch (error) {
                await showAlertDialog({
                  title: "Couldn't Upload File",
                  message: error instanceof Error ? error.message : "The file could not be uploaded.",
                });
              } finally {
                event.target.value = "";
              }
            }}
          />
          <button
            type="button"
            disabled={disabled || uploadSource.isPending}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-all",
              uploadSource.isPending
                ? "cursor-wait border-[var(--border)] text-[var(--muted-foreground)]/60"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
            )}
          >
            {uploadSource.isPending ? (
              <>
                <Loader2 size="0.8125rem" className="animate-spin" />
                {localizeUi("ui.noodle.noodleprofilesurface.uploading")}
              </>
            ) : (
              <>
                <Upload size="0.8125rem" />
                {localizeUi("ui.chat.knowledgesourcefields.uploadFile")}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function SpriteDisplayModeToggle({
  modes,
  disabled,
  onToggle,
}: {
  modes: readonly SpriteDisplayMode[];
  disabled?: boolean;
  onToggle: (mode: SpriteDisplayMode) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const options: Array<{ id: SpriteDisplayMode; label: string }> = [
    { id: "expressions", label: "Expressions" },
    { id: "full-body", label: "Full-body" },
  ];

  return (
    <div className="space-y-1.5 rounded-lg bg-[var(--background)]/75 px-3 py-2 ring-1 ring-[var(--border)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-medium text-[var(--foreground)]">
          {localizeUi("ui.chat.spritedisplaymodetoggle.spriteSource")}
        </span>
        <span className="text-[0.5625rem] text-[var(--muted-foreground)]">
          {localizeUi("ui.chat.spritedisplaymodetoggle.chooseOneOrBoth")}
        </span>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-md ring-1 ring-[var(--border)]">
        {options.map((option, index) => {
          const active = hasSpriteDisplayMode(modes, option.id);
          const isLastActive = active && modes.length === 1;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              disabled={disabled || isLastActive}
              className={cn(
                "min-w-0 px-2.5 py-1.5 text-[0.625rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                index > 0 && "border-l border-[var(--border)]",
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpriteRangeSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-[var(--secondary)]/50 px-2.5 py-2 text-[0.625rem] text-[var(--muted-foreground)]">
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-[0.5625rem] tabular-nums text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 w-full cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ExpressionSetupFields({
  value,
  spriteSubjects,
  disabled,
  onChange,
}: {
  value: AgentAddSetupState;
  spriteSubjects: AgentAddSpriteSubject[];
  disabled?: boolean;
  onChange: (patch: Partial<AgentAddSetupState>) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const spriteQueries = useQueries({
    queries: spriteSubjects.map((subject) => ({
      queryKey: ["sprites", subject.id],
      queryFn: () => api.get<Array<{ expression: string; filename: string; url: string }>>(`/sprites/${subject.id}`),
      enabled: !!subject.id,
      staleTime: 5 * 60_000,
    })),
  });
  const subjectsWithSprites = spriteSubjects.filter((_, index) => {
    const sprites = spriteQueries[index]?.data;
    return Array.isArray(sprites) && sprites.length > 0;
  });
  const selectableSpriteIds = new Set(subjectsWithSprites.map((subject) => subject.id));
  const selectedSpriteIds = value.spriteCharacterIds.filter((id) => selectableSpriteIds.has(id));
  const loading =
    spriteSubjects.length > 0 && subjectsWithSprites.length === 0 && spriteQueries.some((query) => query.isLoading);

  const toggleSprite = (id: string) => {
    if (selectedSpriteIds.includes(id)) {
      onChange({ spriteCharacterIds: selectedSpriteIds.filter((current) => current !== id) });
      return;
    }
    onChange({ spriteCharacterIds: [...selectedSpriteIds, id] });
  };

  const toggleDisplayMode = (mode: SpriteDisplayMode) => {
    const current = value.spriteDisplayModes;
    const next = current.includes(mode) ? current.filter((entry) => entry !== mode) : [...current, mode];
    onChange({ spriteDisplayModes: next.length > 0 ? next : [...DEFAULT_SPRITE_DISPLAY_MODES] });
  };

  return (
    <div className="space-y-2.5 rounded-lg bg-[var(--background)]/65 px-3 py-2.5 ring-1 ring-[var(--border)]">
      <SpriteDisplayModeToggle modes={value.spriteDisplayModes} disabled={disabled} onToggle={toggleDisplayMode} />
      <SetupToggle
        label={localizeUi("ui.chat.expressionsetupfields.expressionAvatars")}
        description={localizeUi("ui.chat.expressionsetupfields.replaceMessageAvatarsWithTheSelectedExpressionSprite")}
        enabled={value.expressionAvatarsEnabled}
        disabled={disabled}
        onToggle={() => onChange({ expressionAvatarsEnabled: !value.expressionAvatarsEnabled })}
      />

      <div className="space-y-1.5">
        <SetupLabel>{localizeUi("ui.chat.expressionsetupfields.spriteOwners")}</SetupLabel>
        {subjectsWithSprites.length > 0 ? (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]/75 p-2">
            {subjectsWithSprites.map((subject) => {
              const active = selectedSpriteIds.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSprite(subject.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--foreground)] ring-1 ring-[var(--primary)]/30"
                      : "bg-[var(--secondary)] text-[var(--foreground)] ring-1 ring-transparent hover:bg-[var(--accent)]",
                  )}
                >
                  {subject.avatarPath ? (
                    <img
                      src={subject.avatarPath}
                      alt={subject.name}
                      loading="lazy"
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[0.625rem] font-bold">
                      {subject.name[0]}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{subject.name}</span>
                    {subject.subtitle ? (
                      <span className="block truncate text-[0.625rem] text-[var(--muted-foreground)]">
                        {subject.subtitle}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[0.625rem] text-[var(--muted-foreground)]">
                    {active ? localizeUi("ui.noodle.noodlehome.enabled") : localizeUi("ui.presets.sectionstab.enable")}
                  </span>
                </button>
              );
            })}
          </div>
        ) : loading ? (
          <p className="rounded-lg bg-[var(--background)]/75 px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
            {localizeUi("ui.chat.expressionsetupfields.checkingAddedCharactersForUploadedSprites")}
          </p>
        ) : (
          <p className="rounded-lg bg-[var(--background)]/75 px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
            {localizeUi("ui.chat.expressionsetupfields.noAddedCharacterOrPersonaHasUploadedSpritesYet")}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-[var(--background)]/75 px-3 py-2 ring-1 ring-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[0.6875rem] text-[var(--muted-foreground)]">
            {localizeUi("ui.chat.expressionsetupfields.spriteLayout")}
          </span>
          <div className="flex rounded-md ring-1 ring-[var(--border)]">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ spritePosition: side })}
                className={cn(
                  "px-2.5 py-1 text-[0.625rem] font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  side === "left" ? "rounded-l-md" : "rounded-r-md",
                  value.spritePosition === side
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                )}
              >
                {side}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SpriteRangeSlider
            label={localizeUi("ui.chat.expressionsetupfields.expressionSize")}
            value={Math.round(value.expressionSpriteScale * 100)}
            min={SPRITE_DISPLAY_SCALE_PERCENT_MIN}
            max={SPRITE_DISPLAY_SCALE_PERCENT_MAX}
            step={5}
            suffix="%"
            disabled={disabled}
            onChange={(percent) => {
              const clampedPercent = clampSpriteDisplayPercent(percent);
              onChange({ spriteScale: clampedPercent / 100, expressionSpriteScale: clampedPercent / 100 });
            }}
          />
          <SpriteRangeSlider
            label={localizeUi("ui.chat.expressionsetupfields.fullBodySize")}
            value={Math.round(value.fullBodySpriteScale * 100)}
            min={SPRITE_DISPLAY_SCALE_PERCENT_MIN}
            max={SPRITE_DISPLAY_SCALE_PERCENT_MAX}
            step={5}
            suffix="%"
            disabled={disabled}
            onChange={(percent) => onChange({ fullBodySpriteScale: clampSpriteDisplayPercent(percent) / 100 })}
          />
          <SpriteRangeSlider
            label={localizeUi("ui.chat.expressionsetupfields.expressionOpacity")}
            value={Math.round(value.expressionSpriteOpacity * 100)}
            min={SPRITE_DISPLAY_OPACITY_PERCENT_MIN}
            max={SPRITE_DISPLAY_OPACITY_PERCENT_MAX}
            step={5}
            suffix="%"
            disabled={disabled}
            onChange={(percent) => {
              const clampedPercent = clampSpriteOpacityPercent(percent);
              onChange({ spriteOpacity: clampedPercent / 100, expressionSpriteOpacity: clampedPercent / 100 });
            }}
          />
          <SpriteRangeSlider
            label={localizeUi("ui.chat.expressionsetupfields.fullBodyOpacity")}
            value={Math.round(value.fullBodySpriteOpacity * 100)}
            min={SPRITE_DISPLAY_OPACITY_PERCENT_MIN}
            max={SPRITE_DISPLAY_OPACITY_PERCENT_MAX}
            step={5}
            suffix="%"
            disabled={disabled}
            onChange={(percent) => onChange({ fullBodySpriteOpacity: clampSpriteOpacityPercent(percent) / 100 })}
          />
        </div>
      </div>
    </div>
  );
}

export function AgentAddSetupFields({
  agentId,
  value,
  disabled,
  lorebooks,
  promptOptions,
  spriteSubjects,
  allowSecretPlotControls = true,
  onChange,
}: {
  agentId: string;
  value: AgentAddSetupState;
  disabled?: boolean;
  lorebooks: Lorebook[];
  promptOptions: AgentPromptTemplateOption[];
  spriteSubjects?: AgentAddSpriteSubject[];
  allowSecretPlotControls?: boolean;
  onChange: (patch: Partial<AgentAddSetupState>) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const knowledgeAgentType = agentId === "knowledge-retrieval" || agentId === "knowledge-router" ? agentId : null;
  const knowledgeSettings = knowledgeAgentType ? value.knowledgeSources[knowledgeAgentType] : null;
  const hasSpecificSetup =
    promptOptions.length > 1 ||
    agentId === "director" ||
    agentId === "prose-guardian" ||
    agentId === "continuity" ||
    agentId === "html" ||
    agentId === "lorebook-keeper" ||
    knowledgeAgentType ||
    agentId === "illustrator" ||
    agentId === "expression";

  if (!hasSpecificSetup) return null;

  return (
    <div className="space-y-3">
      <PromptTemplateSelect
        options={promptOptions}
        value={value.promptTemplateId}
        disabled={disabled}
        onChange={(promptTemplateId) => onChange({ promptTemplateId })}
      />

      {agentId === "illustrator" && (
        <div className="space-y-2">
          <SetupToggle
            label={localizeUi("ui.chat.agentaddsetupfields.attachCardAppearance")}
            description={localizeUi(
              "ui.chat.agentaddsetupfields.appendMatchedCharacterAppearanceLinesToImagePromptsUsing",
            )}
            enabled={value.includeCharacterAppearance}
            disabled={disabled}
            onToggle={() => onChange({ includeCharacterAppearance: !value.includeCharacterAppearance })}
          />
          <SetupToggle
            label={localizeUi("ui.chat.agentaddsetupfields.sendAvatarReferences")}
            description={localizeUi("ui.chat.agentaddsetupfields.sendMatchingCharacterAndPersonaAvatarsOrSpritesAs")}
            enabled={value.useAvatarReferences}
            disabled={disabled}
            onToggle={() => onChange({ useAvatarReferences: !value.useAvatarReferences })}
          />
        </div>
      )}

      {agentId === "director" && (
        <div className="space-y-2">
          <p className="rounded-lg bg-[var(--background)]/65 px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
            {localizeUi("ui.chat.agentaddsetupfields.chooseBetweenANaturalOrRandomPushEachTime")}
          </p>
          {allowSecretPlotControls && (
            <SetupToggle
              label={localizeUi("ui.agents.agenteditor.secretPlot")}
              description={localizeUi("ui.chat.agentaddsetupfields.maintainAHiddenLongTermArcForRoleplayPrompts")}
              enabled={value.secretPlotEnabled}
              disabled={disabled}
              onToggle={() => onChange({ secretPlotEnabled: !value.secretPlotEnabled })}
            />
          )}
          {allowSecretPlotControls && value.secretPlotEnabled && (
            <label className="flex flex-col gap-1 rounded-lg bg-[var(--background)]/65 px-3 py-2 ring-1 ring-[var(--border)]">
              <SetupLabel>{localizeUi("ui.agents.agenteditor.runInterval")}</SetupLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={value.secretPlotRunInterval}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      secretPlotRunInterval: normalizePositiveInteger(
                        event.target.value,
                        value.secretPlotRunInterval,
                        100,
                      ),
                    })
                  }
                  className="w-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs tabular-nums text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="text-[0.625rem] text-[var(--muted-foreground)]">
                  {localizeUi("ui.agents.agenteditor.assistantMessages")}
                </span>
              </div>
            </label>
          )}
        </div>
      )}

      {agentId === "prose-guardian" && (
        <div className="space-y-2.5 rounded-lg bg-[var(--background)]/65 px-3 py-2.5 ring-1 ring-[var(--border)]">
          <div className="grid gap-2 sm:grid-cols-2">
            <SetupTextarea
              label={localizeUi("ui.agents.agenteditor.bannedWords")}
              value={value.proseGuardianBanned}
              placeholder={DEFAULT_PROSE_GUARDIAN_BANNED_WORDS}
              rows={2}
              disabled={disabled}
              onChange={(proseGuardianBanned) => onChange({ proseGuardianBanned })}
            />
            <SetupTextarea
              label={localizeUi("ui.agents.agenteditor.preferInWriting")}
              value={value.proseGuardianPrefer}
              placeholder={localizeUi("ui.agents.agenteditor.optionalStyleNotesPhrasesOrAuthorialPreferences")}
              rows={2}
              disabled={disabled}
              onChange={(proseGuardianPrefer) => onChange({ proseGuardianPrefer })}
            />
          </div>
          <SetupTextarea
            label={localizeUi("ui.agents.agenteditor.removeFromWriting")}
            value={value.proseGuardianAvoid}
            placeholder={DEFAULT_PROSE_GUARDIAN_AVOID}
            rows={3}
            disabled={disabled}
            onChange={(proseGuardianAvoid) => onChange({ proseGuardianAvoid })}
          />
        </div>
      )}

      {(agentId === "prose-guardian" || agentId === "continuity" || agentId === "html") && (
        <SetupToggle
          label={localizeUi("ui.chat.agentaddsetupfields.holdMessageUntilRewrite")}
          description={
            value.holdForRewrite
              ? localizeUi("ui.chat.agentaddsetupfields.showTheRewriteWorkingIndicatorThenRevealTheEdited")
              : localizeUi("ui.chat.agentaddsetupfields.streamTheOriginalMessageNormallyThenReplaceItIf")
          }
          enabled={value.holdForRewrite}
          disabled={disabled}
          onToggle={() => onChange({ holdForRewrite: !value.holdForRewrite })}
        />
      )}

      {agentId === "lorebook-keeper" && (
        <div className="grid gap-2 rounded-lg bg-[var(--background)]/65 px-3 py-2.5 ring-1 ring-[var(--border)] sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-[0.625rem] text-[var(--muted-foreground)]">
            <SetupLabel>{localizeUi("ui.chat.agentaddsetupfields.targetLorebook")}</SetupLabel>
            <select
              value={value.lorebookKeeperTargetLorebookId}
              disabled={disabled}
              onChange={(event) => onChange({ lorebookKeeperTargetLorebookId: event.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{localizeUi("ui.chat.agentaddsetupfields.autoSelectFirstWritableLorebook")}</option>
              {lorebooks.map((lorebook) => (
                <option key={lorebook.id} value={lorebook.id}>
                  {lorebook.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.625rem] text-[var(--muted-foreground)]">
            <SetupLabel>{localizeUi("ui.chat.agentaddsetupfields.readBehind")}</SetupLabel>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={value.lorebookKeeperReadBehindMessages}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  lorebookKeeperReadBehindMessages: normalizeNonNegativeInteger(event.target.value, 0, 100),
                })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
      )}

      {knowledgeAgentType && knowledgeSettings && (
        <KnowledgeSourceFields
          agentType={knowledgeAgentType}
          lorebooks={lorebooks}
          settings={knowledgeSettings}
          disabled={disabled}
          onChange={(patch) =>
            onChange({
              knowledgeSources: {
                ...value.knowledgeSources,
                [knowledgeAgentType]: {
                  ...knowledgeSettings,
                  ...patch,
                  ...(knowledgeAgentType === "knowledge-router" ? { sourceFileIds: [] } : {}),
                },
              },
            })
          }
        />
      )}

      {agentId === "expression" && (
        <ExpressionSetupFields
          value={value}
          spriteSubjects={spriteSubjects ?? []}
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </div>
  );
}
