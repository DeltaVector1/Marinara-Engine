# Omnibar feature inventory

What the omnibar does today. This is a behaviour contract, not a design
document: if a change removes a line from this file, that removal must be
deliberate.

Rewritten after the concept work in `omnibar-concept.md` landed. The five panes
described by the previous version are gone; see section 1 and section 11.

Scope: `packages/client/src/components/layout/GlobalOmnibar.tsx`, the surfaces
under `components/layout/omnibar/`, the `lib/omnibar-*.ts` modules, and the
server global chat search the omnibar reads.

Related document: `omnibar-concept.md`, the design rules this implementation
follows. Historical build plans were removed after the implementation landed;
Git history retains them without presenting obsolete architecture as current.

## 1. Surfaces

One list, and the one surface that takes it over. The persisted `pane` holds two
values.

| Surface   | Purpose                                                          | Entered by                                                                                   |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `results` | The ranked result list. The default, and every open starts here. | Open, or Escape from a takeover                                                              |
| `mari`    | Professor Mari's work surface.                                   | The Mari button, `⌘↵`, a preview's Continue with Mari, a Mari-owned row, or the Ask-Mari row |

Two things render **inside** the list rather than replacing it:

- **Inline expansion.** A focused row grows to show its preview, or a choice
  control's options. The row itself grows; rows above it never move.
- **The aside.** A cheap answer that grows inside the promoted Ask-Mari row as
  that row's expansion, so it only ever pushes rows below the selection and
  nothing above the Ask row moves while it streams. It is not a row of its own:
  never ranked, never in the arrow-key cycle.

Rules that must survive:

- The omnibar always reopens on the list, because closing persists `results`
  rather than whatever pane was open. A session persisted with the removed
  `browse`, `detail` or `quick` panes also falls back to the list.
  `normalizeCommandCenterSessionState` deliberately **preserves** a persisted
  `mari` pane instead of resetting it: `GlobalOmnibarHost` requests Professor
  Mari by writing that pane and then opening the omnibar, so a reset on read
  would break every "open Mari" hand-off from Home, the FAQ and error recovery.
- Escape collapses an expansion if one is open; otherwise it leaves a takeover;
  otherwise it closes. One level, so Escape and the back arrow always agree.
- A view or menu inside the dialog (the settings sheet, Mari's mode,
  connection and paperclip menus, her header ⋮ menu) takes focus when it opens, keeps Tab inside, and handles
  Escape itself (`useInDialogFocusScope`); the dialog's own Escape needs a
  second press.
- Escape from a takeover never cancels a running answer.
- Leaving `mari` restores focus to the row it came from (`mariReturnResultId`),
  falling back to the input.
- The result preview renders from one `renderResultPreview` body, inline under
  the focused row and nowhere else. Only a "rich" result expands: media, prose,
  facts, or a setup/admin requirement.
- The expanded row has no header, card or divider of its own; the row's selected
  state is its only frame, and the body indents to the row's text column. The
  row's second line wraps to two lines, and the body adds only what the row does
  not show: a description that differs from that line, one Strip of at most four
  `.mari-chrome-control--compact` facts, FAQ steps as a short list of up to
  three, one muted Note line (a character's greeting, a chat's last message, a
  lorebook's first entry), and at most three `--small` action chips (`--danger`
  for remove). It opens with a 180 ms `grid-template-rows` + opacity animation,
  none under reduced motion or Reduce ambient effects.
