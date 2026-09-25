import { resolveRunSeconds, resolveRunStartMs } from "./mari-work-card-timing";

// Minimal assert-based self-check. Run with: pnpm tsx packages/client/src/lib/mari-work-card-timing.test.ts
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// A replayed run: two 5s steps, three minutes apart. The span is what the user watched, not 10s.
const replayed = [
  { updatedAt: 1_000_000, durationMs: 5_000 },
  { updatedAt: 1_180_000, durationMs: 5_000 },
];
assert(resolveRunStartMs(replayed) === 995_000, "the earliest step start anchors the run");
assert(resolveRunSeconds(replayed) === 185, "the span covers the gap between steps, not just their durations");

// A live run: the first step has a local anchor and no duration yet.
assert(resolveRunStartMs([{ startedAt: 500, updatedAt: 900 }]) === 500, "a running step anchors on startedAt");

// A trace written before the server stamped timestamps must not fabricate a duration.
assert(resolveRunStartMs([{}, {}]) === null, "no timestamps means no anchor");
assert(resolveRunSeconds([{}, {}]) === 0, "no timestamps means no elapsed claim");
assert(resolveRunSeconds([{ updatedAt: 5_000, durationMs: 0 }]) === 0, "a zero-length run reports zero, not NaN");
assert(resolveRunSeconds([{ startedAt: 1_000, updatedAt: 1_400 }]) === 1, "a sub-second run reads 1s, like its steps");

console.log("mari-work-card-timing: ok");
