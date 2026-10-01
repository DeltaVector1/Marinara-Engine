# Omnibar UX plan (working file)

Working plan for the omnibar / Professor Mari UX round started 2026-09-30.
It is the single source of truth for an orchestrator agent and for resuming
after a quota stop. Delete this file when every slice is Done.

Branch: `feat/omnibar-professor-mari`. Push only with
`git push origin HEAD:refs/heads/feat/omnibar-professor-mari`. Never push
`staging`/`main`, never open a PR, never deploy, never touch `ssh marinara`.

## How to resume

1. `git fetch origin && git status` in the worktree. If the worktree is gone,
   create one from `origin/feat/omnibar-professor-mari`.
2. Read the Status table. The first row that is not `Done` is next. A row
   marked `In progress` was interrupted: check `git log` for its commit; if
   absent, inspect `git status`/`git diff`, finish or discard the partial work.
3. Continue with that slice. Update the table in the same commit as the slice.

## Status

| #   | Slice                                                           | Owner profile | Status  | Commit    |
| --- | --------------------------------------------------------------- | ------------- | ------- | --------- |
| 1   | Handoff bugs (A1-A6)                                            | worker        | Done    | 7a1eef06d |
| 2   | Quick answers: cheap wins (B1-B5)                               | worker        | Done    | 2b4dd9866 |
| 3   | Quick answers: grounding in docs + setting names (B6)           | worker        | Done    | f14039aa0 |
| 4   | Carry aside answer into Mari, show what she received (C1-C3)    | worker        | Done    | 892f2acea |
| 5   | Review of slices 1-4                                            | reviewer      | Done    | 532479233 |
| 6   | Expanded row redesign (D1-D6)                                   | designer      | Done    | 2e81ef9de |
| 7   | Mari card mockup + MariCard primitive + notes (E1-E3)           | designer      | Done    | dbbf886db |
| 7b  | Rework Mari output to the approved direction A (I1-I7)          | designer      | Done    | 627bfcada |
| 8   | Migrate install/file/created cards to MariCard (E4-E5)          | designer      | Done    | 8aa390372 |
| 9   | Review of slices 6-8                                            | reviewer      | Done    | ad7bfc33b |
| 10  | Mobile pull-down from the top bar opens the omnibar (F1-F5)     | designer      | Done    | 3a04b5342 |
| 11  | Quick answer inside the top Ask Mari row, plus polish (G1-G5)   | designer      | Done    | 18237a07a |
| 12  | Mari composer redesign with mode + model pickers (H1-H4)        | designer      | Done    | 7c9f5f8e0 |
| 13  | DB review card + MariEditEasyViewer in direction A (E6)         | designer      | Done    | ff125a4ad |
| 14  | Final review of slices 7b-13                                    | reviewer      | Done    | daddf5a02 |
| 15  | Slime pull-to-open from the approved drop prototype (J1-J5)     | designer      | Done    | bb4f786d0 |
| 16  | Failed replies feed the "fix this" context row (K1)             | worker        | Done    | a74161ca4 |
| 17  | Relative time on recent-chat rows (K2)                          | worker        | Done    | 117cb21b8 |
| 18  | Rows for existing chat tools on the chat surface (K3)           | worker        | Done    | 81393ea47 |
| 19  | Agent-catalog grounding for the quick answer (K4)               | worker        | Done    | 3ba6e78c9 |
| 20  | Flip more boolean settings in place, with Undo (K5)             | worker        | Done    | 3e7f5a89e |
| 21  | Measure omnibar open time; cache only if needed (K6)            | worker        | Done    | f138ad970 |
| 22  | Review of slices 15-21                                          | reviewer      | Done    | ee502bf2d |
| 23  | Mari reads installed agents and their runs (L1)                 | worker        | Done    | ce1d1495f |
| 24  | Failed agent runs feed the "fix this" row (L2)                  | worker        | Done    | 5cdebfb7e |
| 25  | Agent editor as Mari context, agent edits as reviews (L3)       | designer      | Done    | 3535853a6 |
| 26  | Why a lorebook entry did not fire (L4)                          | worker        | Done    | 6991cf90d |
| 27  | `chat.updateMessage`: a reviewed reply fix kept as a swipe (L5) | worker        | Done    | f41a106d6 |
| 28  | Reply-fix review card (L6)                                      | designer      | Done    | 617a47e05 |
| 28b | Omnibar and Mari above every overlay, game setup included (L8)  | designer      | Done    | 2ea1f7f65 |
| 29  | Review of slices 23-28b (L7)                                    | reviewer      | Pending |           |

Slice 10 finished 2026-10-01 (commit 3a04b5342: fluid-drop pull-to-open,
revised from the original pill design per maintainer feedback). Slices 1-9
were deployed to prod as of the 2026-09-30 pause (2d999a330 is slices 1-8;
slice 9 fixes are c4f88b4ce, not yet deployed). Slices 11-15 are Done. Slices 16-22 are Done. Remaining order: 23-29 (section L). Stop after 29.