- The `mari` pane follows direction A (`docs/development/mockups/mari-v3/index.html`):
  text first, chrome last, and the accent only on her name.
  - Steps are quiet one-line disclosures: a verb icon, a past-tense label
    ("Read character Zylo Vantrell", `pastTenseStepTitle`), the duration, a
    chevron to the technical details. Her thoughts use the same line. The
    running step is only the live line (sprite, present-tense headline, timer);
    it is never also a row in the list.
  - When the run ends, the live line becomes "Worked for Ns · N steps" at the
    bottom of the turn and folds the steps and thoughts away. On the newest
    turn her sprite stays on it (success just after the run, then idle, or the
    retry / stopped / approval story); older turns keep only the words.
  - An applied DB edit (`MariEditEasyViewer`: updates, inserts and lorebook
    entries alike) is one summary row per record: avatar or monogram, name,
    "Updated character · description, tags, first message" and "N changes", or
    "Lorebook entry · …" and "New" for a created record. It opens to tracked
    changes: old text struck and muted, new text underlined on a light tint,
    word by word when much of the old text survives (`trackProseChange`).
    Lists (tags, primary and secondary keys) are −/+ chips (`trackListChange`),
    one-word values (selective logic, probability) are a − old and a + new chip,
    and switches gather into one "Switches" line ("+Case sensitive",
    "−Whole words"; `fieldChangeStyle` decides). A new record's values read
    plain, not inserted. A lorebook entry also shows its activation (Constant,
    Selective or Normal) and vector state as two plain chips. An agent edit
    (`agent_configs`) reads "Updated agent · …" with the agent's artwork (a
    monogram without one, like every record); its prompt
    template and description are tracked prose, and its nested `settings` JSON
    shows only under Raw (plain setting values still show as fields). "Show exact
    changes" swaps every field to the line-by-line diff and back. Raw is one disclosure (`.mari-tech`: tables,
    rows, the command and every created row's snapshot); the "Edit review opens
    in" setting opens it by default. Undo, Keep (and Keep & Enable for a new
    memory) are small `.mari-link` / `.mari-btn` buttons (their hit area grows
    to 44px on touch); View as prompt and a multi-row lorebook entry's Reject
    stay as quiet links. No panel sits inside another. A folded row's content
    is `inert`, so its hidden buttons leave the Tab order.
  - A review renders inside the turn that asked for it, after her answer and
    before "Worked for" (`assignReviewsToTurns`: the reply between the user
    message before `requestedAt` and the next one). One whose turn has no reply
    stays after the transcript.
  - Something she created or updated is a small tile (`MariWorkspaceActionResultRow`):
    portrait or monogram (`MariRecordAvatar`), name, "New" for a created record, one
    line (its description, or the changed fields), and "Open ›".
  - Risky prompts (install, sensitive file, delete) are a `MariCard`
    (R42): one neutral hairline, a small icon tile (red-tinted only for
    danger), one primary and one quiet text secondary. No glow, no gradient
    tile, no accent frame. The dependency-install ("Install nanoid") and
    sensitive-file ("Change package.json") prompts use it: the reason and the
    risk in one line, a solid Install / Apply change, a quiet Not now, and the
    exact package, integrity hash, source, full path and content preview behind
    one "Technical details" disclosure (`.mari-tech`). Once answered, it folds
    to one quiet `MariNote` line with an icon (`ResolvedPromptLine`: "Installed
    nanoid", "Skipped: Change package.json") in the same place until the next
    send. A DB review that deletes is the `danger` variant: "Delete Old market
    rumor", the record type (plus "· 120 linked items" for its cascade, counted
    from `affectedRows` because the preview stops at 50 rows;
    `summarizeDeleteReview`), the reason plus that she already removed it for
    now, a note when the preview is truncated, a quiet "Put it back" and a red
    Delete, with Raw (the command and the removed row) behind one disclosure.
  - A failed send is one red line under your message with an inline Retry
    (`.mari-send-failed`), not a line of hers. A workspace-status error and
    missing workspace tools are `MariNote` lines (R43).
  - The end-of-run glow is a small, low, faint green band that sinks within
    3.5 s. The header status wraps to a second line on a phone instead of
    ending in "…", and waiting on a review reads "Needs your answer".
  - The header is one calm row of tabs (Chats, Skills, Memories, Context), New
    chat and, below 64rem, the overflow menu. It has no mode control.
  - The composer puts the textarea on its own row and a toolbar under it:
    attach, the connection as a labelled `.mari-chrome-control--compact` menu
    (it replaced the bare link icon; a red dot when none is set), and the
    Permissions Mode as a labelled menu (current mode on the chip, Bypass in
    red, Plan in the primary colour). The mode menu keeps "Use default" plus the
    five modes with their one-line descriptions, writes the same per-chat
    `PUT /professor-mari/workspace/permissions-mode { mode, chatId }`, and
    keeps the Bypass wording unchanged. On a phone both menus span the composer;
    every toolbar control is 44px on a coarse pointer.

## 2. Query handling

- Input is deferred (`useDeferredValue`) so typing paints before the
  search, rank and present pipeline reruns.
- **Scope prefixes** (`lib/omnibar-scope.ts`): `faq:`, `docs:`, `msg:`, `chat:`,
  `char:`, `persona:`, `lore:`, `preset:`, `conn:`, `agent:`, `set:`, plus long
  and plural aliases. The colon is required. Everything downstream sees only the
  text after the prefix. A bare prefix with no query lists that whole category.
- **Inline ghost completion**: the first ranked title is completed after the
  cursor, accepted with Tab. It completes the name only — the sentence
  completion said the same thing as the add and removal suggestion rows.
- **Intent parsing** (`lib/omnibar-search.ts`): verbs are classified as
  `navigate`, `action`, `create`, `explain`, `recommend` or `repair`, and an
  object kind in the query ("add character eliza") narrows the search to that
  kind. A bare verb matches nothing by text and is answered by the verb
  suggestion builder instead.
- **Removal versus attach**: `remove`, `drop`, `detach`, `disable` and
  `turn off` are detaching verbs. "disable Tavern" never offers to attach it.

## 3. Result sources

