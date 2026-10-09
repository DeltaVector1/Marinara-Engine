// ──────────────────────────────────────────────
// Chat: Home — recent chats and a new-chat button
// ──────────────────────────────────────────────
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useChats } from "../../hooks/use-chats";
import { compareChatsByActivityDesc, getChatActivityTime } from "../../lib/chat-recency";
import { formatRelativeContact } from "../../lib/relative-time";
import { useChatStore } from "../../stores/chat.store";
import { ChatModeIcon } from "./ChatModeIcon";
import { HomeNewChatLauncher } from "./HomeNewChatLauncher";

const RECENT_CHAT_LIMIT = 12;

export function HomeView() {
  const { t } = useTranslation();
  const { data: chats } = useChats();
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);
  const recent = useMemo(
    () => [...(chats ?? [])].sort(compareChatsByActivityDesc).slice(0, RECENT_CHAT_LIMIT),
    [chats],
  );

  return (
    <div data-component="HomeView" className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <h1 className="text-base font-semibold">{t("home.recentChats.title")}</h1>
        <HomeNewChatLauncher />
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">{t("home.recentChats.empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {recent.map((chat) => (
            <li key={chat.id} className="border-b border-[var(--border)] last:border-b-0">
              <button
                type="button"
                onClick={() => setActiveChatId(chat.id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <ChatModeIcon mode={chat.mode} size="0.875rem" className="shrink-0 text-[var(--muted-foreground)]" />
                <span className="min-w-0 flex-1 truncate">{chat.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {formatRelativeContact(new Date(getChatActivityTime(chat)).toISOString())}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
