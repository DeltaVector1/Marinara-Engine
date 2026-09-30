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

/** Rubber-band resistance for the indicator: the finger outruns it, then it stops. */
export function rubberBand(distance: number, cap: number) {
  return Math.min(Math.pow(Math.max(0, distance), 0.8), cap);
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

// The omnibar dialog is lazy and mounts after the gesture ends, so the release
// speed waits here for it to pick up.
let pullOpenVelocity: number | null = null;

export function setPullOpenVelocity(velocity: number | null) {
  pullOpenVelocity = velocity;
}

export function peekPullOpenVelocity() {
  return pullOpenVelocity;
}