Every builder is pure and lives in `lib/omnibar-results.ts` unless noted.

| Source                                                                         | Builder                                                                                       | Notes                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entities: chats, characters, personas, lorebooks, presets, connections, agents | `lib/omnibar-entity-rows.ts`                                                                  | `preview` stays a thunk, built only for the focused row                                                                                                                                                                                                                                                                          |
| App commands and personal extensions                                           | `data.commands`                                                                               | Extension commands come from `personal-extension-contributions`                                                                                                                                                                                                                                                                  |
| Settings destinations                                                          | `lib/omnibar-settings.ts`                                                                     | Derived from `lib/settings-registry.ts`: 6 tabs, 32 sections and every searchable control, each deep-linking to a tab, a section or a control id. A control whose id is in `lib/omnibar-settings-toggle-bindings.ts` flips in place instead; everything else still only deep-links                                             |
| Quick controls                                                                 | `buildOmnibarControlResults`                                                                  | Theme and presence as choices; 9 hand-built toggles plus 46 settings-registry toggles bound via `lib/omnibar-settings-toggle-bindings.ts` (client-store booleans only — server-backed, permission-gated and non-boolean toggles stay deep-link-only)                                                                            |
| Active-chat controls                                                           | `buildOmnibarChatControlResults`                                                              | Model, preset, persona (choices, capped at 6 plus the current value) and an agents toggle. These edit the chat in place — nothing navigates away                                                                                                                                                                                 |
| FAQ                                                                            | `buildOmnibarSearchResults`                                                                   | Ids are `faq:<id>`; opens the FAQ viewer modal                                                                                                                                                                                                                                                                                   |
| Documentation                                                                  | `useDocsCommandSearchProvider`                                                                | Passage search; opens the docs viewer at the match                                                                                                                                                                                                                                                                               |
| Messages in the open chat                                                      | `buildOmnibarMessageResults`                                                                  | Client-side over the shared transcript cache; 3-character minimum, 6 results                                                                                                                                                                                                                                                     |
| Messages in every other chat                                                   | `buildOmnibarGlobalMessageResults`                                                            | The shared global chat search; see section 6                                                                                                                                                                                                                                                                                     |
| Lorebook entries (name, keys, content)                                         | `buildOmnibarLorebookEntryResults`                                                            | Server-backed (`GET /api/lorebooks/search/entries?q=&limit=`), same typing pause and 3-character minimum as message search, with no scope or `lore:`. Choosing one opens the lorebook on Entries with that entry expanded and scrolled to. `⌘↵` on the row (or typing "why didn't X fire") hands Mari the entry's id plus the active chat; she calls the read-only `lorebook.testScan` action (wraps the same scanner the "Test" tool and real generations use) and answers with the exact gate reason and the setting to change, never the scanned chat text |
| Professor Mari's own conversations                                             | `buildOmnibarMariChatResults`                                                                 | They sit behind an internal marker and are absent from the chat list                                                                                                                                                                                                                                                             |
| Slash commands                                                                 | `buildOmnibarSlashResults`                                                                    | Chat surface only. Choosing one types it into the chat input rather than running it, so arguments stay visible                                                                                                                                                                                                                   |
| Context rows                                                                   | `buildOmnibarContextResults`                                                                  | "What am I on?": the open editor, the current chat and everything attached to it, the last error, an unfinished creation session. A failed reply's "Fix: Generate reply failed" row and a failed agent run's "Fix: Run <agent name> failed" row (keyed on `agent:<type>`, Enter opens the agent editor) are the only rows that hand Mari the error through the `chat-error` source door (`GlobalOmnibar.tsx`'s `buildAskContext`); every other unasked Mari call carries no user content |
| Chat tool rows (chat surface)                                                  | `buildOmnibarContextResults`                                                                  | Search this chat, Active lorebook entries, Peek prompt, Summary (roleplay only) and Regenerate reply. Each dispatches a `chat-floating-ui-events.ts` request the chat's own toolbar/composer already listens for, so the row opens or runs the existing UI — nothing new behind it. Continue is already reachable via the idle `/continue` slash row, so it gets no new row. Game mode gets only Active lorebook entries and Peek prompt: it has its own turn-retry reset (`GameSurface`'s `handleRetryTurn`) instead of plain Regenerate, and no listener for Search this chat |
| Idle rows                                                                      | `buildOmnibarIdleResults`                                                                     | Unfinished setup first (capped at 2), then recents, then surface commands                                                                                                                                                                                                                                                        |
| Intent shortcuts                                                               | `buildOmnibarIntentShortcuts`                                                                 | "new character Bob" / "create a lorebook called Silver Court" open the create window with the typed name (casing kept); "chat with Shrek" / "new chat Dottore" / "talk to Eliza" open the start-chat window for each character whose name the text starts (up to three). Current-work group; nothing is created from the omnibar |
| Recent chats (idle)                                                            | `recentChatResults` in `GlobalOmnibar.tsx`                                                    | The four most recently active chats other than the open one, as ordinary chat rows in the Recent group. When the first Current-work row is only the open chat, the empty omnibar starts on the first of these, so Cmd/Ctrl+K then Enter switches back                                                                            |
| Verb, attach and detach suggestions                                            | `buildOmnibarVerbSuggestions`, `buildOmnibarAddSuggestions`, `buildOmnibarRemovalSuggestions` | Answer a half-typed sentence                                                                                                                                                                                                                                                                                                     |
| Creation proposal                                                              | `lib/omnibar-creation-proposal.ts`                                                            | Nothing is created until accepted                                                                                                                                                                                                                                                                                                |
| Choice values                                                                  | `lib/omnibar-choice-rows.ts`                                                                  | With a query typed, every choice control's options join the searchable set, so "gpt" reaches GPT-4 without finding the Model row first. They stay out of the idle deck. Each row carries its own `chooseValue`, so a row found by typing works when its control is nowhere on screen                                             |
| "Ask Professor Mari" fallback                                                  | `buildOmnibarSearchResults`                                                                   | Always last unless promoted. Opens Mari's takeover. The cheap answer arrives on its own, inside this row — see section 12                                                                                                                                                                                                        |
| "Continue with Mari"                                                           | `buildOmnibarContinueResult`                                                                  | Only when Mari is active or has pending approvals                                                                                                                                                                                                                                                                                |
| Pending Mari approvals                                                         | `buildOmnibarApprovalResults`                                                                 | A DB review is a Keep/Restore choice row titled by the one record it changed ("Mari changed Scene Critic") or by the kinds of several (`describeTable`: "Agent", "Lorebook entry"), never a raw table name; an install or file write opens the Work pane card instead |

