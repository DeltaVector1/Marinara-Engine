import { Eye } from "lucide-react";
import type { Message } from "@marinara-engine/shared";
import {
  partitionTrackerCapabilityPackages,
  useInstalledCapabilityPackages,
} from "../../hooks/use-capability-packages";
import { useAgentStore } from "../../stores/agent.store";
import { useChatStore } from "../../stores/chat.store";
import { selectRoleplayTrackerPackages, RoleplayTrackerCapability } from "./RoleplayHUD";
import { CHAT_CONTROL_WINDOW_IDS, ChatControlWindow } from "./ChatControlWindow";

interface RoleplayTrackerToolsProps {
  chatId: string;
  enabledAgentTypes: Set<string>;
  onRerunSingleTracker: (agentType: string) => void;
  messages?: Message[];
}

/** Beholder and package tracker controls live in Chat Settings with the other chat tools. */
export function RoleplayTrackerWindow(props: RoleplayTrackerToolsProps) {
  const { data: installedCapabilities = [] } = useInstalledCapabilityPackages();
  const isAgentProcessing = useAgentStore((state) => state.processingChatIds.includes(props.chatId));
  const isStreaming = useChatStore((state) => state.isStreaming && state.streamingChatId === props.chatId);
  const busy = isAgentProcessing || isStreaming;
  const packages = partitionTrackerCapabilityPackages(
    selectRoleplayTrackerPackages(installedCapabilities, props.enabledAgentTypes),
  );

  return (
    <>
      {packages.beholder.map((item) => (
        <ChatControlWindow
          key={item.id}
          id={CHAT_CONTROL_WINDOW_IDS.beholder(item.id)}
          title={item.manifest.name}
          icon={<Eye size={14} />}
        >
          <div className="flex flex-wrap items-center gap-0.5 p-2">
            <RoleplayTrackerCapability
              packageId={item.id}
              chatId={props.chatId}
              onRerunSingleTracker={props.onRerunSingleTracker}
              isTrackerRetryBusy={busy}
            />
          </div>
        </ChatControlWindow>
      ))}
    </>
  );
}
