import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, cancelFrame, frame, motionValue, useReducedMotion, type MotionValue } from "framer-motion";
import { isModalOverlayOpen } from "../lib/modal-overlay-registry";
import {
  PULL_CIRCLE_MAX,
  PULL_CIRCLE_MIN,
  PULL_FINGER_GAP,
  PULL_SIDE_FROM,
  PULL_TAG_GAP,
  createPullRecognizer,
  pullCirclePath,
  pullCircleTarget,
  pullOpenThreshold,
  pullRemnantPath,
  pullSheetBase,
  pullSheetPath,
  pullTarget,
  setPullHandoff,
  type PullRecognizer,
  type PullTarget,
} from "../lib/pull-to-open";
import { isMobileShellViewport, useUIStore } from "../stores/ui.store";

// Springs as [stiffness, damping], mass 1, ported from the approved prototype.
// Viscous and calm: the sheet never overshoots.
type SpringSpec = readonly [number, number];
const FOLLOW: SpringSpec = [130, 24]; // the circle trails the finger
const BASE: SpringSpec = [90, 20]; // the sheet widens and narrows
const GROW: SpringSpec = [180, 27]; // the circle grows
const SHOW: SpringSpec = [220, 28]; // icon, portrait and small bar appear
const SIDE: SpringSpec = [200, 26]; // search <-> Mari cross-fade
const GLOW: SpringSpec = [120, 18];
const POP: SpringSpec = [240, 13]; // the circle's flex on release
const PINCH: SpringSpec = [85, 19]; // at the threshold the sheet thins and lets go (~0.45 s)
const PINCH_FAST: SpringSpec = [260, 32]; // ... on a release before it let go
const SNAP: SpringSpec = [80, 18]; // below the threshold everything slurps back up
const REM: SpringSpec = [110, 19]; // the freed sheet draws back into the bar
const TAIL: SpringSpec = [150, 17]; // the circle pulls in its tail
const OPEN: SpringSpec = [210, 21]; // the circle pops open into the view
const DOCK: SpringSpec = [200, 27]; // the magnifier / portrait settles into the view's header
/** Soft light from within; a very faint accent around the circle once armed. */
const GLOW_REST = 0.02;
const GLOW_PULL = 0.07;
const GLOW_ARMED = 0.12;
const GLOW_FLARE = 4;
const TINT_ARMED = 8;
/** The pop starts this long after the release, when the dialog has had a moment to mount. */
const POP_DELAY_MS = 130;
/** If the dialog never mounts, the overlay still leaves. */
const HANDOFF_TIMEOUT_MS = 1500;
/** The magnifier's size in px at the circle's full radius (see `OmnibarPullDrop`). */
export const PULL_ICON_SIZE = 26;

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const px = (value: number) => Math.round(value * 10) / 10;

function go(value: MotionValue<number>, to: number, [stiffness, damping]: SpringSpec, velocity = value.getVelocity()) {
  return animate(value, to, {
    type: "spring",
    stiffness,
    damping,
    mass: 1,
    velocity,
    restDelta: 0.01,
    restSpeed: 0.05,
  });
}

/** Elements of the overlay, filled in by `OmnibarPullDrop`. */
export interface PullDropElements {
  glass?: HTMLDivElement | null;
  rim?: SVGSVGElement | null;
  rimClip?: SVGPathElement | null;
  rimEdge?: SVGPathElement | null;
  rimHair?: SVGPathElement | null;
  rimGrad?: SVGLinearGradientElement | null;
  edgeGrad?: SVGLinearGradientElement | null;
  ring?: SVGEllipseElement | null;
  shadow?: HTMLDivElement | null;
  icon?: HTMLDivElement | null;
  portrait?: HTMLDivElement | null;
  tag?: HTMLDivElement | null;
  tagSearch?: HTMLSpanElement | null;
  tagMari?: HTMLSpanElement | null;
  chip?: HTMLDivElement | null;
}