De-duplication is by result id, first source wins. Message rows from the open
chat and from the global search share an id shape on purpose, so a hit is never
listed twice.

### 3a. The settings registry

`lib/settings-registry.ts` is the single source of truth for settings
navigation: the 6 tabs, the 32 sections and every searchable control, with the
labels, descriptions and aliases they are found by. It is plain data — no
imports of stores, icons or components — so both the Settings panel and the
omnibar can read it.

- `omnibar-settings.ts` **derives** its rows from it and states nothing of its
  own. It previously kept a parallel list of 25 controls; the two drifted until
  three of those 25 pointed at control ids that no longer existed, and choosing
  those rows opened the tab and silently failed to scroll. Of the 99 controls the
  registry defines, 22 had a row and 77 had none.
- `omnibar-settings.test.ts` fails if any emitted row names a tab, section or
  control the registry does not define. That check is the reason a second list
  cannot come back by accident.
- Strings are English and localized by `useLocalizedUiText`, the same path the
  Settings panel's own search uses. There are no `{ key, fallback }` pairs.
- `SettingsPanel`'s `TABS` keeps the icons and the i18n keys, and pins its ids
  to the registry with `satisfies`, so a renamed tab fails the build.
- A row deep-links to a control (`settings-control:<id>`), a section
  (`settings-section-detail:<id>`) or a tab (`settings-section:<tab>`). The tab
  ids keep that older shape because the context bonus matches on them.

## 4. Ranking

Score is the source score plus a context bonus plus an intent bonus, then the
shared command ranking (recency and pins) reorders it.

- Text scoring prefers exact title, then prefix, then whole word, then substring.
- Context bonuses, highest first: the open resource (80, or "unsaved changes"
  when the editor is dirty), the current settings target (80), something used by
  the active chat (55), something related to a current error (50), available
  setup (35), the current screen (30), pinned (25), recent (15). The winning
  reason becomes the row's context label.
- Pins are ignored while a query is typed, so typing always beats a pin.
- **Top hit.** Groups render in a fixed category order, so the best match could
  sit below weaker rows of an earlier category. The best-ranked row with a
  prefix match or better (score ≥ 200) whose visible title the query starts —
  or starts one of its words — leads in a "Top hit" group, unless it is already
  the first row. Alias and metadata matches still rank but never lead, and rows
  from late sources (messages, docs) never do, so the top row stays still.
- "Ask Professor Mari" is promoted above the hits when the query reads like a
  question, when the intent is explain, recommend or repair, or when nothing
  matched well — unless one result is a clear direct hit (score ≥ 250 with a
  navigate, action or create intent).
- That promotion is also the aside's trigger (section 12). It is read back from
  the ranked list, not recomputed, so the two can never disagree.

## 5. Actions

Typed actions (`OmnibarAction`) dispatch through `runResultAction`; results
without one fall through to the generic open path.

- `open-mari-chat`, `slash`, `goto-message`, `add-to-chat`, `detach-from-chat`,
  `refine-query`, `personal-extension`, `open-docs`, `open-faq`,
  `open-global-search` (the "See all results" row under message hits).
