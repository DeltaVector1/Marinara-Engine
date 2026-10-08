import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useProfessorMariWorkspaceStatus } from "../../hooks/use-professor-mari-workspace-status";
import { mariTopbarStatusLabel, type MariEdgeGlow } from "../../lib/mari-presence-seen";
import type { MariStoryState } from "../../lib/mari-work-animations";
import { requestProfessorMariOpen } from "../../lib/professor-mari-open";
import { useUIStore } from "../../stores/ui.store";
import { MariStorySprite } from "../chat/MariStorySprite";

const DONE_VISIBLE_MS = 4_000;
const STATE_STORY: Record<Exclude<MariEdgeGlow, null>, MariStoryState> = {
  working: "thinking",
  approval: "approval",
  error: "retry",
  finished: "success",
};

/**
 * Slice 73: Mari's state as one small pill in the top bar while her window is not showing it. It reads
 * the same edge state as the line under the bar. "Done" shows only for a run that was seen working and
 * fades after a few seconds; "Needs you" stays until answered; "Failed" until her window has shown it.
 */
export function MariTopbarStatus({ state }: { state: MariEdgeGlow }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const steps = useProfessorMariWorkspaceStatus({ intervalMs: 30_000 }).data?.activeSteps ?? 0;
  const viewing = useUIStore((ui) => ui.mariPaneVisible);
  // The edge state passes through null for a render between "working" and "finished", so this
  // remembers the run itself, not the previous state. A run seen in her window needs no "Done".
  const [sawWorking, setSawWorking] = useState(false);
  const [doneFresh, setDoneFresh] = useState(false);
  const [errorSeen, setErrorSeen] = useState(false);
  if (state === "working" && !viewing && !sawWorking) setSawWorking(true);
  if (sawWorking && (viewing || (state !== "working" && state !== null))) {
    setSawWorking(false);
    if (!viewing && state === "finished") setDoneFresh(true);
  }
  if (doneFresh && state !== "finished") setDoneFresh(false);
  if (state === "working" && errorSeen) setErrorSeen(false);
  if (viewing && state === "error" && !errorSeen) setErrorSeen(true);
  useEffect(() => {
    if (!doneFresh) return;
    const timer = window.setTimeout(() => setDoneFresh(false), DONE_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [doneFresh]);

  const shown =
    !viewing &&
    (state === "working" ||
      state === "approval" ||
      (state === "error" && !errorSeen) ||
      (state === "finished" && doneFresh))
      ? state
      : null;
  const label = shown ? mariTopbarStatusLabel(shown, steps) : null;
  const text = label ? t(label.key, { count: label.count }) : "";

  return (
    <AnimatePresence initial={false}>
      {shown ? (
        <motion.button
          key="mari-topbar-status"
          type="button"
          data-component="TopBar.MariStatus"
          data-state={shown}
          className="mari-topbar-status"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => requestProfessorMariOpen({ resume: true })}
          aria-label={t("mari.topbarStatus.open", { status: text })}
          title={t("mari.topbarStatus.open", { status: text })}
        >
          <MariStorySprite state={STATE_STORY[shown]} pullTarget={false} />
          <span>{text}</span>
          {shown === "finished" ? <Check size="0.75rem" aria-hidden="true" /> : null}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
