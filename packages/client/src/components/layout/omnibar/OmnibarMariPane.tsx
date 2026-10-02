import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ProfessorMariAskContext } from "@marinara-engine/shared";

import type { OmnibarCompletionAction } from "../../../lib/omnibar-completion-actions";

const OmnibarProfessorMariChat = lazy(() =>
  import("../../chat/HomeProfessorMariChat").then((module) => ({ default: module.HomeProfessorMariChat })),
);

export interface OmnibarMariPaneProps {
  /** False while the pane stays mounted but parked behind another pane. */
  active: boolean;
  reduceMotion: boolean | null;
  mariContext: ProfessorMariAskContext | null;
  /** Increments on every handoff that should send its query at once. */
  submitDraftRequest: number;
  mariOpenChatId: string | null;
  mariPendingReviewRequest: number;
  mariChatOpen: boolean;
  onChatWindowOpenChange: (open: boolean) => void;
  completionActions: readonly OmnibarCompletionAction[];
  onCompletionAction: (action: OmnibarCompletionAction) => void;
  omnibarHeaderSlot: HTMLElement | null;
}

export function OmnibarMariPane({
  active,
  reduceMotion,
  mariContext,
  submitDraftRequest,
  mariOpenChatId,
  mariPendingReviewRequest,
  mariChatOpen,
  onChatWindowOpenChange,
  completionActions,
  onCompletionAction,
  omnibarHeaderSlot,
}: OmnibarMariPaneProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      key="omnibar-mari-pane"
      data-component="GlobalOmnibar.Mari"
      initial={active ? { opacity: 0, y: -14, scale: 0.985 } : false}
      animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -12, scale: 0.995 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 30, mass: 0.75 }}
      className={`mari-workspace-canvas min-h-0 overflow-hidden ${active ? "relative flex-1" : "pointer-events-none absolute inset-0"}`}
      aria-hidden={!active}
      inert={!active}
    >
      <Suspense
        fallback={
          <div className="flex min-h-24 items-center justify-center text-sm text-[var(--muted-foreground)]">
            <Loader2 className="mr-2 animate-spin" size={16} />
            {t("omnibar.loading", "Loading results")}
          </div>
        }
      >
        <OmnibarProfessorMariChat
          pageActive
          embeddedTab
          omnibarMode
          launchHidden
          initialAskContext={mariContext}
          submitDraftRequest={submitDraftRequest}
          openChatId={mariOpenChatId}
          pendingReviewRequest={mariPendingReviewRequest}
          chatWindowOpen={mariChatOpen}
          omnibarHeaderSlot={omnibarHeaderSlot}
          onChatWindowOpenChange={onChatWindowOpenChange}
        />
      </Suspense>
      {completionActions.length > 0 ? (
        <div
          data-component="GlobalOmnibar.CompletionActions"
          className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--card)] px-3 py-2"
        >
          {completionActions.map((action) => (
            <button
              key={action.kind}
              type="button"
              onClick={() => onCompletionAction(action)}
              className="mari-chrome-control mari-chrome-control--small"
            >
              {action.kind === "open-resource"
                ? t("commandCenter.completion.openResource", "Open {{label}}", {
                    label: action.resource?.label ?? "",
                  })
                : action.kind === "open-field"
                  ? t("commandCenter.completion.openField", "Open {{field}}", { field: action.field ?? "" })
                  : action.kind === "review"
                    ? t("commandCenter.completion.review", "Review changes")
                    : t("commandCenter.completion.return", "Return to results")}
            </button>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