Slice 10 resume note: the unfinished work is on branch `wip/omnibar-slice-10`
(commit 88e297d68), NOT on this branch. Cherry-pick it first
(`git cherry-pick 88e297d68`). Done there: the gesture (touch only, phone shell,
direction lock, threshold, flick, cancel, click swallow, Home long-press clear,
modal/keyboard guards, haptic tick) with a thin pill indicator, the panel
continuing the release velocity, reduced motion, regression asserts; gesture
tests passed on mobile-chromium and mobile-webkit but the temporary spec was
deleted and must be rewritten. Not done: the fluid-drop redesign (F3/F4 revised
below) replacing the pill; the CHANGELOG line and the inventory text still
describe the pill; `pnpm check` did not finish on that state. WebKit on devbox
needs `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` plus local libs and Mesa EGL
variables; `playwright install webkit` removed older cached chromium-1228 and
webkit-2311 builds.

## House rules for every slice

- Read `AGENTS.md`, `packages/client/.instructions.md`, and for UI
  `/home/dev/.claude/skills/marinara-design/SKILL.md`. Ponytail: smallest
  change that works, reuse existing helpers, delete before adding.
- Heavy commands only through `heavy` (devbox rule): `heavy pnpm check`,
  `heavy pnpm exec playwright test ...`. One heavy job at a time.
- Never run commands in the background and never end your turn to wait for
  one. Background shell completions do not wake a Paseo agent. Run long
  commands (including `heavy` ones) in the foreground with a long timeout (up
  to 600000 ms). Only end your turn when the slice is done or truly blocked.
- Never keep `.test.ts` files. Pure logic gets asserts in
  `scripts/regressions/command-center.regression.ts` (run with
  `heavy pnpm tsx scripts/regressions/command-center.regression.ts`).
- Browser proof: temporary spec `e2e/zz-<name>.e2e.ts` (locally excluded from
  git), run with `heavy pnpm exec playwright test e2e/zz-<name>.e2e.ts --project=desktop-chromium`,
  screenshots to `.tmp/omnibar-ux/<slice>/`, then delete the spec and
  `test-results/`. Useful fixtures: `seedUIState(page, { hasCompletedOnboarding: true,
sidebarOpen: false, rightPanelOpen: false, reduceAmbientEffects: true,
professorMariNavigationEnabled: false })`, `localStorage["marinara:whats-new:seen-version"]="2.4.6"`,
  click the page, then `Control+k`. Quick answers can be mocked with
  `page.route("**/api/professor-mari/quick/prompt")` returning SSE frames
  `data: {"type":"token","data":"..."}` and `{"type":"complete"}`, with
  `omnibarAsideConnectionId: "e2e-fake-connection"`.
- Every user-facing string: semantic key in `packages/client/src/localization/locales/en.json`
  (sorted with `localeCompare(a, b, "en")`, keys may not contain `-`).
- Add a user-facing line to `CHANGELOG.md` `[Unreleased]`; keep
  `docs/development/omnibar-feature-inventory.md` true.
- Done means: `heavy pnpm check` exit 0 (capture the real exit code, do not
  pipe through tail), regression passes, browser proof for UI changes, one
  commit per slice, push with the refspec above, status row updated.

## Findings and work items

Paths are under `packages/client/src/` unless noted. Line numbers are from
2026-09-30 and will drift; search by name.

### A. Handoff to Mari (slice 1) — verify each in a browser before fixing

- A1 Context race: `HomeProfessorMariChat.tsx` seeds `handoffContext` as null
  and copies `initialAskContext` in an effect; the auto-submit effect
  (`submitHandoffDraft`) runs in the same commit, so the first handoff sends no
  context and later ones send the previous context; a post-await
  `setHandoffContext(persistentResourceContext(old))` then overwrites the chip.
  Fix: seed state from `initialAskContext` and pass the context into the send
  explicitly.
- A2 Cold connection drops the send: `effectiveConnectionId` is null until
  connections load, `isBusy` ignores loading, the request is marked handled.
  Fix: include loading in the guard so it retries.
- A3 Stale draft returns: `mariHandoff.draft` stays in session state and is
  written back on every mount (`GlobalOmnibar.tsx`, effect near
  `setInputDraft(PROFESSOR_MARI_DRAFT_KEY, session.mariHandoff.draft)`). Clear
  it once applied or sent.
- A4 "Return to results" completion action only `setMariChatOpen(false)` and
  leaves an empty `mari` pane; make it leave the pane like Back does.
- A5 Draft/submit lost on non-omnibar entries: `enterRequestedMariPane` drops
  `request.draft`; `GlobalOmnibarHost` ignores `submitDraft`. Use
  `request.draft ?? context.query`; strip a scope prefix (`faq:`) from the draft.
