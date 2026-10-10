// ──────────────────────────────────────────────
// Chat: Roleplay HUD — immersive world-state widgets
// Package controls and the manual tracker trigger remain in the compact strip.
// ──────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api-client";
import { useGameStateStore } from "../../stores/game-state.store";
import { useAgentStore } from "../../stores/agent.store";
import { useGameStatePatcher } from "../../hooks/use-game-state-patcher";
import { useUIStore } from "../../stores/ui.store";
import {
  partitionTrackerCapabilityPackages,
  useInstalledCapabilityPackages,
} from "../../hooks/use-capability-packages";
import { CapabilityElement } from "../capabilities/CapabilityElement";
import { TrackerLockProvider, useTrackerLockContext } from "../../features/tracker-panel/components/TrackerLockContext";
import { buildInventoryTrackerEditPatch } from "../../features/tracker-panel/lib/inventory-tracker-edit";
import { useTrackerFieldLockUpdater } from "../../features/tracker-panel/hooks/use-tracker-field-lock-updater";
import {
  CHAT_TOOLBAR_ICON_GAP_CLASS,
  CHAT_TOOLBAR_MOBILE_OVERFLOW_HEIGHT_CLASS,
  getChatToolbarButtonClass,
} from "./ChatToolbarControls";
import type {
  GameState,
  InventoryTrackerGroup,
  InventoryTrackerRow,
  TrackerHiddenFields,
  InstalledCapabilityPackage,
} from "@marinara-engine/shared";
import {
  isNamedTrackerRow,
  normalizeTrackerFieldLocksForState,
  normalizeTrackerHiddenFields,
  toggleTrackerFieldLock,
} from "@marinara-engine/shared";

const EMPTY_AGENT_TYPE_SET = new Set<string>();

interface RoleplayHUDProps {
  chatId: string;
  isStreaming: boolean;
  onRetriggerTrackers?: () => void;
  /** Re-run one tracker agent only (same pipeline as full tracker run). */
  onRerunSingleTracker?: (agentType: string) => void;
  /** When true, tracker agents are manual — show a trigger button in the widget strip */
  manualTrackers?: boolean;
  /** When provided, overrides the globally-computed set so that only per-chat agents show widgets. */
  enabledAgentTypes?: Set<string>;
}

/** Installed tracker packages the chat runs that draw in the Roleplay HUD. */
export function selectRoleplayTrackerPackages(
  installed: readonly InstalledCapabilityPackage[],
  enabledAgentTypes: Set<string>,
) {
  return installed.filter(
    (item) =>
      item.status === "active" &&
      enabledAgentTypes.has(item.id) &&
      Boolean(item.manifest.entrypoints.client) &&
      item.manifest.contributions?.slots?.includes("roleplay-tracker"),
  );
}

/**
 * Live tracker values and their edit handlers, shared by the HUD and the Tracker window. Each caller
 * passes its own `registrationId` so their pending edits flush independently.
 */
export function useRoleplayTrackerState(chatId: string, enabledAgentTypes: Set<string>, registrationId: string) {
  const [lockMode, setLockMode] = useState(false);
  const gameState = useGameStateStore((s) => s.current);
  const { patchField, patchPlayerStats, patchPlayerStatsMany } = useGameStatePatcher(chatId, registrationId);
  const { data: installedCapabilities = [] } = useInstalledCapabilityPackages();
  const packages = partitionTrackerCapabilityPackages(
    selectRoleplayTrackerPackages(installedCapabilities, enabledAgentTypes),
  );

  const playerStats = gameState?.playerStats ?? null;
  // Editing one group can rewrite two, so this must land as a single patch.
  const editInventoryTracker = (group: InventoryTrackerGroup, rows: InventoryTrackerRow[]) =>
    patchPlayerStatsMany((current) => buildInventoryTrackerEditPatch(current, group, rows));
  const fieldLocks = gameState ? normalizeTrackerFieldLocksForState(gameState.fieldLocks, gameState) : null;
  const hiddenTrackerFields = gameState ? normalizeTrackerHiddenFields(gameState.hiddenTrackerFields) : null;
  const updateFieldLocks = useTrackerFieldLockUpdater({ chatId, fieldLocks, patchField });
  const updateHiddenTrackerFields = useCallback(
    (updater: (hiddenFields: TrackerHiddenFields | null | undefined) => TrackerHiddenFields) => {
      const latestState = useGameStateStore.getState().current;
      const base =
        latestState?.chatId === chatId
          ? normalizeTrackerHiddenFields(latestState.hiddenTrackerFields)
          : hiddenTrackerFields;
      patchField("hiddenTrackerFields", updater(base));
    },
    [chatId, hiddenTrackerFields, patchField],
  );
  const toggleFieldLock = useCallback(
    (key: string) => {
      updateFieldLocks((locks) => toggleTrackerFieldLock(locks, key));
    },
    [updateFieldLocks],
  );

  return {
    packages,
    patchField,
    patchPlayerStats,
    editInventoryTracker,
    date: gameState?.date ?? null,
    time: gameState?.time ?? null,
    location: gameState?.location ?? null,
    weather: gameState?.weather ?? null,
    temperature: gameState?.temperature ?? null,
    worldCustomFields: Array.isArray(gameState?.worldCustomFields) ? gameState.worldCustomFields : [],
    presentCharacters: gameState?.presentCharacters ?? [],
    personaStatBars: gameState?.personaStats ?? [],
    personaStatus: playerStats?.status ?? "",
    activeQuests: playerStats?.activeQuests ?? [],
    customTrackerFields: Array.isArray(playerStats?.customTrackerFields)
      ? playerStats.customTrackerFields.filter(isNamedTrackerRow)
      : [],
    inventoryTrackerCurrencies: playerStats?.inventoryTrackerCurrencies ?? [],
    inventoryTrackerEquipped: playerStats?.inventoryTrackerEquipped ?? [],
    inventoryTrackerInventory: playerStats?.inventoryTrackerInventory ?? [],
    lockProviderProps: {
      fieldLocks,
      hiddenTrackerFields,
      lockMode,
      onSetLockMode: setLockMode,
      onToggleFieldLock: toggleFieldLock,
      onUpdateFieldLocks: updateFieldLocks,
      onUpdateHiddenFields: updateHiddenTrackerFields,
    },
  };
}