export interface PullDropVisuals {
  /** The overlay is mounted only while it is on screen: renders twice per gesture, never per move. */
  shown: boolean;
  /** Reduced motion: only the label near the finger. */
  labelOnly: boolean;
  target: PullTarget;
  armed: boolean;
  els: PullDropElements;
}

/**
 * Pull down on the phone top bar to open the omnibar (left half) or Professor
 * Mari (right half). Spread `handlers` on the bar and the safe-area strip above
 * it and render `visuals` with `OmnibarPullDrop`: a sheet of the bar's own
 * surface stretches down to a circle with a small bar under it, both above the
 * fingertip; past the threshold the sheet lets go of the circle, and on release
 * the circle pops open into the dialog. Moves only touch motion values; one
 * paint per frame writes the DOM.
 */
export function usePullToOpenOmnibar({
  onPullStart,
  onOpen,
}: {
  onPullStart: () => void;
  onOpen: (target: PullTarget) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [labelOnly, setLabelOnly] = useState(false);
  const [target, setTarget] = useState<PullTarget>("search");
  const [armed, setArmed] = useState(false);
  const els = useRef<PullDropElements>({}).current;

  const mv = useRef({
    x: motionValue(0),
    y: motionValue(0),
    radius: motionValue(PULL_CIRCLE_MIN),
    base: motionValue(PULL_CIRCLE_MIN + 20),
    show: motionValue(0),
    tag: motionValue(0),
    side: motionValue(0),
    glow: motionValue(0),
    tint: motionValue(0),
    pop: motionValue(0),
    pinch: motionValue(0),
    rem: motionValue(0),
    tail: motionValue(0),
    open: motionValue(0),
  }).current;

  // Gesture state lives in refs: a move never renders.
  const g = useRef({
    pointerId: -1,
    recognizer: null as PullRecognizer | null,
    threshold: 160,
    originY: 0,
    width: 0,
    height: 0,
    side: null as PullTarget | null,
    mariEnabled: true,
    mode: "idle" as "idle" | "pull" | "snap" | "land",
    detached: false,
    remX: 0,
    remB: 40,
    geom: { cx: 0, cy: 0, radius: 0, base: 0, waistY: 0 },
    landing: null as null | {
      panel: HTMLElement | null;
      from: { x: number; y: number; r: number };
      target: PullTarget;
    },
    gesture: 0,
  }).current;
  const swallowClickRef = useRef(false);

  // ── Paint: one per frame, straight to the DOM ──────────────────────────
  const paint = useCallback(() => {
    const { glass, rim, rimClip, rimEdge, rimHair, rimGrad, edgeGrad, ring, shadow, icon, portrait, tag } = els;
    if (!glass || !rim) return;
    const landing = g.mode === "land";
    const pop = clamp(mv.pop.get(), -0.6, 0.6);
    const radius = Math.max(2, mv.radius.get());
    const rx = radius * (1 + 0.06 * pop);
    const ry = radius * (1 - 0.05 * pop);
    const cx = landing ? mv.x.get() : clamp(mv.x.get(), radius + 12, g.width - radius - 12);
    const cy = mv.y.get();
    // Symmetric around the circle and always inside the bar: near an edge it narrows instead of skewing.
    const base = clamp(mv.base.get(), rx + 4, Math.max(rx + 4, Math.min(cx, g.width - cx) - 2));
    const sag = clamp01(mv.y.getVelocity() / 1500);
    const attached = !g.detached && cy + ry > 0;
    const rem = g.detached ? mv.rem.get() : 0;
    const tail = g.detached ? mv.tail.get() : 0;

    // The element's box: the outline plus a little margin.
    const minX = Math.min(cx - rx, attached ? cx - base : Infinity, rem > 0.5 ? g.remX - g.remB : Infinity) - 3;
    const maxX = Math.max(cx + rx, attached ? cx + base : -Infinity, rem > 0.5 ? g.remX + g.remB : -Infinity) + 3;
    const minY = Math.min(attached || rem > 0.5 ? -3 : Infinity, cy - ry - tail) - 3;
    const maxY = cy + ry + 3;
    const origin: [number, number] = [minX, minY];
    let d: string;
    if (attached) {
      const sheet = pullSheetPath({ cx, cy, rx, ry, base, sag, pinch: mv.pinch.get() }, origin);
      d = sheet.d;
      g.geom = { cx, cy, radius, base, waistY: sheet.waistY };
    } else {
      d = pullCirclePath(cx, cy, rx, ry, tail, origin);
      g.geom = { ...g.geom, cx, cy, radius };
    }
    if (rem > 0.5) d += pullRemnantPath(g.remX, g.remB, rem, origin);

    const width = maxX - minX;
    const height = maxY - minY;
    const box = `translate3d(${px(minX)}px, ${px(g.originY + minY)}px, 0)`;
    for (const el of [glass, rim] as Array<HTMLElement | SVGSVGElement>) {
      el.style.transform = box;
      el.style.width = `${px(width)}px`;
      el.style.height = `${px(height)}px`;
    }
    glass.style.clipPath = `path('${d}')`;
    rimClip?.setAttribute("d", d);
    rimEdge?.setAttribute("d", d);
    rimHair?.setAttribute("d", d);

    // Paint, exactly like the top bar where it leaves it: the bar's surface over
    // the app background. Further down the background layer fades away, so the
    // same surface turns into frosted glass over the page. No accent in the body.
    const ex = cx - minX;
    const ey = cy - minY;
    const barY = -minY;
    const glow = Math.max(0, mv.glow.get());
    const tint = Math.max(0, mv.tint.get());
    const solidTo = barY + 4;
    const clearAt = Math.max(solidTo + 24, ey - ry * 0.2);
    glass.style.background =
      `radial-gradient(${px(rx * 0.95)}px ${px(ry * 0.95)}px at ${px(ex)}px ${px(ey - ry * 0.15)}px, rgb(255 255 255 / ${px(glow * 100) / 100}), rgb(255 255 255 / 0)),` +
      (tint > 0.2
        ? `radial-gradient(${px(rx * 1.6)}px ${px(ry * 1.6)}px at ${px(ex)}px ${px(ey)}px, color-mix(in srgb, var(--primary) ${px(tint)}%, transparent), transparent),`
        : "") +
      `radial-gradient(${px(rx)}px ${px(ry)}px at ${px(ex)}px ${px(ey)}px, color-mix(in srgb, var(--card) 30%, transparent) 96%, transparent 100%),` +
      `linear-gradient(to bottom, var(--marinara-topbar-surface) ${px(solidTo)}px, color-mix(in srgb, var(--card) 42%, transparent) ${px(height)}px),` +
      `linear-gradient(to bottom, var(--background) ${px(solidTo)}px, color-mix(in srgb, var(--background) 0%, transparent) ${px(clearAt)}px)`;

    // Rim: soft, brightest along the upper left of the circle, travelling with it.
    rimGrad?.setAttribute("x1", String(px(ex - rx * 1.4)));
    rimGrad?.setAttribute("y1", String(px(ey - ry * 2.2)));
    rimGrad?.setAttribute("x2", String(px(ex + rx)));
    rimGrad?.setAttribute("y2", String(px(ey + ry)));
    edgeGrad?.setAttribute("y1", String(px(barY + 1)));
    edgeGrad?.setAttribute("y2", String(px(barY + 18)));
    const grown = clamp01((radius - PULL_CIRCLE_MIN) / 12);
    if (ring) {
      ring.setAttribute("cx", String(px(ex)));
      ring.setAttribute("cy", String(px(ey)));
      ring.setAttribute("rx", String(px(Math.max(0, rx - 0.5))));
      ring.setAttribute("ry", String(px(Math.max(0, ry - 0.5))));
      ring.style.opacity = String(px(grown * 100) / 100);
    }
    rim.style.opacity = String(px((0.55 + 0.35 * clamp01(glow / GLOW_ARMED)) * 100) / 100);

    // A soft shadow under the circle only.
    if (shadow) {
      const depth = 3 + ry * 0.12;
      const blur = 8 + ry * 0.35;
      shadow.style.transform = `translate3d(${px(cx - rx)}px, ${px(g.originY + cy - ry)}px, 0)`;
      shadow.style.width = `${px(rx * 2)}px`;
      shadow.style.height = `${px(ry * 2)}px`;
      shadow.style.boxShadow = `0 ${px(depth)}px ${px(blur)}px -${px(blur * 0.4)}px var(--mari-pull-shadow)`;
      shadow.style.opacity = String(px(grown * 100) / 100);
    }

    // The magnifier or Mari's portrait materializes in the circle; switching sides cross-fades them.
    const t = clamp01(mv.side.get());
    const show = clamp01(mv.show.get());
    const showTag = clamp01(mv.tag.get());
    const y = g.originY + cy;
    const blur = show < 0.99 && !landing ? `blur(${px((1 - show) * 5)}px)` : "";
    if (icon) {
      icon.style.opacity = String(px(show * clamp01(1 - t * 1.6) * 100) / 100);
      icon.style.filter = blur;
      icon.style.transform = `translate3d(${px(cx)}px, ${px(y)}px, 0) translate(-50%, -50%) scale(${px((radius / PULL_CIRCLE_MAX) * 1000) / 1000})`;
    }
    if (portrait) {
      portrait.style.opacity = String(px(show * clamp01(t * 1.6 - 0.6) * 100) / 100);
      portrait.style.filter = blur;
      portrait.style.transform = `translate3d(${px(cx)}px, ${px(y)}px, 0) translate(-50%, -50%) scale(${px((Math.max(0, 2 * radius - 8) / 72) * 1000) / 1000})`;
    }
    // The small bar under the circle, above the finger; only its words change with the side.
    if (tag) {
      tag.style.opacity = landing ? "0" : String(px(showTag * 100) / 100);
      tag.style.transform = `translate3d(${px(cx)}px, ${px(y + ry + PULL_TAG_GAP)}px, 0) translate(-50%, 0) scale(${px((0.9 + 0.1 * showTag) * 100) / 100})`;
    }
    if (els.tagSearch) els.tagSearch.style.opacity = String(px(clamp01(1 - t * 1.6) * 100) / 100);
    if (els.tagMari) els.tagMari.style.opacity = String(px(clamp01(t * 1.6 - 0.6) * 100) / 100);

    // Pop open: the dialog is revealed from the circle outwards.
    const open = mv.open.get();
    const panel = g.landing?.panel;
    if (landing && panel && open > 0) {
      const { x: fx, y: fy, r: fr } = g.landing!.from;
      const rect = panel.getBoundingClientRect();
      const reach = Math.hypot(Math.max(fx - rect.left, rect.right - fx), Math.max(fy - rect.top, rect.bottom - fy));
      panel.style.clipPath = `circle(${px(lerp(fr, reach, Math.max(0, open)))}px at ${px(fx - rect.left)}px ${px(fy - rect.top)}px)`;
    }

    // The sheet lets go once the pinch has closed its waist.
    if (!g.detached && mv.pinch.get() > 0.97 && (g.mode === "pull" || landing)) detach();
  }, [els, g, mv]); // eslint-disable-line react-hooks/exhaustive-deps -- detach is hoisted and stable

  const schedulePaint = useCallback(() => {
    frame.render(paint);
  }, [paint]);

  // The overlay mounts a frame after the pull locks: paint it as soon as it is there.
  useEffect(() => {
    if (shown) schedulePaint();
  }, [shown, schedulePaint]);

  useEffect(() => {
    const offs = Object.values(mv).map((value) => value.on("change", schedulePaint));
    return () => {
      offs.forEach((off) => off());
      cancelFrame(paint);
    };
  }, [mv, paint, schedulePaint]);

  // ── States ─────────────────────────────────────────────────────────────
  function detach() {
    if (g.detached) return;
    g.detached = true;
    g.remX = g.geom.cx;
    g.remB = g.geom.base;
    // Surface tension: the sheet lets go and draws back into the bar; the circle pulls in a short tail.
    mv.rem.set(g.geom.waistY);
    go(mv.rem, 0, REM, 0);
    mv.tail.set(Math.min(22, Math.max(0, g.geom.cy - g.geom.radius - g.geom.waistY) * 0.6));
    go(mv.tail, 0, TAIL, 0);
    mv.pinch.set(1);
  }

  const hide = useCallback(() => {
    g.mode = "idle";
    setShown(false);
    setLabelOnly(false);
    setArmed(false);
  }, [g]);

  const snapBack = useCallback(() => {
    g.recognizer = null;
    if (g.mode !== "pull") return;
    if (reduceMotion) {
      hide();
      return;
    }
    g.mode = "snap";
    const gesture = g.gesture;
    setArmed(false);
    // The whole sheet slides back up into the bar.
    if (!g.detached) go(mv.pinch, 0, SNAP);
    go(mv.radius, PULL_CIRCLE_MIN * 0.6, SNAP);
    go(mv.base, PULL_CIRCLE_MIN + 10, SNAP);
    go(mv.show, 0, SHOW);
    go(mv.tag, 0, SHOW);
    go(mv.glow, 0, SNAP);
    go(mv.tint, 0, SNAP);
    go(mv.y, g.detached ? -PULL_CIRCLE_MAX : 0, SNAP).then(() => {
      if (g.gesture === gesture && g.mode === "snap") hide();
    });
  }, [g, hide, mv, reduceMotion]);

  const land = useCallback(
    (side: PullTarget, velocity: number) => {
      g.recognizer = null;
      g.mode = "land";
      const gesture = g.gesture;
      if (!g.detached) go(mv.pinch, 1, PINCH_FAST);
      go(mv.side, side === "mari" ? 1 : 0, SIDE);
      setTarget(side);
      // The pop: a flex and a flash of inner light.
      go(mv.glow, mv.glow.get(), GLOW, mv.glow.getVelocity() + GLOW_FLARE * 1.4);
      go(mv.pop, 0, POP, mv.pop.getVelocity() + 4 + clamp(velocity, 0, 2) * 2);
      g.landing = {
        panel: null,
        from: { x: g.geom.cx, y: g.originY + g.geom.cy, r: g.geom.radius },
        target: side,
      };
      document.documentElement.dataset.mariPullLanding = side;

      let mounted = false;
      let delayed = false;
      const finish = () => {
        if (g.gesture !== gesture || g.mode !== "land") return;
        const panel = g.landing?.panel;
        if (panel) panel.style.clipPath = "";
        delete document.documentElement.dataset.mariPullLanding;
        g.landing = null;
        hide();
      };
      const popOpen = () => {
        if (!mounted || !delayed || g.gesture !== gesture || g.mode !== "land") return;
        const panel = g.landing?.panel ?? null;
        // Where the magnifier / the portrait lives in the opened dialog.
        const dock = panel?.querySelector<HTMLElement>(`[data-mari-pull-target="${side}"]`)?.getBoundingClientRect();
        mv.open.set(0);
        const opening = go(mv.open, 1, OPEN, 0);
        if (dock && dock.width > 0) {
          go(mv.x, dock.left + dock.width / 2, DOCK, 0);
          go(mv.y, dock.top + dock.height / 2 - g.originY, DOCK, 0);
          // Sized so the portrait / the magnifier inside the circle matches what it lands on.
          go(
            mv.radius,
            side === "mari" ? (dock.width + 8) / 2 : (dock.width * PULL_CIRCLE_MAX) / PULL_ICON_SIZE,
            DOCK,
            0,
          );
        }
        els.glass?.classList.add("mari-pull-fadeout");
        els.rim?.classList.add("mari-pull-fadeout");
        els.shadow?.classList.add("mari-pull-fadeout");
        els.tag?.classList.add("mari-pull-fadeout");
        Promise.all([opening, new Promise((resolve) => window.setTimeout(resolve, 420))]).then(finish);
      };
      window.setTimeout(() => {
        delayed = true;
        popOpen();
      }, POP_DELAY_MS);
      if (pullBlocked()) {
        mounted = true;
        finish();
        return;
      }
      // The dialog hands over its panel once it is on screen; the timeout only
      // guards against it never mounting, so the overlay cannot stay over the app.
      setPullHandoff((panel) => {
        if (g.landing) g.landing.panel = panel;
        // Clipped to the circle from its first frame, so the dialog cannot flash open.
        const from = g.landing?.from;
        if (panel && from) {
          const rect = panel.getBoundingClientRect();
          panel.style.clipPath = `circle(${px(from.r)}px at ${px(from.x - rect.left)}px ${px(from.y - rect.top)}px)`;
        }
        mounted = true;
        popOpen();
      });
      onOpen(side);
      window.setTimeout(() => {
        setPullHandoff(null);
        if (!mounted) {
          mounted = true;
          finish();
        }
      }, HANDOFF_TIMEOUT_MS);
    },
    [els, g, hide, mv, onOpen],
  );

  const lock = useCallback(
    (x: number) => {
      g.gesture += 1;
      g.mode = "pull";
      g.detached = false;
      g.side = null;
      g.landing = null;
      g.mariEnabled = useUIStore.getState().commandCenterMariEnabled;
      if (reduceMotion) {
        setLabelOnly(true);
        setShown(true);
        return;
      }
      for (const key of ["show", "tag", "pop", "pinch", "rem", "tail", "open", "tint"] as const) mv[key].set(0);
      mv.radius.set(PULL_CIRCLE_MIN * 0.6);
      mv.base.set(PULL_CIRCLE_MIN + 14);
      mv.x.set(x);
      mv.y.set(0);
      mv.side.set(pullTarget(null, x, g.width, g.mariEnabled) === "mari" ? 1 : 0);
      mv.glow.set(0);
      go(mv.glow, GLOW_REST, GLOW);
      for (const el of [els.glass, els.rim, els.shadow, els.tag]) el?.classList.remove("mari-pull-fadeout");
      setTarget(pullTarget(null, x, g.width, g.mariEnabled));
      setArmed(false);
      setShown(true);
      schedulePaint();
    },
    [els, g, mv, reduceMotion, schedulePaint],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      swallowClickRef.current = false;
      if (g.recognizer) {
        // A second finger is not a pull.
        if (g.pointerId !== event.pointerId) snapBack();
        return;
      }
      if (event.pointerType !== "touch" || !event.isPrimary || g.mode === "land" || pullBlocked()) return;
      g.width = window.innerWidth;
      g.height = window.innerHeight;
      g.threshold = pullOpenThreshold(g.height);
      g.pointerId = event.pointerId;
      g.recognizer = createPullRecognizer(event.clientX, event.clientY, event.timeStamp, g.threshold);
      const bar = document.querySelector('[data-component="TopBar"]');
      g.originY = bar?.getBoundingClientRect().bottom ?? 0;
    },
    [g, snapBack],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const recognizer = g.recognizer;
      if (!recognizer || g.pointerId !== event.pointerId) return;
      const before = recognizer.step;
      const step = recognizer.move(event.clientX, event.clientY, event.timeStamp);
      if (step === "rejected") {
        g.recognizer = null;
        return;
      }
      if (step === "cancelled") {
        snapBack();
        return;
      }
      if (step === "pending") return;
      if (before === "pending") {
        // From here on the gesture is ours: a pull that began on a button must
        // not press it or start the Home long-press.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The pointer is already gone (or synthetic); moves still bubble here.
        }
        swallowClickRef.current = true;
        onPullStart();
        lock(event.clientX);
      }
      const armedNow = step === "armed" && before !== "armed";
      const dy = Math.max(0, recognizer.distance);
      const pull = dy / g.threshold;
      const x = clamp(event.clientX, 0, g.width);

      // The finger steers; the side is chosen once the pull is under way.
      if (pull >= PULL_SIDE_FROM || step === "armed") {
        const next = pullTarget(g.side, x, g.width, g.mariEnabled);
        if (g.side && next !== g.side) navigator.vibrate?.(6);
        if (next !== g.side) setTarget(next);
        g.side = next;
      } else if (g.side) {
        g.side = null;
      }
      if (armedNow) {
        navigator.vibrate?.(8);
        setArmed(true);
      }

      if (reduceMotion) {
        // No sheet at all: the label sits above the finger and the threshold itself opens.
        const chip = els.chip;
        if (chip) {
          const y = clamp(event.clientY - PULL_FINGER_GAP - 32, g.originY + 6, g.height - 44);
          chip.style.opacity = String(clamp01(pull / 0.25));
          chip.style.transform = `translate3d(${px(clamp(x, 80, g.width - 80))}px, ${px(y)}px, 0) translate(-50%, 0)`;
          chip.style.setProperty("--mari-pull-progress", String(clamp01(pull)));
        }
        if (armedNow) {
          const side = g.side ?? pullTarget(null, x, g.width, g.mariEnabled);
          g.recognizer = null;
          hide();
          if (!pullBlocked()) onOpen(side);
        }
        return;
      }

      const fingerY = event.clientY - g.originY;
      const circle = pullCircleTarget(fingerY, pull);
      go(mv.radius, circle.radius, GROW);
      go(mv.tag, circle.tag, SHOW);
      // The circle grows out of the bar edge and never rises above it.
      go(mv.y, circle.centerY, FOLLOW);
      go(mv.x, x, FOLLOW);
      go(mv.show, clamp01((circle.radius - 16) / 10) * clamp01((pull - PULL_SIDE_FROM) / 0.2), SHOW);
      go(mv.base, pullSheetBase(circle.radius, pull, g.width), BASE);
      if (g.side) go(mv.side, g.side === "mari" ? 1 : 0, SIDE);
      else mv.side.set(pullTarget(null, x, g.width, g.mariEnabled) === "mari" ? 1 : 0);
      if (step !== "armed") go(mv.glow, GLOW_REST + GLOW_PULL * clamp01(pull), GLOW);
      if (armedNow) {
        // A soft flare from within, a faint accent around the circle, and the sheet lets go.
        go(mv.glow, GLOW_ARMED, GLOW, mv.glow.getVelocity() + GLOW_FLARE);
        go(mv.tint, TINT_ARMED, GLOW);
        if (!g.detached) go(mv.pinch, 1, PINCH);
      }
    },
    [els, g, hide, lock, mv, onOpen, onPullStart, reduceMotion, snapBack],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const recognizer = g.recognizer;
      if (!recognizer || g.pointerId !== event.pointerId) return;
      if (!recognizer.release(event.timeStamp)) {
        snapBack();
        return;
      }
      const side = g.side ?? pullTarget(null, clamp(event.clientX, 0, g.width), g.width, g.mariEnabled);
      if (reduceMotion) {
        // A flick under reduced motion: open straight away.
        g.recognizer = null;
        hide();
        if (!pullBlocked()) onOpen(side);
        return;
      }
      land(side, recognizer.releaseVelocity(event.timeStamp));
    },
    [g, hide, land, onOpen, reduceMotion, snapBack],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (g.recognizer && g.pointerId === event.pointerId) snapBack();
    },
    [g, snapBack],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!swallowClickRef.current) return;
    swallowClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const visuals: PullDropVisuals = { shown, labelOnly, target, armed, els };
  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }, visuals };
}