- A row with `chooseValue` applies that value and is checked before any other
  path. It exists so a choice option works wherever it was found.
- Direct active-chat actions: "add Eliza" with a chat open attaches instead of
  opening, but only when the result is unambiguous.
- Attaching a character or lorebook keeps the omnibar open, with the Undo
  toast, so the next one can be added. Other kinds close it: they can ask to
  replace the current persona, preset or connection, or open agent setup.
- Attach and detach reuse the drag-and-drop payload and its block rules, so the
  omnibar can never make an assignment a drop would refuse.
- Every navigation passes the dirty-editor confirmation.
- The Enter hint on a row names what `choose` will do for it — Add, Remove,
  Ask, Review, Choose, Create, Start, Insert, Jump to, Search, Run, Read, Edit or Open — from the row's
  action, not only its category. A row that adds a character never says Edit.
- The Ask-Mari row's title is the text it will send (`Ask Mari: “…”`); its line
  says what she will do with it.
- FAQ matches, and docs matches for a single word under five characters, need
  the query at a word start (`matchesAtWordStart`), so "eli" finds Eliza rather
  than every answer that says "reliable".
- Preview actions never repeat what Enter does on the row: no Edit character,
  Resume chat, Open documentation, Open or Set default preset, and no Add, Remove
  or Start chip when the row's Enter already adds, removes or starts. What stays:
  start chat, add to or remove from this chat, edit lorebook (Enter flips its
  toggle), Ask Mari, and continue with Mari — the last only for chats,
  characters, personas, lorebooks and presets, the things she can change.
- On a touch screen the first tap on a rich row expands it and a tap on the
  expanded row runs Enter; the expanded row shows its Enter hint at every width.

## 6. Cross-chat message search

The omnibar reuses the app's global chat search; it has no search of its own.

- Route: `GET /api/chat-insights/search` (`services/chat-insights/chat-insights.service.ts`),
  read through `useGlobalChatSearch`. The same search backs the Search All Chats
  modal, so both surfaces always agree.
- Quoted phrases stay together, other words must all appear, and matching is
  literal and case-insensitive. The server windows the snippet around the match
  and stops at a time budget on large libraries.
- `messageNumber` is the absolute position the goto-message jump takes.
- Professor Mari's chats are excluded by the search itself.
- The client only calls it at 3 characters or more, with no scope or with `msg:`,
  and shows the first few hits from other chats as rows.
- Choosing a hit in another chat opens that chat and then jumps: the goto request
  is keyed by chat id and survives the switch.
- The full list, with filters, is the **Search all chats** command, which opens
  the modal. **Activity overview** is a command too.

## 7. Keyboard and pointer

This is the part most likely to break silently. All of it must survive.

- Opening: `⌘K` / `Ctrl+K`; on the phone shell a long press on Home, or a
  pull down on the top bar (and the safe-area strip above it). The pull is
  touch only, locks after 10 px when it is at least 45° downward, and opens on
  release past 30% of the height (160-280 px) or on a flick (> 0.5 px/ms after
  40 px). Where the finger is at release picks the target: the left half opens
  the omnibar on search, the right half opens it in Mari's pane (the same door
  as Home's "Ask Professor Mari"), with a 28 px dead zone around the middle so
  the side cannot flicker; with Mari switched off the whole bar opens search.
  Pulling back under 85% of the threshold, a second finger or `pointercancel`
  cancels it. It never starts while a modal, a `Modal` overlay, the software
  keyboard or the omnibar itself is open, and a pull that starts on a bar
  button does not press it. Feedback (`OmnibarPullDrop`, painted once per
  frame from framer-motion values, no render per move) is a calm, symmetric
  sheet of the top bar's own surface (`--marinara-topbar-surface` over the app
  background, opaque at the bar, more see-through further down) pulled out of
  the bar's edge, ending in a circle with a small bar under it, both above the
  fingertip. The circle shows the magnifier or Mari's portrait from the active
  appearance pack; the small bar reads "Search" / "Ask Mari", and "Release to
  search" / "Release to ask Mari" once armed. At the threshold (one 8 ms
  vibration; 6 ms when the side changes) the sheet thins, lets go of the circle
  and draws back into the bar. On release the circle pops the dialog open
  (`takePullHandoff` hands over the panel, clipped to the circle before its
  first paint; the dialog skips its own pop-in) and the magnifier or portrait
  docks onto the search icon or Mari's header portrait, whose title fades in
  after it. The overlay is removed even if the dialog never mounts. The
  recognizer, the target choice and the sheet geometry are pure
  (`lib/pull-to-open.ts`) and pinned by the command-center regression. Under
  reduced motion there is no sheet: a label above the finger, and the target
  opens at the threshold.
