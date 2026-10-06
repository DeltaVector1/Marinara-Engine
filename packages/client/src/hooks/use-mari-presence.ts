import { useEffect, useState } from "react";
import {
  nextMariEdgeSeen,
  readMariSeenHistoryId,
  rememberMariSeenHistoryId,
  resolveMariEdgeGlow,
  type MariEdgeGlow,
  type MariEdgeInput,
} from "../lib/mari-presence-seen";
import { useUIStore } from "../stores/ui.store";
import { useProfessorMariWorkspaceStatus } from "./use-professor-mari-workspace-status";

/**
 * Heartbeat for Professor Mari's presence outside the omnibar dialog.
 *
 * Her state used to live inside the dialog, which is unmounted on close, so a
 * task that finished while the omnibar was shut was simply lost. This reads the
 * server status instead, at a slow cadence, from a component that is always
 * mounted.
 */
const PRESENCE_INTERVAL_MS = 30_000;

export interface MariPresence {
  /** She is running something right now. */
  working: boolean;
  /** She is blocked on the user: an approval is waiting. */
  needsAttention: boolean;
  pendingCount: number;
  /** Ids of approvals waiting right now, so a newly arrived one can be told apart from one already seen. */
  pendingApprovalIds: readonly string[];
  /** Newest workspace-history entry id, or null when she has no history. */
  latestHistoryId: string | null;
  /** The newest history entry failed. */
  latestHistoryFailed: boolean;
  /** R14: her last run failed and nothing has answered it yet (a run, a retry, or Dismiss). */
  runFailed: boolean;
}

export function useMariPresence(): MariPresence {
  const status = useProfessorMariWorkspaceStatus({ intervalMs: PRESENCE_INTERVAL_MS });
  const pendingCount = status.data?.pendingApprovals.length ?? 0;
  return {
    working: status.data?.active === true,
    needsAttention: pendingCount > 0,
    pendingCount,
    pendingApprovalIds: status.data?.pendingApprovals.map((approval) => approval.id) ?? [],
    // getHistory() reverses after slicing, so the newest entry is first.
    latestHistoryId: status.data?.history[0]?.id ?? null,
    latestHistoryFailed: status.data?.history[0]?.status === "failed",
    runFailed: Boolean(status.data?.error),
  };
}

/** Her state for the top-bar edge line (P2), until the user has seen it in her pane (P3). */
export function useMariEdgeGlow(): MariEdgeGlow {
  const presence = useMariPresence();
  const viewing = useUIStore((state) => state.mariPaneVisible);
  const mariEnabled = useUIStore((state) => state.commandCenterMariEnabled);
  const input: MariEdgeInput = { ...presence, viewing };
  const [seen, setSeen] = useState(() => ({
    wasWorking: false,
    unseenRun: false,
    seenApprovalIds: [] as readonly string[],
    seenHistoryId: readMariSeenHistoryId(),
  }));
  const pendingApprovalIdsKey = presence.pendingApprovalIds.join(",");

  useEffect(() => {
    setSeen((prev) => nextMariEdgeSeen(prev, input));
    if (viewing && presence.latestHistoryId) rememberMariSeenHistoryId(presence.latestHistoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- steps once per change of the inputs below
  }, [
    presence.working,
    presence.needsAttention,
    pendingApprovalIdsKey,
    presence.latestHistoryId,
    presence.latestHistoryFailed,
    presence.runFailed,
    viewing,
  ]);

  return mariEnabled ? resolveMariEdgeGlow(seen, input) : null;
}
