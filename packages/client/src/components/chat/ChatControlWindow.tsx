import { createPortal } from "react-dom";
import { ArrowRightLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer } from "../ui/Drawer";
import { useChatControlDockStore } from "../ui/drawer-host";
import { useUIStore } from "../../stores/ui.store";

/** Stable section ids for package controls shown in the Chat Settings drawer. */
export const CHAT_CONTROL_WINDOW_IDS = {
  connectedChat: "control:connected-chat",
  beholder: (packageId: string) => `control:beholder:${packageId}`,
  package: (packageId: string) => `control:package:${packageId}`,
} as const;

interface ChatControlWindowProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/** Keeps package-owned chat controls in Chat Settings instead of separate windows. */
export function ChatControlWindow({ id, title, icon, children }: ChatControlWindowProps) {
  const host = useChatControlDockStore((state) => state.element);
  const open = useUIStore((state) => state.chatSettingsExpandedSections[id] !== false);
  const setExpanded = useUIStore((state) => state.setChatSettingsSectionExpanded);

  if (!host) return null;

  return createPortal(
    <Drawer
      id={id}
      title={title}
      icon={icon}
      open={open}
      onOpenChange={(next) => setExpanded(id, next)}
      rootAttributes={{ "data-chat-settings-section": id }}
    >
      {children}
    </Drawer>,
    host,
  );
}

/** The connected chat switcher is available from the Chat Settings drawer. */
export function ChatConnectedChatWindow({ name, onSwitch }: { name?: string | null; onSwitch: () => void }) {
  const { t } = useTranslation();
  const label = name ? t("chat.toolbar.switchTo", { name }) : t("chat.toolbar.switchToConnected");

  return (
    <ChatControlWindow
      id={CHAT_CONTROL_WINDOW_IDS.connectedChat}
      title={t("chat.toolbar.connectedChat")}
      icon={<ArrowRightLeft size={14} />}
    >
      <div className="p-2">
        <button
          type="button"
          onClick={onSwitch}
          className="mari-chrome-control flex w-full min-w-0 items-center gap-2 px-3 py-2 text-xs"
        >
          <ArrowRightLeft size="0.8125rem" className="shrink-0" />
          <span className="min-w-0 truncate">{label}</span>
        </button>
      </div>
    </ChatControlWindow>
  );
}
