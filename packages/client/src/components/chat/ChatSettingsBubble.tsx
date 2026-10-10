import { useId } from "react";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AgentsRunningDot } from "../agents/AgentsRunningDot";
import { announceChatToolbarAction, getChatToolbarButtonClass } from "./ChatToolbarControls";
import { useAgentStore } from "../../stores/agent.store";

export function ChatSettingsBubble({
  chatId,
  open,
  onToggle,
}: {
  chatId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const agentsRunning = useAgentStore((state) => state.processingChatIds.includes(chatId));
  const agentsRunningId = useId();
  const label = t("chat.toolbar.settings");

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-describedby={agentsRunning ? agentsRunningId : undefined}
      title={label}
      data-chat-help="settings"
      data-chat-toolbar-panel-action="settings"
      data-chat-settings-button
      data-open={open ? "true" : undefined}
      className={`${getChatToolbarButtonClass({ open, sizeClassName: "h-10 w-10" })} absolute right-3 top-3 z-40`}
      onClick={() => {
        announceChatToolbarAction("settings");
        onToggle();
      }}
    >
      <Settings2 size={18} aria-hidden="true" />
      {agentsRunning && <AgentsRunningDot id={agentsRunningId} className="right-0.5 top-0.5" />}
    </button>
  );
}