- `↑`/`↓` move the selection; `Home`/`End` jump to the ends. No exceptions:
  there is no surface left that opts out of the keyboard model.
- `Enter` chooses. On a toggle row it flips the toggle; on a choice row it
  expands the row's options beneath it; on an option row it applies that value.
  `Shift+Enter` on a bound settings-control toggle row navigates to the
  control's spot in Settings instead of flipping it, the pre-K5 path.
- `⌘↵` / `Ctrl+↵` takes the selected result to Mari. Not offered for admin-only
  rows. Every Mari door follows one rule, `isMariInstruction`: typed text that
  asks for something is sent; typing only the row's name opens her with the
  draft. The footer hint says which ("Ask Mari" or "Continue with Mari"). There
  is no per-row Mari button: it put the expensive path on every free row.
- `→` expands a choice row's options, or a rich row's preview, in place. `←`
  collapses whichever is open, and otherwise returns focus to the input.
- **Expanded content is inserted below the focused row, never above it.** The
  focused row does not move, so `reconcileActiveResultId` stays valid and the
  two rules below cannot be violated by an expansion.
- `Tab` accepts the ghost completion when there is one; otherwise it cycles
  focus inside the dialog (the dialog traps focus).
- `Escape` collapses an expansion, then leaves a takeover, then closes.
- Native browser autocomplete is off on the input, because its popup steals the
  arrow keys.
- **Hover needs genuinely new screen coordinates.** Keyboard navigation scrolls
  the list under a resting cursor and the browser fires a mousemove for the row
  that slid beneath it; treating that as hover drags the selection back.
- **Arrow keys anchor on the highlight, not on DOM focus.** Hover moves the
  highlight without moving focus, so counting from the focused row would jump.
- The selection is pinned across re-renders by `reconcileActiveResultId`; the
  input's `onChange` must never null it.
- The active row is kept in view with `scrollIntoView({ block: "nearest" })`.

## 8. State and persistence

- Session state (`query`, `filter`, `pane`, `activeResultId`,
  `mariReturnResultId`, `mariHandoff`) survives a close and reopen. `pane` is the
  exception, and not because the normalizer rewrites it: the omnibar's unmount
  flush persists `results`, so the pane a session closed on is never restored
  (section 1 explains why the normalizer must leave a persisted `mari` alone).
  Every field here is read by something; a slot that is only ever written is a
  bug, not a feature (see section 11).
- Both expansions — the focused row's preview and a choice row's options — are
  component state, not session state. Every open starts from a bare list.
- Command ranking (recency and pins) is persisted separately.
- UI-store slots the omnibar reads: `activeEditorField`, `lastAppError`,
  `creationSession`, the open-detail ids per resource kind, the settings target.
  `activeEditorField` is set by the character editor (per tab) and the agent
  editor (on focus of the name, description or prompt template; the id is the
  `agent.update` field name). It feeds the "Improve {{field}} with Mari" row,
  which sits after the "Editing …" row so an unpinned handoff carries the
  editor's resource beside the field; Enter on the row opens Mari with both.

## 9. Accessibility

- The dialog is modal, labelled, and traps focus.
- A polite live region announces result counts, loading, and partial failure.
- Groups are sections with labelled headings.
- Every icon-only button has an accessible label.
- Motion respects `prefers-reduced-motion` throughout.

## 10. Performance constraints

- `preview` is always a thunk. Building preview data eagerly for every entity
  undoes the whole point.
- Row lookups are keyed by result id; a linear scan per rendered row showed up
  on large libraries.
- `chatControls` depends on the stable `mutateAsync` functions, not on the
  mutation objects, which are new every render.
- The bundle budget in `vite.config.ts` is a hard `this.error`, not a warning:
  500 kB per chunk, 1000 kB per entry. It measures `chunk.code` in memory, which
  is **not** the size printed in the build log — the same GameSurface chunk reads
  492 kB to the budget and 509 kB in the log. Debug budget failures with the
  budget's own numbers.
- The dialog's chunk is lazy, and `GlobalOmnibarHost` preloads it when the app
  is idle, so the first ⌘K does not wait on the network.
- Results that need a server round trip — message hits from other chats and
  docs — are the last groups, so a late answer never pushes down the row the
  arrow keys are on. Mari's own chats are fetched when the omnibar opens, not
  on the first keystroke, for the same reason.
- `OmnibarDetailPane`, `OmnibarMariPane` and `OmnibarAside` are lazy and mounted
  behind `Suspense`. So are Mari's Skills and Memories panels, which most
  sessions never open.

## 11. Deliberate non-features

Do not "fix" these; each was a decision.

- No "switch to game mode" action: game mode has a setup wizard and there is no
  safe one-call mode setter.
- The completion-action catalog never emits `show-field`. That branch is
  unreachable — do not re-add it.
