// Pure pull-down recognizer for the phone top bar. No DOM, so the regression
// script can drive it with plain numbers.

/** Movement before the gesture decides whether it is a pull at all. */
export const PULL_LOCK_DISTANCE = 10;
/** A flick opens early, but only after this much travel. */
export const PULL_FLICK_MIN_DISTANCE = 40;
/** px/ms. */
export const PULL_FLICK_VELOCITY = 0.5;
/** A release this long after the last move is not a flick. */
const PULL_VELOCITY_STALE_MS = 100;

/** `min(120, 18% of the height)`, never under 80 px (a phone in landscape). */
export function pullOpenThreshold(viewportHeight: number) {
  return Math.max(80, Math.min(120, viewportHeight * 0.18));
}

/**
 * `pending` until the finger has moved {@link PULL_LOCK_DISTANCE}; then `rejected`
 * (sideways or up) or `pulling`; `armed` past the threshold; `cancelled` if an
 * armed pull goes back above it. `rejected` and `cancelled` are final.
 */
export type PullStep = "pending" | "pulling" | "armed" | "rejected" | "cancelled";

export function createPullRecognizer(startX: number, startY: number, startTime: number, threshold: number) {
  let step: PullStep = "pending";
  let distance = 0;
  let lastY = startY;
  let lastTime = startTime;
  let velocity = 0;
  return {
    get step() {
      return step;
    },
    get distance() {
      return distance;
    },
    move(x: number, y: number, time: number): PullStep {
      if (step === "rejected" || step === "cancelled") return step;
      const dx = x - startX;
      distance = y - startY;
      if (step === "pending") {
        if (Math.hypot(dx, distance) < PULL_LOCK_DISTANCE) return step;
        step = distance > 1.5 * Math.abs(dx) ? "pulling" : "rejected";
        if (step === "rejected") return step;
      }
      if (time > lastTime) {
        velocity = 0.6 * ((y - lastY) / (time - lastTime)) + 0.4 * velocity;
        lastY = y;
        lastTime = time;
      }
      if (step === "armed" && distance < threshold) step = "cancelled";
      else if (step === "pulling" && distance >= threshold) step = "armed";
      return step;
    },
    /** Downward speed at release in px/ms; 0 when the finger had stopped. */
    releaseVelocity(time: number) {
      return time - lastTime > PULL_VELOCITY_STALE_MS ? 0 : Math.max(0, velocity);
    },
    /** Opens when released past the threshold, or on a flick after enough travel. */
    release(time: number) {
      if (step === "armed") return true;
      if (step !== "pulling") return false;
      return distance >= PULL_FLICK_MIN_DISTANCE && this.releaseVelocity(time) > PULL_FLICK_VELOCITY;
    },
  };
}

export type PullRecognizer = ReturnType<typeof createPullRecognizer>;

// ── The drop ───────────────────────────────────────────────────────────────
// Path coordinates: x in viewport px, y in px below the bar's bottom edge.

export interface DropShape {
  /** Where the finger went down; the neck stays rooted here. */
  anchorX: number;
  headX: number;
  /** Head centre below the bar edge. */
  headY: number;
  /** 0-1: how far the pull is towards the threshold. */
  pull: number;
  /** Pinched off at the threshold: a free drop with no neck. */
  detached: boolean;
  /** 1 = flattened on landing, negative = stretched. */
  squash: number;
  /** Height of the bump left on the bar edge after the pinch; springs back to 0. */
  remnant: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const px = (value: number) => Math.round(value * 10) / 10;

/** More liquid is pulled out as the pull grows. */
export function dropRadius(pull: number) {
  return 5 + 8 * clamp01(pull);
}

/** Head radii, squashed wide and low on landing. */
export function dropHeadRadii(pull: number, squash: number) {
  const r = dropRadius(pull);
  return { rx: r * (1 + 0.35 * squash), ry: r * (1 - 0.3 * squash) };
}

/** Half-width of the neck where it meets the head: wide at first, a thread near the threshold. */
export function dropNeckWidth(pull: number, rx: number) {
  return Math.min(rx * 0.98, Math.max(0.5, rx * (0.95 - 0.9 * clamp01(pull))));
}

function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return `M${px(cx - rx)} ${px(cy)}a${px(rx)} ${px(ry)} 0 1 0 ${px(2 * rx)} 0a${px(rx)} ${px(ry)} 0 1 0 ${px(-2 * rx)} 0Z`;
}

