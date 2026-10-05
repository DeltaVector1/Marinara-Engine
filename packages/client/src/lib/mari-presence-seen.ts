const MARI_SEEN_HISTORY_KEY = "marinara:professor-mari-seen-history";

/**
 * The newest workspace-history entry the user has already looked at.
 *
 * The server has no notion of "seen", so the marker is the client's. It is the
 * history entry id rather than a boolean because the heartbeat is slow: a task
 * that starts and finishes between two polls is never observed as active, but it
 * still leaves a history entry behind.
 */
export function readMariSeenHistoryId(): string | null {
  try {
    return window.localStorage.getItem(MARI_SEEN_HISTORY_KEY);
  } catch {
    return null;
  }
}

export function rememberMariSeenHistoryId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(MARI_SEEN_HISTORY_KEY, id);
    else window.localStorage.removeItem(MARI_SEEN_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

/** What the top-bar edge line shows (P2): her state, or nothing once the user has seen it. */
export type MariEdgeGlow = "working" | "approval" | "error" | "finished" | null;

export interface MariEdgeSeenState {
  /** She was working at the previous step, so going idle means a run just ended. */
  wasWorking: boolean;
  /** A run ended while her window was not showing it. */
  unseenRun: boolean;
  /** The pending approval was already shown in her window. */
  approvalSeen: boolean;
  seenHistoryId: string | null;
}

export interface MariEdgeInput {
  working: boolean;
  needsAttention: boolean;
  latestHistoryId: string | null;
  latestHistoryFailed: boolean;
  /** Her window (the omnibar Mari pane) is open and showing the result. */
  viewing: boolean;
}

/**
 * One step of the "has the user seen her result" state (P3). Viewing her window
 * clears everything; a run that ends while it is not shown becomes unseen; a new
 * approval needs a new look. The history-id marker also catches runs that start
 * and finish between two slow polls.
 */
export function nextMariEdgeSeen(prev: MariEdgeSeenState, input: MariEdgeInput): MariEdgeSeenState {
  if (input.viewing) {
    return {
      wasWorking: input.working,
      unseenRun: false,
      approvalSeen: input.needsAttention,
      seenHistoryId: input.latestHistoryId ?? prev.seenHistoryId,
    };
  }
  return {
    wasWorking: input.working,
    unseenRun: input.working ? false : prev.unseenRun || prev.wasWorking,
    approvalSeen: input.needsAttention && prev.approvalSeen,
    seenHistoryId: prev.seenHistoryId,
  };
}

/** Resolve against the state AFTER `nextMariEdgeSeen` for the same input. */
export function resolveMariEdgeGlow(seen: MariEdgeSeenState, input: MariEdgeInput): MariEdgeGlow {
  if (input.needsAttention && !seen.approvalSeen) return "approval";
  if (input.working) return "working";
  const historyUnseen = input.latestHistoryId !== null && input.latestHistoryId !== seen.seenHistoryId;
  if (historyUnseen && input.latestHistoryFailed) return "error";
  return historyUnseen || seen.unseenRun ? "finished" : null;
}