- Image generation failures are not wired into error recovery: they are
  swallowed `catch {}` blocks with no single user-visible point.
- Message search does not rank by relevance, only by recency.
- **The omnibar does not roll dice.** It once did, and the branch was removed.
  The game input bar already has a Dices button with eight presets and a custom
  notation field, on the only screen where an omnibar roll was ever offered, and
  its roll queues onto your turn so the model sees the result — the omnibar's
  did not. Restoring it would also restore a dynamic-import rule, because a
  static import of the game stores from here breaks the bundle budget.

- **There is no return stack, and no persisted Mari destination.**
  `returnStack`, `mariDestination` and `mariDetailId` were persisted, capped and
  validated on read — and never read by anything. Escape steps back one level,
  and the Mari pane owns its own destination. `mariReturnPane` went with them: it
  could only ever hold `"results"`.
- **The pane union is declared once**, in `lib/command-center.ts`, next to the
  session state that persists it. `omnibar-result-view` re-exports it. Two
  hand-synced copies of the same union is how `browse` came to need deleting
  twice.
- **There is no Browse pane.** A grid of one category, in a takeover, with its
  own keyboard rules — it was the only surface that opted out of section 7. A
  bare scope prefix (`char:`) already lists a whole category as ordinary rows,
  with arrows, previews and Enter, and the app has real library screens for
  browsing by face. The idle-deck category chips now type the prefix instead of
  opening a grid, which also teaches the prefix by doing it. Compare and batch
  attach went with it: three deliberate steps to reach something the user could
  type.
- **The omnibar does not parse game commands.** `parseGameCommand` matched bare
  keywords — "map", "scene", "fight", "member", "setting" — with no verb and no
  intent check, so ordinary searches in a game chat were hijacked into a Mari
  handoff. The Ask-Mari row answers the same sentences without the false
  positives. This is the dice decision again, for the same reason.
- **A verb does not offer "kind" rows.** A bare "add" once listed "Add a
  character to this chat…", whose action typed `add character ` back into the
  input. A row whose action is more typing is not an answer; the add and removal
  suggestion builders already give the real rows.
- **There is no chat-to-world row.** It created an empty lorebook before Mari
  started, which stayed in the library whenever she failed or was stopped.
  Without that shell the row did exactly what the Ask-Mari row does, which
  already carries the open chat.
- **There is no scope-hint row.** The prefixes are taught by the category chips,
  which type one, and by the idle-deck subtitle. A row that teaches is a row
  that is not what the user came for.
- **There is no detail pane.** A preview expands under its own row instead. The
  pane hid the whole list on narrow screens to show one result. The wide-screen
  external panel is gone too; the inline expansion is the only preview.
- **There is no Quick pane.** The aside answers the cheap case without being
  asked, and the Ask-Mari row opens the takeover. Quick's one surviving job — a
  single-field rewrite from one model call — moved into Mari's takeover, where
  the proposal lands in the pending-change dock like every other change she
  makes. It remains one model call; applying or rejecting the proposal does not
  invoke the model again.
- **There is no floating Mari window.** What is left of it is a presence
  indicator that shows state and opens her. She cannot sit beside an open
  editor; she is a place you go.
- **Escape does not walk a pane stack.** There is one level to step back from.
- **Her sprite does not appear on messages.** Her pose in the header carries
  her state; the only other sprite is on the live line while she works and on
  the newest turn's "Worked for" line. Her transcript rows are labelled instead.
- **A prose rewrite is not painted red and green.** That reads as
  wrong-and-right, when it is a rewrite. Old text is struck and muted, new text
  is underlined on a light tint, so colour is never the only signal. Structural
  changes outside an applied edit keep diff colouring.

## 12. The aside

The cheap answer, `hooks/use-omnibar-aside.ts` and
`components/layout/omnibar/OmnibarAside.tsx`.

- It renders as the expansion of the promoted Ask-Mari row (R9), through the
  same `expanded` slot of `CommandCenterResultRow` the inline preview uses, and
  only while that row is selected. There is no bottom slot. The answer never
  appears above the selection, and nothing above the Ask row moves while it
  streams.

- Fires only when the Ask-Mari row is promoted — a question-shaped query, an
  `explain` / `recommend` / `repair` intent, or no direct hit at score ≥ 250 —
  and only after the input has been idle. One predicate, already tuned, read
  back from the ranked list rather than duplicated.
- The delay is a knob, not a constant. Default 3s. Too short spends a call on an
  ordinary typing pause; too long makes the feature feel absent. The omnibar
  settings view offers 1, 2, 3 or 5 seconds as "Wait before answering"
  (`omnibarAsideDelayMs`, `OMNIBAR_ASIDE_DELAY_CHOICES_MS`).
