import { useCallback, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { isModalOverlayOpen } from "../lib/modal-overlay-registry";
import {
  createPullRecognizer,
  pullOpenThreshold,
  rubberBand,
  setPullOpenVelocity,
  type PullRecognizer,
} from "../lib/pull-to-open";
import { isMobileShellViewport, useUIStore } from "../stores/ui.store";

/** How far the indicator may travel below the bar. */
const PULL_INDICATOR_TRAVEL = 24;
/** Below the threshold the fill stops short, so reaching it reads as a snap. */
const PULL_UNARMED_FILL = 0.8;
const SPRING_BACK = { type: "spring", stiffness: 520, damping: 40 } as const;

function pullBlocked() {
  const ui = useUIStore.getState();
  return (
    !isMobileShellViewport() ||
    Boolean(ui.modal) ||
    isModalOverlayOpen() ||
    ui.omnibarOpen ||
    document.documentElement.hasAttribute("data-mari-software-keyboard-open")
  );
}

/**
 * Pull down on the phone top bar to open the omnibar. Spread `handlers` on the
 * bar and the safe-area strip above it; `offset` (px) and `fill` (0-1) drive the
 * indicator without a render per move.
 */
export function usePullToOpenOmnibar({ onPullStart, onOpen }: { onPullStart: () => void; onOpen: () => void }) {
  const reduceMotion = useReducedMotion();
  const offset = useMotionValue(0);
  const fill = useMotionValue(0);
  const pullRef = useRef<{ pointerId: number; recognizer: PullRecognizer } | null>(null);
  const swallowClickRef = useRef(false);

  const reset = useCallback(() => {
    pullRef.current = null;
    if (reduceMotion) {
      offset.set(0);
      fill.set(0);
      return;
    }
    animate(offset, 0, SPRING_BACK);
    animate(fill, 0, SPRING_BACK);
  }, [fill, offset, reduceMotion]);

  const open = useCallback(
    (velocity: number | null) => {
      pullRef.current = null;
      offset.set(0);
      fill.set(0);
      if (pullBlocked()) return;
      setPullOpenVelocity(velocity);
      onOpen();
    },
    [fill, offset, onOpen],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      swallowClickRef.current = false;
      if (pullRef.current) {
        // A second finger is not a pull.
        if (pullRef.current.pointerId !== event.pointerId) reset();
        return;
      }
      if (event.pointerType !== "touch" || !event.isPrimary || pullBlocked()) return;
      pullRef.current = {
        pointerId: event.pointerId,
        recognizer: createPullRecognizer(
          event.clientX,
          event.clientY,
          event.timeStamp,
          pullOpenThreshold(window.innerHeight),
        ),
      };
    },
    [reset],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const pull = pullRef.current;
      if (!pull || pull.pointerId !== event.pointerId) return;
      const before = pull.recognizer.step;
      const step = pull.recognizer.move(event.clientX, event.clientY, event.timeStamp);
      if (step === "rejected") {
        pullRef.current = null;
        return;
      }
      if (step === "cancelled") {
        reset();
        return;
      }
      if (before === "pending" && step !== "pending") {
        // From here on the gesture is ours: a pull that began on a button must
        // not press it or start the Home long-press.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone (or synthetic); moves still bubble here.
        }
        swallowClickRef.current = true;
        onPullStart();
      }
      if (step === "armed" && before !== "armed") navigator.vibrate?.(8);
      if (reduceMotion) {
        // No finger-following: a static fill, and the threshold itself opens.
        fill.set(1);
        if (step === "armed") open(null);
        return;
      }
      const distance = pull.recognizer.distance;
      offset.set(rubberBand(distance, PULL_INDICATOR_TRAVEL));
      fill.set(
        step === "armed" ? 1 : Math.min(1, distance / pullOpenThreshold(window.innerHeight)) * PULL_UNARMED_FILL,
      );
    },
    [fill, offset, onPullStart, open, reduceMotion, reset],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const pull = pullRef.current;
      if (!pull || pull.pointerId !== event.pointerId) return;
      if (pull.recognizer.release(event.timeStamp)) open(pull.recognizer.releaseVelocity(event.timeStamp));
      else reset();
    },
    [open, reset],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pullRef.current?.pointerId === event.pointerId) reset();
    },
    [reset],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!swallowClickRef.current) return;
    swallowClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
    offset,
    fill,
  };
}
