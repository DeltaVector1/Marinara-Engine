import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  getMariAppearancePack,
  MARI_APPEARANCE_PACKS,
  MARI_STORY_STATES,
  resolveMariRestStory,
  selectMariWorkAnimation,
} from "../../packages/client/src/lib/mari-work-animations.ts";

const pack = getMariAppearancePack("basic");
assert.equal(new Set(MARI_APPEARANCE_PACKS.map(({ id }) => id)).size, MARI_APPEARANCE_PACKS.length);
for (const state of MARI_STORY_STATES) {
  assert.equal(
    new Set(MARI_APPEARANCE_PACKS.map((appearance) => appearance.stories[state].src)).size,
    MARI_APPEARANCE_PACKS.length,
    "switching appearance must select a complete distinct story set",
  );
}
for (const stale of [undefined, null, "core", "expeditions", "removed-pack", {}, []]) {
  assert.equal(getMariAppearancePack(stale), pack, "old preferences must recover to a complete Basic pack");
}
const idle = { working: false, failed: false, cancelled: false, needsApproval: false, hasAppliedChanges: false };
assert.equal(resolveMariRestStory(idle), null, "ordinary replies must not claim applied changes");
assert.equal(resolveMariRestStory({ ...idle, hasAppliedChanges: true }), "success");
assert.equal(resolveMariRestStory({ ...idle, hasAppliedChanges: true, needsApproval: true }), "approval");
assert.equal(resolveMariRestStory({ ...idle, hasAppliedChanges: true, cancelled: true }), "cancelled");
assert.equal(resolveMariRestStory({ ...idle, hasAppliedChanges: true, failed: true }), "retry");
assert.equal(resolveMariRestStory({ ...idle, working: true, hasAppliedChanges: true }), null);

const require = createRequire(new URL("../../packages/server/package.json", import.meta.url));
const sharp = require("sharp");
for (const appearance of MARI_APPEARANCE_PACKS) {
  assert.equal(getMariAppearancePack(appearance.id), appearance, "registered packs must resolve without fallback");
  for (const url of Object.values(appearance.portraits)) {
    assert.ok(readFileSync(new URL(`../../packages/client/public${url}`, import.meta.url)).length);
  }
  for (const state of MARI_STORY_STATES) {
    const chosen = selectMariWorkAnimation({
      activity: "error image write",
      toolNames: ["bash"],
      packId: appearance.id,
      state,
    });
    assert.equal(chosen, appearance.stories[state], "explicit state must beat tool keywords");
    const image = sharp(new URL(`../../packages/client/public${chosen.src}`, import.meta.url).pathname);
    const metadata = await image.metadata();
    assert.equal(metadata.width, 512, "four equal cells");
    assert.equal(metadata.height, 192, "consistent scale across stories");
    assert.equal(metadata.hasAlpha, true);
    assert.equal((await image.stats()).isOpaque, false, "sprite must have real alpha");
  }
}
for (const [name, state] of [
  ["read", "research"],
  ["edit", "editing"],
  ["debug", "debugging"],
  ["image", "images"],
  ["plan", "planning"],
  ["bash", "waiting"],
]) {
  assert.equal(selectMariWorkAnimation({ activity: "", toolNames: [name], packId: "stale" }).id, state);
}
console.info("Mari appearance pack: fallback, lifecycle outcomes, activity selection and all sprite assets passed.");