- **The unasked call is a different call, not a trimmed one.**
  `buildQuickContextPayload` assembles it from scratch: the surface, the typed
  query, and the focused resource's label. It must never carry persistent
  memories or the contents of the focused field, both of which an _asked_ Quick
  call does send. `quick-context-payload.test.ts` pins this.
- `source` and `resourceLabel` come from where the user really is —
  `GlobalOmnibar` reads the open editor or the active chat off `omnibarContext`
  — not a hard-coded `"command-center"`. With Download Agents open, the label
  is "Download Agents".
- Defaults to the local sidecar, so nothing is spent unasked. The answering
  model is chosen in the omnibar settings view (it replaces the list inside the omnibar card, with a back arrow): the local model or any language
  connection, with a note that a connection may cost money.
- It also makes no call when message hits (this chat or others) or lorebook
  entries match: those arrive after the Ask row was promoted, and when the
  library already answers, no model is asked.
- Without a downloaded local model (and no connection chosen) it makes no call.
  A dead end shows one quiet line instead, offering "Choose a model" and "Turn
  this off".
- Nothing is front-loaded into onboarding. The first answer says where it came
  from and offers to turn the feature off, in place.
- A repeat of the same connection + query within a few minutes is answered from
  a small in-memory cache (`lib/omnibar-aside-text.ts`) instead of asking the
  model again.
- The idle countdown is silent; once the call actually starts, a "Professor
  Mari is thinking…" line with the thinking sprite shows until the first token
  (or the cached answer) arrives.
- The answer is shown with light formatting — bold, lists, inline code —
  through the message renderer Mari's transcript uses (`renderMarkdownBlocks`
  with `renderCompactInline`, `lib/markdown.tsx`), and the prompt asks for only
  that much markdown and exact on-screen labels. Blank lines collapse. The
  screen-reader announcement uses the text with markdown stripped. An answer
  cut off by the token cap is marked with a trailing "…" by the server.
- A finished answer offers Copy and "Answer again"; Answer again asks the same
  question past the answer cache.
- One follow-up line under the answer ("Ask a follow-up…") sends a second quick
  call with the first question and answer as `previous`
  (`ProfessorMariQuickPromptRequest`); follow-ups are never cached. The earlier
  answer stays above it, muted, with the follow-up question. The next question
  typed there goes to full Mari instead. Escape in that line returns to the
  search input rather than closing the omnibar.
- A failed call shows one quiet line and the `shrug` sprite, with "Try again"
  and "Choose a model" actions. Never a toast — the user did not ask for this
  call — and the ranked list is never degraded by it.
- Escalating from the aside sends the question to Mari; it does not only open
  her with a draft. Enter or a click on the Ask row, and `⌘↵` when no real row
  is highlighted (the generic Ask-Mari row does not count as one), escalate a
  live answer (streaming or complete) straight into Mari. After a follow-up the
  whole exchange travels (`omnibarAsideHandoffAnswer`). The aside's query and answer travel
  along as `context.asideAnswer` (`ProfessorMariAskContext`), and the context
  chip on the sent message — which lists every facet the handoff carried
  (resource, chat, field, settings location, error, aside answer), not just
  one — shows it stayed attached (`professorMariContextFacets`,
  `MariContextFacetChips.tsx`).
- A finished answer offers up to three things it names — a setting, a
  character, a lorebook, a chat — as chips that open them like their rows
  (`findMentionedResults`). It is local matching on names of six characters or
  more, in the order the answer names them; the model is never asked for ids,
  and rows with an inline control are never offered.
- The unasked call is grounded in the same docs corpus `docs_search` uses:
  `searchCanonicalDocumentation` runs against the typed query and, if it finds
  matches, the top three excerpts (`formatDocumentationGroundingExcerpts`,
  documentation-tools.ts) are flattened to one capped line each and added to
  the prompt. A compact "tab: sections" list of every real Settings label
  (`quick-answer-settings-labels.ts`, sourced from the same
  `SETTINGS_TABS`/`SETTINGS_SECTIONS` registry `@marinara-engine/shared` and
  the omnibar both use) is always added, so the answer can name a real label
  instead of guessing one. Docs and setting labels only — never chat,
  character, or other user data — and small enough to stay a hint, not a RAG
  pipeline.
- A capability word in the typed query ("images", "music", "maps"...) is
  matched against a small shared keyword map
  (`matchOmnibarCapabilityAgentPackageIds`, `@marinara-engine/shared`) to up to
  3 official Agent package ids. The server grounds the unasked prompt with
  those entries' real catalog lines
  (`formatCapabilityAgentGroundingLines`, `official-agent-knowledge.ts`) —
  static catalog data only, never user content. The client runs the same
  shared matcher on the query it already has (no extra round trip) to decide
  whether to show a "Download Agents" chip beside the answer; clicking it
  opens Agents → Download Agents filtered to the first matched package.
