import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useMariPresence } from "../../hooks/use-mari-presence";
import { readMariSeenHistoryId, rememberMariSeenHistoryId } from "../../lib/mari-presence-seen";
import { resolveProfessorMariVisualState } from "../../lib/professor-mari-visual-state";
import { useUIStore } from "../../stores/ui.store";

const IDLE_SPRITE_URL = "/sprites/mari/generated/professor-mari-assistant-idle.png";
const BLINK_SPRITE_URL = "/sprites/mari/generated/professor-mari-assistant-blink-v3.png";

/**
 * Professor Mari's presence outside the omnibar.
 *
 * She replaces the floating assistant window: this shows only that she is
 * working, finished, or blocked on the user, and opens her when clicked. It
 * appears when work starts and stays until seen — a pending approval keeps it
 * alive by definition, since it is derived from the server payload rather than
 * from a local flag. Nothing pending and nothing unseen means no indicator at
 * all, so there is no chrome to look at when she is idle.
 */
export function MariPresenceIndicator() {
  const { t } = useTranslation();
  const { working, needsAttention, pendingCount, latestHistoryId } = useMariPresence();
  const omnibarOpen = useUIStore((state) => state.omnibarOpen);
  const setOmnibarOpen = useUIStore((state) => state.setOmnibarOpen);
  const [seenHistoryId, setSeenHistoryId] = useState<string | null>(() => readMariSeenHistoryId());

  // Opening the omnibar is seeing her, however the user got there.
  useEffect(() => {
    if (!omnibarOpen || !latestHistoryId) return;
    rememberMariSeenHistoryId(latestHistoryId);
    setSeenHistoryId(latestHistoryId);
  }, [latestHistoryId, omnibarOpen]);

  const finishedUnseen = !working && latestHistoryId !== null && latestHistoryId !== seenHistoryId;
  const visible = working || needsAttention || finishedUnseen;

  // The omnibar shows her state directly, so the indicator stands down while it
  // is open rather than floating over it.
  if (!visible || omnibarOpen) return null;

  const visualState = resolveProfessorMariVisualState({
    busy: working,
    hasActionResult: finishedUnseen,
    hasAssistantReply: false,
    hasConversation: true,
    needsAttention,
  });

  const label = needsAttention
    ? t("mari.presence.needsYou", "Professor Mari needs your answer")
    : working
      ? t("mari.presence.working", "Professor Mari is working")
      : t("mari.presence.finished", "Professor Mari finished");

  return (
    <div className="mari-presence-indicator" data-state={visualState}>
      <button type="button" onClick={() => setOmnibarOpen(true)} aria-label={label} title={label}>
        <span
          className="mari-workspace-portrait"
          data-state={visualState}
          data-working={working ? "true" : undefined}
          data-conversation="true"
          aria-hidden="true"
        >
          <img src={IDLE_SPRITE_URL} alt="" draggable={false} data-part="idle" />
          <img src={BLINK_SPRITE_URL} alt="" draggable={false} data-part="blink" />
        </span>
        {pendingCount > 1 && <span data-part="count">{pendingCount}</span>}
      </button>
      <span aria-live="polite" className="sr-only">
        {label}
      </span>
    </div>
  );
}