- A6 No-connection path opens the connections panel behind the omnibar (z-100)
  and drops the request. Show the fix inside the Mari pane instead (the
  composer's connection picker), keep the draft.

### B. Quick answers (slices 2-3)

Files: `hooks/use-omnibar-aside.ts`, `components/layout/omnibar/OmnibarAside.tsx`,
server `packages/server/src/services/professor-mari/workspace-agent.service.ts`
(unasked branch, `buildQuickContextPayload`), `documentation-tools.ts`.

- B1 Send the real surface (`source`) and a deliberate `resourceLabel` (active
  chat or open editor subject) instead of hard-coded `"command-center"` and
  `contextResults[0]`.
- B2 Visible waiting line with the thinking sprite once the call starts (not
  during the idle delay); handle `status` events.
- B3 Errors: plain message plus "Try again" and "Choose a model" (R24).
- B4 Cache answers per `connectionId + query` (small LRU, short TTL) so
  retyping does not pay again.
- B5 Prompt asks for plain text, exact menu labels; client strips stray
  markdown and marks answers cut at the token cap with "…".
- B6 Grounding: server runs the docs search for the query (top 3 excerpts with
  headings) and adds a compact list of real setting/section labels to the
  unasked prompt. Docs only, no user data (R22 stays true). Keep token use
  bounded; local sidecar must still work.

### C. Aside → Mari (slice 4)

- C1 Add the aside answer to `ProfessorMariAskContext` (shared type + server
  summary) when escalating; `⌘↵` escalates the aside when it is live (R25).
- C2 The context chip lists every facet (resource, chat, field, error, settings
  location, aside answer) and stays visible on the sent message, so the user
  sees what Mari received.
- C3 Also send `fieldId` in the server summary.

### D. Expanded row (slice 6)

Today: row title/avatar/description repeated in a second header; 5-6 borders;
chat facts as a table ("Messages 0"); lorebook dumps entries with key pills;
`animate-in` classes do nothing (plugin not installed); actions repeat Enter;
~500px tall at 390px. Files: `components/command-center/CommandCenterResultRow.tsx`,
`components/command-center/CommandResultPreview.tsx`, `GlobalOmnibar.tsx`
(`renderResultPreview`, preview facts, `previewActions`),
`lib/omnibar-entity-rows.ts`, `lib/omnibar-results.ts`.

- D1 No wrapper/card/header/dividers inside the row; body indents to the row's
  text column; the row's selected state is the only frame.
- D2 Description max 2 lines; one Strip of ≤4 `.mari-chrome-control--compact`
  facts per kind; one quiet Note line (greeting / last message / first entry).
- D3 Actions: drop any that equal the Enter action; `.mari-chrome-control--small`
  chips, `--danger` for remove, ≤3, wrapping.
- D4 Motion: `grid-template-rows: 0fr→1fr` + opacity ~180ms, none under
  reduced motion.
- D5 Trim facts per kind; drop duplicate doc facts (Category/Match); FAQ steps
  as a short list.
- D6 Remove stale "external xl panel" wording (`OmnibarDetailPane.tsx`,
  `omnibar-concept.md`). Keep `CommandResultPreview` behaviour for other
  callers (Mari uses it) — add a lean variant or a small `OmnibarRowPreview`.
- Proof: screenshots character/lorebook/chat/connection at 390/768/1440, dark
  and light; touch targets ≥44px on coarse pointers.

### E. Mari cards (slices 7-8)

Vibe tokens: `--marinara-app-accent-gradient`, `--mari-logo-*`,
`.mari-chrome-accent-frame`, `.mari-chrome-accent-tile`, `.mari-chrome-control`
(+ `--primary/--compact/--small/--danger`), radius 0.75rem, body 0.875rem,
labels 0.8125rem/600, pixel sprites, glow. Rules R41-R48 in
`docs/development/omnibar-concept.md` (Card border only when data is involved,
Note has no box, one Chip, no washes).

- E1 Static mockup first (HTML in `.tmp/omnibar-ux/cards/`, screenshots dark +
  light, 390 + 1440) of MariCard variants (review, created, install, danger)
  and the new expanded row. Save the screenshots for the maintainer.
- E2 `MariCard` primitive in `components/chat/mari-primitives.tsx` + `.mari-card`
  CSS: one border weight (accent frame), solid `--card`, icon tile/avatar,
  title 0.875/600, meta line, body without inner borders, one action bar
  (secondary left, primary right), mobile full-width stacked, ≥44px targets.
- E3 Errors/recovery/tools-unavailable become `MariNote` (no box, no wash) with
  an inline Retry chip; remove `.mari-error-card`, the tools-note box and unused
  `.mari-decision-peek`.
- E4 Dependency-install and sensitive-file approvals on `MariCard`; technical
  details (integrity hash, full path, preview) behind one disclosure.
- E5 Created/updated artifact card (`MariWorkspaceActionResultRow`) on the
  `created` variant; stop reusing `CommandResultPreview` + `--compact` overrides.
- E6 (NOT in this round) DB review + `MariEditEasyViewer` rebuild: neutral
  before/after by default, diff behind a toggle, chips for toggles/keys, no
  nested panels.

### F. Mobile pull-to-open (slice 10) — gesture only, NO top bar icon (maintainer decision)

Today the phone top bar has no omnibar button; the only bar entry is a hidden
550 ms long-press on Home (`components/layout/TopBar.tsx`, `HOME_LONG_PRESS_MS`,
`handleOmnibarClick`). Page overscroll is already off on phones
(`styles/globals.css` mobile `html/body overflow:hidden; overscroll-behavior:none`),
the Android app WebView has no pull-to-refresh, and no touch handlers sit on the
bar. `framer-motion` is installed; no new dependency.

- F1 Hook `hooks/use-pull-to-open-omnibar.ts`, bound in `TopBar` to the header
  and to the safe-area spacer in `AppShell.tsx` (`md:hidden h-[env(safe-area-inset-top)]`).
  Pointer events, `pointerType === "touch"` only, mobile shell only
  (`isMobileShellViewport()`). Direction lock after 10 px (`dy > 1.5 * |dx|`,
  down). Then `setPointerCapture`, clear the Home long-press timer, swallow the
  next click (a pull that starts on a button must not press it). `touch-action: none`
  on the header.
- F2 Threshold `min(120px, 18% of innerHeight)`, at least 80px in landscape;
  open on release past it, or on a flick (> 0.5 px/ms after ≥ 40px). Cancel when
  moving back above the threshold, on `pointercancel`, or a second pointer.
  Skip when `ui.modal`, `isModalOverlayOpen()`, omnibar already open, or
  `data-mari-software-keyboard-open`.
- F3 Indicator: a thin (4px) accent pill under the bar that grows and fills
  with progress (`useMotionValue`/`useTransform`, no React re-render per move),
  rubber-band resistance (`dy^0.8`, capped), snaps full at the threshold with one
  `navigator.vibrate?.(8)`, springs back on cancel. Small, low, faint (see
  memory rule: effects start subtle). `aria-hidden`.
- F4 Hand-off: on open, the omnibar panel continues the downward motion (pass
  the release velocity into the panel's initial y). Reduced motion: no
  finger-following, static fill, open at the threshold.
- F3/F4 REVISED by the maintainer: the indicator is a FLUID DROP, not a pill.
  The user pulls a liquid drop out of the bar's bottom edge; it stretches with a
  neck (surface tension), follows the finger with a spring, pinches off at the
  threshold, and on release falls, lands with a small "plop" (squash, settle)
  and MORPHS into the omnibar (shape and radius ease into the card; the real
  dialog takes over at the end without its own open animation playing twice).
  Below the threshold the drop snaps back into the bar with a small wobble.
  One SVG path driven by framer-motion motion values; no full-screen blur
  filter; accent colour. Reduced motion: no drop, open at the threshold.
- F5 Tests: the pure recognizer (threshold, flick, direction lock, cancel) as
  asserts in `scripts/regressions/command-center.regression.ts` or a small new
  regression; browser proof on `mobile-chromium` (CDP `Input.dispatchTouchEvent`,
  example in `e2e/core-flows.e2e.ts` around the touch-drag test) and
  `mobile-webkit` (synthetic touch PointerEvents): long pull opens; short pull,
  pull back up, and horizontal swipe do not; a pull starting on a bar button
  does not press it; no open while a modal is open; reduced motion still opens.
  Risk to note in the report: on iOS a pull from the very top edge may go to
  Notification Center; only a real device can confirm.

### G. Quick answer at the top (slice 11) — after slice 6

Idea (maintainer): bring the quick answer to the top and make it better.
Constraint: R9 put the aside at the bottom so a late answer never pushes rows
under the cursor. Solution: the answer grows INSIDE the promoted "Ask Mari: “…”"
row, which is already first and selected on a dead end; content is only ever
inserted below the selected row (same rule as R40 and the slice 6 expansion).

- G1 Move the aside UI (waiting line, streamed answer, error with Try again /
  Choose a model, disclosure, link chips) from `OmnibarAside` into the Ask row's
  expansion; the bottom aside slot goes away. When the Ask row is not promoted
  (a normal search), no call is made (unchanged dead-end rule). Update R9 in
  `docs/development/omnibar-concept.md` and the inventory: the answer lives in
  the Ask row, never above the selection.
- G2 Light formatting for the answer (bold, lists, inline code via the app's
  existing message markdown renderer if it is cheap to reuse; otherwise keep
  plain text), and "…" when cut at the token cap.
- G3 Small row actions: Copy, Answer again (bypasses the cache), and Enter /
  ⌘↵ = continue with Mari carrying the answer (slice 4 behaviour).
- G4 One follow-up line inside the row ("Ask a follow-up…") that sends a
  second quick call with the previous answer as context; a third question goes
  to full Mari.
- G5 Expose the idle delay (`OMNIBAR_ASIDE_DELAY_MS`, default 3s) in the omnibar
  settings view (R23 says it is a knob). Proof: mocked SSE answers, screenshots
  390/1440 dark+light, no row above the Ask row moves while streaming.

### H. Mari composer redesign (slice 12)

Idea (maintainer): put the permissions mode (Auto / Ask / Bypass) in or above
the chat bar like ChatGPT and Claude, and redesign the composer a bit. Today
"Auto" is a pill in the tab row at the top of the Mari view, far from typing;
the composer has attach, the context chip and the connection (chain) button.
Files: `components/chat/HomeProfessorMariChat.tsx` (composer, header tab row,
Permissions Mode pill), the permissions mode store/setting (search
"Permissions Mode", #5725), `components/chat/ProfessorMariContextControl.tsx`.

- H1 A compact toolbar row in the composer (below or above the textarea, like
  Claude): mode menu (Auto / Ask first / Bypass, one-line explanation each,
  current mode as the pill label), model/connection menu (replaces the bare
  chain icon), attach. `.mari-chrome-control--compact` chips, menus as
  popovers inside the omnibar dialog (focus + Escape handled like the settings
  view), 44px targets on touch.
- H2 Remove the mode pill from the tab row; the header becomes one calm row
  (sprite + title, tabs, close).
- H3 Keep behaviour identical: same store values, same server semantics;
  Bypass keeps its warning wording.
- H4 Proof: screenshots 390/768/1440 dark+light of the empty state and a
  conversation; keyboard: the mode menu opens with Enter/Space and closes on
  Escape without closing the omnibar.

### I. Approved direction A (slice 7b) — the reference for every Mari output slice

The maintainer rejected the first card mockup (slice 7: identical glowing
bordered boxes, gradient icon tiles, big pink-on-pink buttons, content missing)
and APPROVED direction A of the live demo. Reference, committed with this plan:
`docs/development/mockups/mari-v3/index.html` (open it in a browser; it plays a
scripted run; Replay/Pause/Light/2× at the bottom left). Direction A rules:
text first, chrome last; tool steps as quiet one-line disclosures with an icon
and a past-tense label; the running step is the live line itself (not also a
row in the list); an applied edit is ONE summary line ("Updated Zylo Vantrell ·
3 changes") that opens to tracked changes (old struck and muted, new with tint +
underline so colour is not the only signal; tags as −/+; greeting word by
word) with Undo / Keep as small text buttons; a created thing is a small inline
tile (avatar/portrait, name, one-line hook, "Open ›"); only risky prompts
(delete, install, sensitive file) get a neutral grey 1px border (not pink),
one primary (red Delete / solid neutral Install) and a quiet text secondary,
technical details collapsed; after an answer a prompt folds to one line; a
failed send is one red line under the user's message with Retry; the accent
colour only on her name; the run ends with "Worked for Ns · N steps" at the
bottom with the sprite (success, then idle).

- I1 Rework the slice 7 `MariCard`/`MariNote` (`components/chat/mari-primitives.tsx`,
  `.mari-card` CSS) to direction A: neutral border only for risky prompts, no
  glow, no gradient tiles, small buttons; keep the component names if possible.
- I2 Edits: the applied-change summary line + tracked-change body with Undo/Keep
  (replace the DB review card's default Easy view presentation for prose fields;
  the full DB review rebuild is slice 13).
- I3 Created/updated resources: the inline tile (replaces
  `MariWorkspaceActionResultRow` + `CommandResultPreview` reuse) — this absorbs
  plan item E5.
- I4 `MariWorkTimeline`: quiet step lines; the running step only in the live
  line; "Worked for Ns · N steps" at the bottom where the live line was; the
  sprite stays (success → idle). Respect the appearance-pack rule unless the
  demo's hop is cheap to allow.
- I5 Failed send: one red line under the user's message with Retry (not a Mari
  status line).
- I6 Tone the end-of-run glow DOWN (maintainer rule: small, low, faint; the demo's
  green is too strong) and fix the phone header status truncation ("Professor
  Mari needs your a…") — shorten or wrap the status text.
- I7 Proof: real app screenshots of a mocked run (mock the Mari workspace
  endpoints in Playwright) at 390/1440, dark+light, side by side with the demo;
  reduced motion.

Slice 8 now means E4 only (install and sensitive-file prompts in direction A)
since E5 moved into I3. Slice 13 (E6): the DB review card and
`MariEditEasyViewer` in direction A — neutral tracked changes by default, the
exact diff behind a toggle, chips for toggles/keys, no nested panels, Raw as one
disclosure. The applied-edit group moves inside the turn it belongs to (today
it renders in `pendingApprovalsPanel`, below "Worked for…" after the whole
transcript) as part of that rebuild.

### J. Slime pull-to-open (slice 15) — approved by the maintainer 2026-10-01

Reference: the approved interactive prototype `.tmp/omnibar-ux/drop/index.html`
(served at http://10.0.0.127:8799/drop/; constants at the top of its script).
It replaces the slice 10 drop/pill visuals; the slice 10 recognizer, guards and
tests stay where they still fit.

- J1 Gesture: start anywhere on the phone top bar (touch only, phone shell
  only, existing guards); after the pull starts the finger steers; at release
  the left half opens the omnibar, the right half opens Mari (omnibar in the
  Mari pane); a dead zone with hysteresis in the middle; when Mari is disabled
  the whole bar opens the omnibar. Threshold 30% of the viewport height
  (min 160px, max 280px), flick opens early, pulling back cancels.
- J2 Shape: one smooth, symmetric, calm sheet pulled out of the bar's bottom
  edge (wide base, gentle taper, no string, no bumps, bar edge straight outside
  the pulled area), ending in a circle with a small bar under it; circle shows
  the magnifier (left) or Mari's pixel portrait from the active appearance pack
  (right); small bar reads "Search" / "Ask Mari", at the threshold "Release to
  search" / "Release to ask Mari" (localized keys). Circle and small bar sit
  ABOVE the fingertip.
- J3 Colour: exactly the top bar surface (`--marinara-topbar-surface` over the
  app background, same blur) at the join, opaque at the top to more transparent
  at the bottom; no accent in the sheet, only a faint glow around the circle
  when armed. Dark and light.
- J4 Motion: viscous follow, slight sag, stretch; at the threshold the sheet
  thins and releases the circle, the sheet snaps back into the bar, the circle
  pops open into the omnibar search field or the Mari view (portrait flies to
  the header, title fades in after it); below the threshold everything slurps
  back. One SVG path / clip path driven by framer-motion motion values, no
  React re-render per move, 60fps. Reduced motion: no sheet, only the label
  near the finger, opens at the threshold.
- J5 Proof: regression asserts for the pure parts (threshold, side/dead zone,
  flick, cancel); browser tests on mobile-chromium and mobile-webkit (long pull
  left opens the omnibar, right opens Mari, short pull and pull-back do not, a
  pull starting on a bar button does not press it, no open under a modal);
  screenshots dark+light compared with the prototype; CHANGELOG and inventory
  updated; `heavy pnpm check` exit 0.

### K. Assistant round 2 (slices 16-22) — approved by the maintainer 2026-10-01

Source: the strategy report (jobs the omnibar owns; Mari only behind the dead
end). Only items that need no product decision. Rules for every K item: unasked
Mari calls get query + surface + resource label + docs/settings labels only
(R22); user content leaves the device only after a deliberate act; every write
is a review (R5); if a deterministic row answers, ship the row, not a Mari run.
Check what already exists before adding anything.

- K1 Fix what just broke: today `lastAppError` is set only by connection tests
  (`hooks/use-connections.ts`). In `hooks/use-generate.ts` (`showError` and the
  agent-failure path) also call `setLastAppError({ message, action: "Generate
reply", retry: { kind: "open-connection", id: <active connection> } })`;
  clear it on the next successful generation. The context row and the
  `chat-error` Mari handoff exist already. Error text goes to Mari only on ⌘↵.
  Proof: regression assert on `buildOmnibarContextResults` with a generation
  error; e2e that mocks a 500 from generate, then ⌘K shows the error row first
  and ⌘↵ opens Mari with `source: "chat-error"`.
- K2 Relative time: recent-chat rows show an absolute date
  (`formatDate` in `lib/omnibar-entity-rows.ts`). Use the existing
  `formatRelativeContact` (`lib/relative-time.ts`) for the second line, at least
  in the Recent group. Proof: regression assert with a fixed `now`; screenshot
  390 and 1440.
- K3 Chat tools as rows: on the chat surface, reach Summary (`SummaryPopover`),
  Active lorebook entries, Peek prompt, Search this chat, Continue and
  Regenerate from the omnibar; each row opens/runs the existing UI, nothing new
  behind it. First list which already exist as `data.commands` and skip those.
  Mari never writes roleplay. Proof: regression on surface rows; e2e opening
  Summary from ⌘K.
- K4 Agent catalog grounding: when a quick-answer query asks for a capability
  ("images", "music", "maps"…), add 2-3 matching lines from
  `official-agent-knowledge.ts` to the aside context (static data only, R22
  holds) and show a link chip to Download Agents. Proof: extend the
  quick-context-payload check; mocked answer shows the chip.
- K5 Flip settings in place: only 9 of 59 `Toggle` controls in
  `settings-registry.ts` flip in the omnibar (`toggleRows` in
  `omnibar-results.ts`). Add a small `controlId → { get, set }` binding map for
  client-store toggles next to `omnibar-settings.ts`; the registry stays plain
  data. Exclude server-backed and risky toggles (anything that deletes, spends
  money, or changes security). Keep the existing Undo toast. Proof: regression
  assert that every bound id is a `Toggle` in the registry; e2e flip + Undo.
- K6 Open time: add `performance.mark`/`measure` on ⌘K or pull and on the first
  result paint (`useLayoutEffect`), logged only in debug mode (client
  `console.debug`). Measure on a large fixture (2k characters, 5k chats). Add a
  cache for derived rows only if p95 > ~100 ms; otherwise record the numbers in
  this file and ship only the measurement. Proof: the numbers.
  Done 2026-10-01: marked in `setOmnibarOpen` (the shared open action every
  trigger - ⌘K, the pull gesture, the topbar click - already routes through)
  and measured in `GlobalOmnibarDialog`'s first non-Mari-pane `useLayoutEffect`
  (`packages/client/src/lib/omnibar-open-timing.ts`). Measured with a mocked
  `/api/characters` (2,000 rows) and `/api/chats` (5,000 rows), 40 opens via a
  temporary `e2e/zz-omnibar-open-perf.e2e.ts` (deleted after the run):
  **p50 138.4 ms, p95 157.0 ms, max 1608.6 ms (n=40)**. p95 is over the
  ~100 ms bar.
  Slice 22 review correction: the `memoizeLastByKeys` cache added here keyed
  `buildOmnibarChatRows`/`buildOmnibarCharacterRows` on `useMemo` lookup maps
  (`characterById`, `connectionById`, `personaById`,
  `lorebookNamesByCharacter`) that `GlobalOmnibarDialog` recreates on every
  mount - and the dialog unmounts on close - so the cache could never hit
  across opens and was dead weight; it has been removed and those two
  builders are plain functions again. The real, zero-risk win found in review:
  `GlobalOmnibar.tsx`'s `data` memo (and the ranking/searchable memos
  downstream of it) depended directly on `setDefaultPreset`/`updateLorebook`,
  the `useMutation` result objects, which TanStack Query hands back as a new
  reference on every render, so that memo chain rebuilt on every keystroke
  and hover while the dialog was open, not just on open. Extracting their
  stable `.mutate`/`.mutateAsync` functions into the dependency array (the
  same pattern the file already used for `patchChat`) fixes that unnecessary
  work. This does not touch the measured open→first-paint numbers above,
  which stay the real baseline: p95 ~136-157 ms, still above the ~100 ms bar.
  The next lever - capping or virtualizing the idle list on a 7k-entity
  library - needs a maintainer decision and is out of scope for this round.
- Slice 22: reviewer pass over 15-21 (read-only findings, then a worker fixes
  the confirmed ones in the same slice).

Needs the maintainer's decision, NOT in this round: batch review for library
chores, lorebook health check placement, Mari in the
game setup wizard.

### L. Mari in chats and in agents (slices 23-29) — maintainer decision 2026-10-01

Decision: Mari helps inside and outside chats, inside the agent surfaces, and knows the agents.
In scope: #6 (why an entry did not fire), #9 (fix a broken reply as a review), agents. Out: batch
library writes, lorebook health check, game setup (L-open). K's rules hold for every item: unasked =
query + surface + resource label + docs/settings labels (R22); chat text, error text, prompts and
field values go to Mari only after Enter/⌘↵ and show as `MariContextFacetChips` facets; every write is
a review (R5); a deterministic row beats a Mari run; no new buttons in editors or chat (R29) — the doors
are ⌘K, the top bar and existing rows. Repo boundary (AGENTS.md): only Engine host code here.

- L1 Mari reads agents (server only). `executeAgentAction` (`mari-db.service.ts:4381`): `list` merges
  the installed registry (`agent-registry.ts`, the same source as `GET /capability-packages/agents`,
  `capability-packages.routes.ts:110`) with `agent_configs`: name, type, packageId, phase, category,
  modes, enabled, custom/package, prompt overridden yes/no, setting keys (names only, no values);
  `get` accepts an id or a type (`getById ?? getByType`, `agents.storage.ts:119/124`). New read
  `agent.runs { type, chatId?, limit≤10 }` from `getLastRunByType`/`listRunsByTypeForChat`
  (`agents.storage.ts:475/568`): success, error, durationMs, createdAt. Add `runs` to the read regex
  `appDataActionLooksReadOnly` (`workspace-agent.service.ts:1869`) and the action enum (`:328`).
  Prompt (`:772` block): before "which agent fits" check `agent.list` installed, then the catalog,
  then link Agents → Download Agents; never claim an uninstalled agent is active. Proof: regression
  asserts that `agent.runs` is read-only and that the merged list includes a registry-only agent.
- L2 Failed agent runs feed "fix this". `lastAppError.retry` (`ui.store.ts:669`) gains
  `{ kind: "open-agent"; id: agentType }`. Set it where `agent_error`/`agents_retry_failed` land
  (`use-generate.ts:2948/3180`, from `toAgentFailure`, `lib/agent-failures.ts:64`) with action
  "Run <agent name>"; never overwrite a current "Generate reply" error; clear on the next clean run.
  `buildOmnibarContextResults` (`omnibar-results.ts:982`) keys the row on `retry.kind` (connection row
  or `agent:<type>` row, Enter opens the agent editor); `buildAskContext` (`GlobalOmnibar.tsx:2345`)
  sends `source: "chat-error"` + `resource { kind: "agent", id: type }` for either row; Mari then calls
  `agent.runs`. Proof: regression on the context rows with an agent error; e2e mocks an `agent_error`
  SSE frame, ⌘K shows "Fix: Run Illustrator failed" first, ⌘↵ shows the error + agent facets.
- L3 Agent editor as Mari context (designer). `AgentEditor.tsx` (prompt `:1016`, name, description)
  sets `activeEditorField` on focus exactly like `CharacterEditor`; the existing "Improve {{field}}
  with Mari" row (`omnibar-results.ts:997`) and field facet then work with no new UI. Fix custom agents:
  `resolveResource` resolves `agent` by id then type (`workspace-agent.service.ts:3825`), so ⌘↵ on
  "Editing <custom agent>" no longer says "no longer available". Prompt edits go through
  `agent.update` → applied review: `MariEditEasyViewer` (`rowTitle :43`, icon `:167`) labels
  `agent_configs` "Agent" with the agent icon, `promptTemplate`/description render as prose
  (`trackProseChange`), `settings` JSON stays behind Raw. With the catalog open, `asideResourceLabel`
  is "Download Agents" (`GlobalOmnibar.tsx:1502`). Proof: e2e edit a custom agent's prompt via a mocked
  Mari review, Keep and Restore; screenshots 390/1440 dark+light of the agent review row.
- L4 Why an entry did (not) fire. "Did fire" is already deterministic (matched keys in
  `ActiveLorebookEntriesPanel`, `ChatRoleplayPanels.tsx:375`; K3 row) — no Mari. New read
  `lorebook.testScan { lorebookId, chatId, entryId? }` wrapping the `POST /lorebooks/:id/test` logic
  (`lorebooks.routes.ts:1335` → `runLorebookTestScan`): returns activated/blocked with reasons, plus
  "no key matched in the scanned messages" for an absent entry. Mari gets keys and reasons, not the
  scanned text. Door: ⌘↵ on a lorebook-entry row while a chat is active sends the lorebook resource +
  `activeChat` (facets: lorebook, chat); typed "why didn't X fire" works too. Prompt line: answer with
  the reason and the exact setting to change, offer `lorebook.updateEntry` (review) only if asked.
  Proof: regression on the result shape for a secondary-key block and a no-match; e2e mocked answer.
- L5 `chat.updateMessage` (server). New write `chat.updateMessage { chatId, messageId, content, reason }`
  for assistant/narrator messages in non-game chats only. It never overwrites: it adds the fixed text
  as a new swipe and makes it active (reuse chat storage `addSwipe` and the active-swipe path behind
  `chats.routes.ts:3881/4010`), so the old reply is kept. Always a review card, also in Accept-edits/Bypass (like deletes, `mari-db.service.ts:7427`);
  Restore sets the old swipe active and removes the new one through chat storage, never a raw row
  restore. Guard: raw `mari db` writes to `messages`/`message_swipes` (`file-backed-store.ts:362`) are
  refused with a pointer to `chat.updateMessage`. Prompt: repair only (cut-off end, OOC lines, broken
  formatting), keep the voice, never continue or rewrite the scene. Door: typed "fix the last reply" on
  the chat surface, or ⌘↵ on a message hit (`commandCenterResultId` carries the message id; print it in
  `buildHandoffContextPrompt`, `:3805`). Proof: regression on the guard and on read-only/write
  classification; e2e Keep and Restore keep both texts as swipes.
- L6 Reply-fix review card (designer). `MariEditEasyViewer`: a `messages` change reads "Reply ·
  <chat name>", content as tracked prose, Restore wording "Put the old reply back". After Keep, the
  open chat shows the new swipe without reload (invalidate the chat messages query). Proof: screenshots
  390/1440 dark+light; e2e the chat shows the fixed text and swipe 2/2.
- L7 Reviewer pass over 23-28 (read-only findings, then a worker fixes the confirmed ones). Check R22
  on every new payload, that no write skips a review, and the inventory/CHANGELOG.

Belongs in Pasta-Devs/Marinara-Agents, not here: per-setting help text for each agent (manifests
have only an untyped `defaultSettings`; Mari can name keys, not explain them), better error text from a
package agent, Mari inside feature-package UIs (`FeatureAgentDetailHost` content), catalog
descriptions (`official-agent-knowledge.ts` mirrors them; refresh it when the catalog changes).

L-open resolved 2026-10-01: the maintainer decided "Omnibar and Mari should be above all!" (L8).

- L8 Omnibar and Mari above everything (designer, slice 28b). Today the omnibar is `z-[100]`
  (`GlobalOmnibar.tsx`, backdrop and the preview layer at `z-[110]`) while many overlays sit higher:
  `z-[9999]` popovers, the game setup wizard and lightbox at `z-[10000]`/`z-[10001]`, capability
  elements `z-[10020]`, the chat help overlay `z-[10050]`, `CsrfOriginWarningBanner` 9999. Put the
  omnibar, the Mari pane/workspace takeover and their own portalled popovers/menus/tooltips above all
  of them with ONE shared layer constant (or CSS variable) instead of new magic numbers; keep the
  sonner `Toaster` (`App.tsx`) above the omnibar so Undo toasts stay visible. Skip
  `PersonalExtensionContributionsMenu` (`z-[2147482000]`, user extensions) only if it cannot be
  outranked sanely; note it. ⌘K and the slice 15 pull now open over modals and the game setup wizard
  too (relax the "no open under a modal" guard: open ON TOP instead); Escape closes the omnibar first
  and leaves the modal underneath intact; focus returns to the modal. With the wizard open, the surface
  is the game setup, so typed questions reach Mari as the existing `game-setup` entry point with the
  wizard step as label only (R22) — no new button in the wizard (R29). Proof: e2e at 390 and 1440
  that opens ⌘K over the game setup wizard, a lightbox and a Settings dialog, Escape returns to each;
  pull-to-open over a modal now opens; screenshots dark+light; regression where pure.

  Done 2026-10-02. One layer, `--mari-layer-omnibar: 100000` (`globals.css`), used by the omnibar
  root, its error panel, the pull overlay (+1), Mari's portalled dialogs/popovers (+1/+2),
  `HelpTooltip` (+1) and the expanded macro editor (same layer, DOM order). A `Modal` opened while
  the omnibar is open takes the layer. NOT a slice 15 regression: the "no pull/⌘K under a modal"
  guard was removed on purpose; covered bars are followed on the document. Skipped:
  `PersonalExtensionContributionsMenu` (2147482000) and `PersonalExtensionInjector` windows
  (2147483000) stay above; they already sit above sonner (999999999), so outranking them would mean
  moving the toaster into the 2^31 range too. The regression pins both exceptions.
