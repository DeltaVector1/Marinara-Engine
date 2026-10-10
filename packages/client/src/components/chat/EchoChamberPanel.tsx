import { useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Trash2, RefreshCw } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";
import { parseAgentSettingsRecord } from "@marinara-engine/shared";
import { useAgentStore } from "../../stores/agent.store";
import { useUIStore } from "../../stores/ui.store";
import { useChatStore } from "../../stores/chat.store";
import { hasActiveTextSelection } from "../../lib/text-selection";
import { useChat } from "../../hooks/use-chats";
import { useAgentConfigs } from "../../hooks/use-agents";
import { useGenerate } from "../../hooks/use-generate";
import { api } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import {
  getEchoChamberMessageInterval,
  normalizeEchoChamberMessageDelaySeconds,
  resolveEchoChamberPersistedBaseline,
} from "../../lib/echo-chamber-queue";
import { useChatControlDockStore } from "../ui/drawer-host";
import { Drawer } from "../ui/Drawer";

const NAME_COLORS = [
  "text-red-400",
  "text-blue-400",
  "text-green-400",
  "text-yellow-400",
  "text-cyan-400",
  "text-orange-400",
  "text-emerald-400",
  "text-amber-400",
  "text-teal-400",
  "text-lime-400",
  "text-sky-400",
  "text-stone-300",
];