/** One path: a meniscus on the bar edge, a neck thinning with the pull, and the head. */
export function dropPath({ anchorX, headX, headY, pull, detached, squash, remnant }: DropShape) {
  const { rx, ry } = dropHeadRadii(pull, squash);
  // Squashing keeps the bottom of the drop where it landed.
  const cy = headY + dropRadius(pull) - ry;
  let d = "";
  if (Math.abs(remnant) > 0.25) {
    const w = 6 + rx;
    d += `M${px(anchorX - w)} 0Q${px(anchorX)} ${px(2 * remnant)} ${px(anchorX + w)} 0Z`;
  }
  if (detached) return d + ellipse(headX, cy, rx, ry);
  if (headY <= 0) return d;
  const n = dropNeckWidth(pull, rx);
  const joinY = cy - ry * Math.sqrt(1 - (n / rx) ** 2);
  const base = 4 + 1.4 * rx;
  const bend = Math.max(0, joinY) * 0.5;
  return (
    d +
    `M${px(anchorX - base)} 0C${px(anchorX - 0.35 * base)} 0 ${px(headX - n)} ${px(joinY - bend)} ${px(headX - n)} ${px(joinY)}` +
    `A${px(rx)} ${px(ry)} 0 1 0 ${px(headX + n)} ${px(joinY)}` +
    `C${px(headX + n)} ${px(joinY - bend)} ${px(anchorX + 0.35 * base)} 0 ${px(anchorX + base)} 0Z`
  );
}

/** A small, faint highlight on the head's upper left. */
export function dropHighlightPath({ headX, headY, pull, squash }: DropShape) {
  const { rx, ry } = dropHeadRadii(pull, squash);
  const cy = headY + dropRadius(pull) - ry;
  return cy - ry * 0.4 <= 0 ? "" : ellipse(headX - rx * 0.35, cy - ry * 0.4, rx * 0.3, ry * 0.2);
}

/** `clip-path` that cuts a full-screen layer down to the landed drop. */
export function dropClip(cx: number, cy: number, rx: number, ry: number, width: number, height: number) {
  return `inset(${px(cy - ry)}px ${px(width - cx - rx)}px ${px(height - cy - ry)}px ${px(cx - rx)}px round ${px(rx)}px / ${px(ry)}px)`;
}

/** Where the morph ends: the omnibar panel's resting rect. */
export function omnibarPanelClip(width: number, height: number) {
  // A phone shows the panel full screen and square.
  if (width < 640) return "inset(0px 0px 0px 0px round 0px / 0px)";
  // ponytail: on a tablet the idle panel's height depends on its content, so the
  // morph lands on its search row (26vh down, 44rem wide) and the dialog's own
  // fade covers the rest. Measure the mounted panel if that ever looks off.
  const w = Math.min(704, width - 48);
  const left = (width - w) / 2;
  const top = height * 0.26;
  return `inset(${px(top)}px ${px(width - left - w)}px ${px(height - top - 72)}px ${px(left)}px round 16px / 16px)`;
}

// The omnibar dialog is lazy and mounts after the morph ends. It calls this once
// it is on screen, so the morph layer fades out underneath it.
let pullHandoff: (() => void) | null = null;

export function setPullHandoff(reveal: (() => void) | null) {
  pullHandoff = reveal;
}

/** True when this open came from the drop; the dialog then skips its own pop-in. */
export function isPullHandoffPending() {
  return pullHandoff !== null;
}

export function takePullHandoff() {
  const reveal = pullHandoff;
  pullHandoff = null;
  return reveal;
}
