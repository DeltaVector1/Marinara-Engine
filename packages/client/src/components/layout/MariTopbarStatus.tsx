import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import type { MariEdgeGlow } from "../../lib/mari-presence-seen";
import { requestProfessorMariOpen } from "../../lib/professor-mari-open";
import { useUIStore } from "../../stores/ui.store";

const DONE_VISIBLE_MS = 4_000;
/** Her pull-drop head (six frames: neutral, down, down-left, down-right, peering, delighted) per state. */
const STATE_GAZE: Record<Exclude<MariEdgeGlow, null>, string> = {
  working: "down",
  approval: "peering",
  error: "neutral",
  finished: "delighted",
};

/**
 * Slice 73: Mari's state as one small pill in the top bar while her window is not showing it. It reads
 * the same edge state as the line under the bar. "Done" shows only for a run that was seen working and
 * fades after a few seconds; "Needs you" stays until answered; "Failed" until her window has shown it.
 */
export function MariTopbarStatus({ state }: { state: MariEdgeGlow }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const appearance = useMariAppearancePack();
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
  const text = shown ? t(`mari.topbarStatus.${shown}`) : "";

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
          <span
            className="mari-topbar-status__head"
            data-gaze={STATE_GAZE[shown]}
            style={{ "--mari-pull-heads": `url("${appearance.portraits.pullHeads}")` } as CSSProperties}
            aria-hidden="true"
          />
          <span>{text}</span>
          {shown === "finished" ? <Check size="0.75rem" aria-hidden="true" /> : null}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