export function EchoChamberPanel() {
  const { t: localizeUi } = useUiTranslation();
  const activeChatId = useChatStore((s) => s.activeChatId);
  const echoChamberOpen = useUIStore((s) => s.echoChamberOpen);
  const toggleEchoChamber = useUIStore((s) => s.toggleEchoChamber);
  const useWidgetTextColor = useUIStore((s) => s.chatWidgetPreset !== "default" || !!s.chatWidgetTextColor);
  const host = useChatControlDockStore((state) => state.element);
  const echoMessages = useAgentStore((s) => s.echoMessages);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAgentProcessing = useAgentStore((s) =>
    activeChatId ? s.processingChatIds.includes(activeChatId) : s.isProcessing,
  );
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingChatId = useChatStore((s) => s.streamingChatId);
  const { data: chat } = useChat(activeChatId);
  const { data: agentConfigs } = useAgentConfigs();
  const { retryAgents } = useGenerate();
  const echoRetryBusy = isAgentProcessing || (isStreaming && streamingChatId === activeChatId);

  // Mirror the enabledAgentTypes logic from ChatArea so per-chat overrides are respected
  const echoEnabled = useMemo(() => {
    if (!chat) return false;
    const raw = (chat as unknown as { metadata?: string | Record<string, unknown> }).metadata;
    let meta: Record<string, unknown>;
    try {
      meta = typeof raw === "string" ? JSON.parse(raw) : ((raw ?? {}) as Record<string, unknown>);
    } catch {
      return false;
    }
    if (!meta.enableAgents) return false;
    const activeAgentIds: string[] = Array.isArray(meta.activeAgentIds) ? meta.activeAgentIds : [];
    return activeAgentIds.includes("echo-chamber");
  }, [chat]);
  const messageDelaySeconds = useMemo(() => {
    const config = agentConfigs?.find((agent) => agent.type === "echo-chamber");
    return normalizeEchoChamberMessageDelaySeconds(parseAgentSettingsRecord(config?.settings).messageDelaySeconds);
  }, [agentConfigs]);

  // ── Timed reveal: show one more message after each short chat-like delay ──
  // visibleCount and baseline live in the Zustand store so they survive
  // component remounts (e.g. when the panel is toggled or the HUD re-renders).
  const visibleCount = useAgentStore((s) => s.echoVisibleCount);
  const baseline = useAgentStore((s) => s.echoBaseline);
  const setEchoVisibleCount = useAgentStore((s) => s.setEchoVisibleCount);
  const revealNextEchoMessage = useAgentStore((s) => s.revealNextEchoMessage);
  const setEchoBaseline = useAgentStore((s) => s.setEchoBaseline);

  // ── Load persisted echo messages when chat changes ──
  const setEchoMessages = useAgentStore((s) => s.setEchoMessages);
  const clearEchoMessages = useAgentStore((s) => s.clearEchoMessages);
  const echoLoadedChatId = useAgentStore((s) => s.echoLoadedChatId);
  const setEchoLoadedChatId = useAgentStore((s) => s.setEchoLoadedChatId);

  useEffect(() => {
    if (!activeChatId || !echoEnabled) return;
    // Already loaded for this chat (survives component remounts)
    if (echoLoadedChatId === activeChatId) return;

    const previousChatId = echoLoadedChatId;

    // Only clear + reset when switching to a *different* chat
    if (previousChatId !== null && previousChatId !== activeChatId) {
      clearEchoMessages();
    }
    // clearEchoMessages resets the loaded ID, so claim the new chat after it.
    setEchoLoadedChatId(activeChatId);

    const loadStartedAt = Date.now();
    api
      .get<Array<{ characterName: string; reaction: string; timestamp: number }>>(
        `/agents/echo-messages/${activeChatId}`,
      )
      .then((msgs) => {
        if (useAgentStore.getState().echoLoadedChatId !== activeChatId) return; // stale
        if (msgs.length > 0) {
          // If real-time messages already arrived (via addEchoMessage from SSE),
          // don't overwrite visibleCount — the stagger timer owns it.
          const alreadyHasMessages = useAgentStore.getState().echoMessages.length > 0;
          setEchoMessages(msgs);
          if (!alreadyHasMessages) {
            // Fresh load (page refresh) — show all persisted immediately.
            // Read the actual store length (may be capped) rather than the API
            // response length — a mismatch causes the stagger guard to skip,
            // making new messages dump all at once instead of one-by-one.
            const loadedMessages = useAgentStore.getState().echoMessages;
            const persistedBaseline = resolveEchoChamberPersistedBaseline(loadedMessages, loadStartedAt);
            setEchoVisibleCount(persistedBaseline);
            setEchoBaseline(persistedBaseline);
          }
        }
      })
      .catch(() => {
        /* silently ignore load failures */
      });
  }, [
    activeChatId,
    echoEnabled,
    echoLoadedChatId,
    setEchoLoadedChatId,
    setEchoMessages,
    clearEchoMessages,
    setEchoVisibleCount,
    setEchoBaseline,
  ]);

  // When new messages arrive beyond the baseline, stagger them one-by-one.
  useEffect(() => {
    if (visibleCount >= echoMessages.length) return;
    // Messages at or below the baseline are already visible
    if (visibleCount < baseline) {
      setEchoVisibleCount(baseline);
      return;
    }
    const id = setTimeout(revealNextEchoMessage, getEchoChamberMessageInterval(messageDelaySeconds));
    return () => clearTimeout(id);
  }, [visibleCount, echoMessages.length, baseline, messageDelaySeconds, revealNextEchoMessage, setEchoVisibleCount]);

  // Auto-scroll when a new message becomes visible
  useEffect(() => {
    if (hasActiveTextSelection()) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: streamingChatId === activeChatId ? "auto" : "smooth",
      });
    }
  }, [activeChatId, streamingChatId, visibleCount]);

  // Name → color map
  const nameColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of echoMessages) {
      if (!map.has(msg.characterName)) {
        let hash = 0;
        for (let i = 0; i < msg.characterName.length; i++)
          hash = msg.characterName.charCodeAt(i) + ((hash << 5) - hash);
        map.set(msg.characterName, NAME_COLORS[Math.abs(hash) % NAME_COLORS.length]!);
      }
    }
    return map;
  }, [echoMessages]);

  const minimized = !echoChamberOpen;

  useEffect(() => {
    if (!echoEnabled || minimized) return;

    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl || hasActiveTextSelection()) return;
        scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "auto" });
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [echoEnabled, minimized]);

  if (!echoEnabled) return null;
  if (!host) return null;
  const visibleMessages = echoMessages.slice(0, visibleCount);
  const title = localizeUi("ui.chat.echochamberpanel.title");
  const echoDrawer = (
    <Drawer
      id="echo-chamber"
      title={title}
      icon={<MessageCircle size="0.875rem" />}
      open={echoChamberOpen}
      onOpenChange={() => toggleEchoChamber()}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (!activeChatId || echoRetryBusy) return;
              void retryAgents(activeChatId, ["echo-chamber"]);
            }}
            disabled={echoRetryBusy}
            title={
              echoRetryBusy
                ? localizeUi("ui.chat.echochamberpanel.aReplyOrAgentIsAlreadyRunning")
                : localizeUi("ui.chat.echochamberpanel.reRunEchoChamber")
            }
            aria-label={localizeUi("ui.chat.echochamberpanel.reRunEchoChamber")}
            className="mari-chrome-control mari-chrome-control--small h-10 w-10 p-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RefreshCw size="0.75rem" className={echoRetryBusy ? "animate-spin" : ""} />
          </button>
          {visibleMessages.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (!activeChatId) return;
                clearEchoMessages();
                setEchoVisibleCount(0);
                setEchoBaseline(0);
                try {
                  await api.delete(`/agents/echo-messages/${activeChatId}`);
                } catch {
                  /* best-effort */
                }
              }}
              aria-label={localizeUi("ui.chat.echochamberpanel.clearMessages")}
              title={localizeUi("ui.chat.echochamberpanel.clearMessages")}
              className="mari-chrome-control mari-chrome-control--small h-10 w-10 p-0"
            >
              <Trash2 size="0.75rem" />
            </button>
          )}
        </>
      }
    >
      <div ref={scrollRef} className="max-h-80 min-h-16 overflow-y-auto px-2 pb-1.5 scrollbar-thin">
        {visibleMessages.length === 0 ? (
          <p className="py-1.5 text-center text-[0.625rem] opacity-70">
            {localizeUi("ui.chat.echochamberpanel.waitingForReactions")}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {visibleMessages.map((msg, i) => (
              <div key={i} className="min-w-0 break-words">
                <span
                  className={cn(
                    "text-[0.6875rem] font-bold",
                    !useWidgetTextColor && nameColorMap.get(msg.characterName),
                  )}
                >
                  {msg.characterName}
                </span>
                <span className="text-[0.6875rem] opacity-70">: </span>
                <span className="text-[0.6875rem] leading-snug">{msg.reaction}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );

  return createPortal(echoDrawer, host);
}
