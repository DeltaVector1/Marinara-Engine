import {
  useCallback,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { isModalOverlayOpen } from "../lib/modal-overlay-registry";
import {
  createPullRecognizer,
  dropClip,
  dropHeadRadii,
  dropHighlightPath,
  dropPath,
  dropRadius,
  omnibarPanelClip,
  pullOpenThreshold,
  setPullHandoff,
  type DropShape,
  type PullRecognizer,
} from "../lib/pull-to-open";
import { isMobileShellViewport, useUIStore } from "../stores/ui.store";

/** The head trails the finger like something with weight. */
const FOLLOW = { type: "spring", stiffness: 900, damping: 50 } as const;
/** Snapping back into the bar overshoots a little: the wobble. */
const WOBBLE = { type: "spring", stiffness: 520, damping: 13 } as const;
const MORPH = { duration: 0.3, ease: [0.32, 0.72, 0, 1] } as const;

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

/** How far below the bar the head hangs for a finger `dy` down. Past the threshold it lags more. */
function headTarget(dy: number, threshold: number) {
  return dy <= threshold ? 0.62 * dy : 0.62 * threshold + 0.5 * (dy - threshold);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface PullDropVisuals {
  /** Viewport y of the bar's bottom edge; the drop's coordinates start there. */
  originY: MotionValue<number>;
  path: MotionValue<string>;
  highlight: MotionValue<string>;
  /** The drop and the morph layer are mounted only while they are on screen. */
  dropShown: boolean;
  morphing: boolean;
  overlayOpacity: MotionValue<number>;
  /** The backdrop dim, rising with the morph to meet the dialog's. */
  dim: MotionValue<number>;
  clip: MotionValue<string>;
  /** The drop's colour, fading to the card colour as it grows. */
  accent: MotionValue<number>;
}

/**
 * Pull down on the phone top bar to open the omnibar. Spread `handlers` on the
 * bar and the safe-area strip above it and render `visuals` with
 * `OmnibarPullDrop`: a drop of accent liquid pulled out of the bar's edge that
 * pinches off at the threshold, falls, lands and grows into the omnibar.
 * A move only touches motion values; React renders when the drop or the
 * morph layer appears or leaves.
 */
export function usePullToOpenOmnibar({ onPullStart, onOpen }: { onPullStart: () => void; onOpen: () => void }) {
  const reduceMotion = useReducedMotion();
  const originY = useMotionValue(0);
  const anchorX = useMotionValue(0);
  const headX = useMotionValue(0);
  const headY = useMotionValue(0);
  const pullProgress = useMotionValue(0);
  const detached = useMotionValue(0);
  const squash = useMotionValue(0);
  const remnant = useMotionValue(0);
  // State, not motion values: a removed layer cannot be left behind by a missed
  // style write, and each renders twice per gesture, never per move.
  const [dropShown, setDropShown] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const overlayOpacity = useMotionValue(0);
  const dim = useMotionValue(0);
  const clip = useMotionValue("inset(50% round 0px / 0px)");
  const accent = useMotionValue(1);
  const shapeInputs = [anchorX, headX, headY, pullProgress, detached, squash, remnant];
  const toShape = ([a, hx, hy, p, det, sq, rem]: number[]): DropShape => ({
    anchorX: a,
    headX: hx,
    headY: hy,
    pull: p,
    detached: det > 0,
    squash: sq,
    remnant: rem,
  });
  const path = useTransform(shapeInputs, (values: number[]) => dropPath(toShape(values)));
  const highlight = useTransform(shapeInputs, (values: number[]) => dropHighlightPath(toShape(values)));

  const pullRef = useRef<{ pointerId: number; recognizer: PullRecognizer; threshold: number } | null>(null);
  const swallowClickRef = useRef(false);
  // A gesture's settle animation must not hide the drop of the next gesture.
  const gestureRef = useRef(0);
  // While the drop falls and morphs a new pull would fight it.
  const busyRef = useRef(false);

  const pinch = useCallback(() => {
    detached.set(1);
    // The neck's root stays behind as a bump on the bar edge and springs back.
    remnant.set(Math.max(0, headY.get() * 0.3));
    animate(remnant, 0, WOBBLE);
  }, [detached, headY, remnant]);

  const snapBack = useCallback(() => {
    pullRef.current = null;
    const gesture = gestureRef.current;
    detached.set(0);
    animate(pullProgress, 0, WOBBLE);
    animate(headX, anchorX.get(), WOBBLE);
    animate(headY, 0, WOBBLE).then(() => {
      if (gestureRef.current === gesture && !busyRef.current) setDropShown(false);
    });
  }, [anchorX, detached, headX, headY, pullProgress]);

  const dropAndOpen = useCallback(
    async (velocity: number) => {
      pullRef.current = null;
      busyRef.current = true;
      if (!detached.get()) pinch();
      animate(pullProgress, 1, { duration: 0.12 });
      // Fall: a faster release falls further, sooner.
      await animate(headY, headY.get() + clamp(30 + velocity * 40, 30, 80), {
        duration: clamp(0.24 - velocity * 0.06, 0.14, 0.24),
        ease: [0.5, 0, 0.9, 0.5],
      });
      // Plop: flatten on landing, then settle with a jiggle.
      squash.set(1);
      animate(squash, 0, { type: "spring", stiffness: 650, damping: 15 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Morph: a full-screen card layer clipped to the drop takes its place and
      // opens out to the panel's rect while its colour turns from accent to card.
      const { rx, ry } = dropHeadRadii(1, squash.get());
      const cx = headX.get();
      const cy = originY.get() + headY.get() + dropRadius(1) - ry;
      const { innerWidth: width, innerHeight: height } = window;
      clip.set(dropClip(cx, cy, rx, ry, width, height));
      accent.set(1);
      dim.set(0);
      overlayOpacity.set(1);
      // The drop stays under the layer, whose clip always covers it, so the
      // layer mounting a frame late cannot flicker.
      setMorphing(true);
      await Promise.all([
        animate(clip, omnibarPanelClip(width, height), MORPH),
        // The colour hands over early: a drop-sized accent, never a pink screen.
        animate(accent, 0, { duration: 0.18, ease: [0.2, 0, 0, 1] }),
        animate(dim, 1, { duration: 0.3 }),
      ]);

      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        setPullHandoff(null);
        const finish = () => {
          setMorphing(false);
          setDropShown(false);
          busyRef.current = false;
        };
        animate(overlayOpacity, 0, { duration: 0.16, delay: 0.08 }).then(finish);
        // The layer and the busy flag must not hang on one promise.
        window.setTimeout(finish, 400);
      };
      if (pullBlocked()) {
        reveal();
        return;
      }
      // The dialog calls `reveal` once it is on screen; the timeout only guards
      // against it never mounting, so the layer cannot stay over the app.
      setPullHandoff(reveal);
      onOpen();
      window.setTimeout(reveal, 1500);
    },
    [accent, clip, detached, dim, headX, headY, onOpen, originY, overlayOpacity, pinch, pullProgress, squash],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      swallowClickRef.current = false;
      if (pullRef.current) {
        // A second finger is not a pull.
        if (pullRef.current.pointerId !== event.pointerId) snapBack();
        return;
      }
      if (event.pointerType !== "touch" || !event.isPrimary || busyRef.current || pullBlocked()) return;
      const threshold = pullOpenThreshold(window.innerHeight);
      pullRef.current = {
        pointerId: event.pointerId,
        recognizer: createPullRecognizer(event.clientX, event.clientY, event.timeStamp, threshold),
        threshold,
      };
      gestureRef.current += 1;
      const bar = document.querySelector('[data-component="TopBar"]');
      originY.set(bar?.getBoundingClientRect().bottom ?? 0);
      anchorX.set(event.clientX);
      headX.set(event.clientX);
      headY.set(0);
      pullProgress.set(0);
      detached.set(0);
      squash.set(0);
      remnant.set(0);
    },
    [anchorX, detached, headX, headY, originY, pullProgress, remnant, snapBack, squash],
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
        snapBack();
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
      const armedNow = step === "armed" && before !== "armed";
      if (armedNow) navigator.vibrate?.(8);
      if (reduceMotion) {
        // No drop at all: the threshold itself opens.
        if (step === "armed") {
          pullRef.current = null;
          if (!pullBlocked()) onOpen();
        }
        return;
      }
      if (step === "pending") return;
      const distance = pull.recognizer.distance;
      setDropShown(true);
      pullProgress.set(Math.min(1, distance / pull.threshold));
      animate(headY, headTarget(distance, pull.threshold), FOLLOW);
      animate(headX, anchorX.get() + clamp((event.clientX - anchorX.get()) * 0.35, -24, 24), FOLLOW);
      if (armedNow) pinch();
    },
    [anchorX, headX, headY, onOpen, onPullStart, pinch, pullProgress, reduceMotion, snapBack],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const pull = pullRef.current;
      if (!pull || pull.pointerId !== event.pointerId) return;
      if (!pull.recognizer.release(event.timeStamp)) {
        snapBack();
        return;
      }
      if (reduceMotion) {
        // A flick under reduced motion: open straight away.
        pullRef.current = null;
        if (!pullBlocked()) onOpen();
        return;
      }
      void dropAndOpen(pull.recognizer.releaseVelocity(event.timeStamp));
    },
    [dropAndOpen, onOpen, reduceMotion, snapBack],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pullRef.current?.pointerId === event.pointerId) snapBack();
    },
    [snapBack],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!swallowClickRef.current) return;
    swallowClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const visuals: PullDropVisuals = {
    originY,
    path,
    highlight,
    dropShown,
    morphing,
    overlayOpacity,
    dim,
    clip,
    accent,
  };
  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }, visuals };
}
