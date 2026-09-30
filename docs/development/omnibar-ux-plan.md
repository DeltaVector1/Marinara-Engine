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

| #   | Slice                                                         | Owner profile | Status | Commit    |
| --- | ------------------------------------------------------------- | ------------- | ------ | --------- |
| 1   | Handoff bugs (A1-A6)                                          | worker        | Done   | 7a1eef06d |
| 2   | Quick answers: cheap wins (B1-B5)                             | worker        | Done   | 2b4dd9866 |
| 3   | Quick answers: grounding in docs + setting names (B6)         | worker        | Done   | f14039aa0 |
| 4   | Carry aside answer into Mari, show what she received (C1-C3)  | worker        | Done   | 892f2acea |
| 5   | Review of slices 1-4                                          | reviewer      | Done   | 532479233 |
| 6   | Expanded row redesign (D1-D6)                                 | designer      | Done   | 2e81ef9de |
| 7   | Mari card mockup + MariCard primitive + notes (E1-E3)         | designer      | Done   | dbbf886db |
| 7b  | Rework Mari output to the approved direction A (I1-I7)        | designer      | Done   | 627bfcada |
| 8   | Migrate install/file/created cards to MariCard (E4-E5)        | designer      | Done   | 8aa390372 |
| 9   | Review of slices 6-8                                          | reviewer      | Done   | ad7bfc33b |
| 10  | Mobile pull-down from the top bar opens the omnibar (F1-F5)   | designer      | Todo   |           |
| 11  | Quick answer inside the top Ask Mari row, plus polish (G1-G5) | designer      | Todo   |           |
| 12  | Mari composer redesign with mode + model pickers (H1-H4)      | designer      | Todo   |           |
| 13  | DB review card + MariEditEasyViewer in direction A (E6)       | designer      | Todo   |           |
| 14  | Final review of slices 7b-13                                  | reviewer      | Todo   |           |

Resumed 2026-09-30 after the maintainer approved direction A. Order: 7b, 8, 9,
10, 11, 12, 13, 14. Stop after slice 14.

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