export function RoleplayHUD({
  chatId,
  isStreaming,
  onRetriggerTrackers,
  onRerunSingleTracker,
  manualTrackers,
  mobileCompact,
  enabledAgentTypes: enabledAgentTypesProp,
}: RoleplayHUDProps & { mobileCompact?: boolean }) {
  const gameStateRefreshing = useGameStateStore((s) => s.isRefreshing);
  const setGameState = useGameStateStore((s) => s.setGameState);

  const enabledAgentTypes = enabledAgentTypesProp ?? EMPTY_AGENT_TYPE_SET;
  const {
    packages: { other: otherRoleplayTrackerPackages },
    lockProviderProps,
  } = useRoleplayTrackerState(chatId, enabledAgentTypes, "roleplay-hud");

  const isAgentProcessing = useAgentStore((s) => s.processingChatIds.includes(chatId));
  const trackerPanelEnabled = useUIStore((s) => s.trackerPanelEnabled);
  const trackerPanelOpen = useUIStore((s) => s.trackerPanelOpen);
  const isTrackerBusy = isAgentProcessing || isStreaming || gameStateRefreshing;
  // Tracker details live in the Tracker Panel; the strip keeps package actions and manual reruns.
  const showHudTrackerWidgets = !(trackerPanelEnabled && trackerPanelOpen);

  useEffect(() => {
    if (!chatId) return;
    // If the store already holds state for this chat, skip the redundant fetch.
    // This happens when ChatArea remounts after visiting an editor panel.
    const existing = useGameStateStore.getState().current;
    if (existing?.chatId === chatId) return;

    let cancelled = false;
    api
      .get<GameState | null>(`/chats/${chatId}/game-state`)
      .then((gs) => {
        if (!cancelled) setGameState(gs ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chatId, setGameState]);

  return (
    <TrackerLockProvider {...lockProviderProps}>
      <div className={cn("rpg-hud", "flex items-center", CHAT_TOOLBAR_ICON_GAP_CLASS, mobileCompact && "min-w-0")}>
        {/* Chat Settings turns the Tracker Panel on, and Beholder has its own window (a bubble). */}
        {/* Mobile package and manual tracker controls. */}
        {showHudTrackerWidgets && (
          <div
            className={cn(
              "flex items-center md:hidden",
              CHAT_TOOLBAR_ICON_GAP_CLASS,
              mobileCompact && "min-w-0 justify-start",
            )}
          >
            {otherRoleplayTrackerPackages.map((item) => (
              <RoleplayTrackerCapability
                key={`${item.id}-roleplay-tracker-mobile`}
                packageId={item.id}
                chatId={chatId}
                compact
                onRerunSingleTracker={onRerunSingleTracker}
                isTrackerRetryBusy={isTrackerBusy}
              />
            ))}

            {/* Manual tracker trigger button (mobile) */}
            {manualTrackers && onRetriggerTrackers && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRetriggerTrackers();
                }}
                disabled={isTrackerBusy}
                className={cn(
                  MOBILE_HUD_BTN,
                  "justify-center text-[0.5625rem] font-medium",
                  isTrackerBusy && "text-[var(--marinara-chat-chrome-button-text-active)]",
                )}
              >
                <RefreshCw size="0.875rem" className={cn("shrink-0 h-4 w-4", isTrackerBusy && "animate-spin")} />
              </button>
            )}
          </div>
        )}
      </div>
    </TrackerLockProvider>
  );
}

/** Common mobile HUD button sizing – used by all four strip buttons */
const HUD_ICON_BUTTON = getChatToolbarButtonClass({ compact: true });
const MOBILE_HUD_BTN = cn(HUD_ICON_BUTTON, CHAT_TOOLBAR_MOBILE_OVERFLOW_HEIGHT_CLASS, "cursor-pointer select-none");

export function RoleplayTrackerCapability({
  packageId,
  chatId,
  compact = false,
  onRerunSingleTracker,
  isTrackerRetryBusy,
}: {
  packageId: string;
  chatId: string;
  compact?: boolean;
  onRerunSingleTracker?: (agentType: string) => void;
  isTrackerRetryBusy?: boolean;
}) {
  const { lockMode, onSetLockMode } = useTrackerLockContext();
  return (
    <span className="contents [&_button>svg]:!text-inherit">
      <CapabilityElement
        packageId={packageId}
        view="toolbar"
        capabilityProps={{
          chatId,
          chatMode: "roleplay",
          mobileCompact: compact,
          onRerunTracker: onRerunSingleTracker ? () => onRerunSingleTracker(packageId) : undefined,
          trackerRetryBusy: isTrackerRetryBusy,
          lockMode,
          onToggleLockMode: onSetLockMode ? () => onSetLockMode(!lockMode) : undefined,
          toolbarButtonClass: getChatToolbarButtonClass({
            compact,
            className: compact ? CHAT_TOOLBAR_MOBILE_OVERFLOW_HEIGHT_CLASS : undefined,
          }),
        }}
        className="contents"
      />
    </span>
  );
}
