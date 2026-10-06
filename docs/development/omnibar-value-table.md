# Omnibar value table (slice 47, O1)

Question from the maintainer (2026-10-04): what does the omnibar add compared with no omnibar at all? It is
worth it only where it is faster or easier than the normal app. This file measures that on the running app.
It feeds slice 50 (O4, fix or remove). No application code was changed for it.

**Status after slice 50 (2026-10-04):** the table and step counts below are the historical pre-fix
measurement and are kept as-is rather than re-measured in place — re-walking all 15 tasks live needs the
same reviewer-on-the-real-app pass slice 47 used, which belongs to slice 51's fresh-eyes check, not a
code-only slice. What changed in slice 50: item 1 (harmful lorebook-disable bug), the goto-message bug in
item 2(a), the Ask-Mari-promotion bug in item 2(b) and the "wins that still have defects" entries for tasks
6/13, item 3 (Fix row retry choice), item 4 (omnibar closes after a chat-scoped choice; persona switcher's
"Ungrouped" folder removed), item 5 (new-chat wizard closes the phone Chats sheet), item 6 (reopening a chat
closes a pre-existing phone Chats sheet), item 7 (character/agent rows open on the first tap), item 8
(renamed "Peek prompt" to "Preview next prompt"), and the task 9 fresh-install docs-rows fix and the
`docs/development` index-exclusion fix. None of these fixes change a task's **step count** (the plan said not
to invest further once a gap was closed, e.g. item 1 is still 3 steps, not fewer than the Lorebooks-panel
icon) — they remove the bugs and extra steps the notes below describe, so the **Note** column for the
affected rows is now the pre-fix description of a fixed bug, not the current behavior. See `CHANGELOG.md`
and `docs/development/omnibar-feature-inventory.md` for what slice 50 actually shipped.

**Correction after slice 51's review (2026-10-04):** live re-testing found that slice 50's goto-message fix
(item 2a) and Ask-Mari-promotion fix (item 2b) did not hold on the running app — the cross-chat jump still
landed on the newest message (both the omnibar and Search All Chats), and Enter still asked Mari even once a
real hit outranked her (the selection did not follow the reorder). The task 9 fresh-install docs-rows fix also
did not hold: a question-phrased query still returned no docs rows. Slice 51 fixed all three (plus a new
slice-48 hazard where an empty Ctrl+K could preselect and silently flip a frecently-used setting), the
Fix row's connection choice leaving the omnibar open, two misleading settings-search keywords, "Clear search
history" missing half the usage store, the frecency boost being able to decide Mari's promotion, and the
phone persona switcher's "Ungrouped" folder. See `CHANGELOG.md` and
`docs/development/omnibar-feature-inventory.md` for what slice 51 actually shipped.

**Re-measured after round 9 (slice 65, 2026-10-06):** see
[Re-measure after round 9](#re-measure-after-round-9-slice-65) at the end of this file. It re-walks the 15
tasks on the current build and adds T18-T20 from round 9's strategy report. The original table below stays
as the historical baseline.

## How it was measured

- **Build.** `feat/omnibar-professor-mari` at `04ce44f41`, run with
  `PLAYWRIGHT_ONLY_PROJECT=desktop node e2e/start-servers.mjs` (client :5178, server :7971, throwaway
  `DATA_DIR` `.tmp/playwright-data/desktop`). Desktop is Chromium 1440×900. Phone is Chromium 390×844 with
  `isMobile`, `hasTouch` and CDP touch events (emulated, not a real device).
- **Data** (seeded through the API, `seed.mjs`): 5 characters, 2 personas (Wren, Kai), 5 chats with 8-30
  messages each (one message in "Nebula run" has the phrase "silver compass"), 2 lorebooks ("Nebula lore"
  with 12 entries, one of them "The Vesper Gate"; "Monastery codex" with 1 entry), 1 custom agent
  ("Scene Critic"), connections "Local Llama" and "Claude Sonnet" on a dead port, so a failed reply is real.
  A local OpenAI-compatible stub (`mock-llm.mjs`, port 7999) backs a third connection, "Mock Model". It is
  used only where a task needs a working model: the retry in task 8 and the quick answer in task 9.
- **Start state.** Every task except 1 starts inside a chat that was opened the normal way: Chats list →
  mode tab → chat. On desktop the Chats sidebar stays open (the app default). On the phone it closes. Task 1
  starts on a fresh load: Home with the Chats panel open (the app default at both widths).
- **One step** = one click or tap, one key press or shortcut (Ctrl+K, Enter, Esc), one typed query (any
  length), one scroll gesture, or one pull gesture. A desktop hover is not counted, but it is noted when a
  control appears only on hover. A step is counted only when the script really did it. When the first tap
  on a touch row only expanded it, the second tap is counted too.
- **Omnibar door.** Desktop: Ctrl+K. Phone: the pull-down on the left half of the top bar. On the right
  half, the same pull opens Professor Mari instead of search. On a desktop "with" path, Enter is used when
  the wanted row is preselected. Otherwise the wanted row is clicked, and the note says what Enter would do.
- **"Know where it lives" (KW).** _Visible_: a labeled control on the current screen. _Icon_: on screen, but
  only as an icon or only on hover. _Buried_: the user must open a panel, menu, tab or section, or scroll,
  and must already know that place. The omnibar has its own KW cost for every task: chats show no visible
  door. Only Home has one (the "Search everything (Ctrl/⌘+K)" pill), and the phone door is a gesture.
- **Clear win** (the plan's bar): the omnibar path has at least 2 fewer steps, or it removes a _Buried_
  requirement. Anything else is "not clearly faster".
- **Evidence.** Each step has a screenshot in `.tmp/omnibar-ux/round6/slice-47/`, named
  `t<NN>-<path>-<width>-<step>-<action>.png`. Path is `without`, `with`, or a named variant such as
  `without-browse`. Example: `t05-without-browse-390-04-scroll-settings-to-atmosphere-scroll-1-.png`. The
  raw step lists are in `rec/t<NN>-<path>-<width>.json`. The driver scripts are `t01.mjs`…`t15.mjs`.

## The table

Steps are given as **1440 / 390**.

| #   | Task                                              | Steps without                                                                                                                                                                                  | Steps with                                                                                                                                                                                                   | Winner                             | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reopen last chat                                  | **2 / 2**: close Chats panel → Home "Recent chats" card (or: RP tab → chat). KW: Visible                                                                                                       | **2 / 3**: Ctrl+K → Enter. Phone: pull → tap row → close the Chats sheet                                                                                                                                     | Without (tie on desktop)           | The empty omnibar preselects the last chat, so desktop Ctrl+K, Enter works. On the phone, the chat opens **under the Chats sheet**, which was open before the pull. The user sees the list, not the chat, and must close the sheet (`t01-with-390-02/03`). The default CONVO tab hides roleplay chats from the list, but Home shows the recent ones.                                                                                                                                                                            |
| 2   | Find a message in another chat ("silver compass") | **3 / 4**: (phone: Chats tab →) "Search all chats" icon → type → hit. KW: Icon (desktop), Buried (phone)                                                                                       | **3 / 3**: Ctrl+K → type → click the message row                                                                                                                                                             | Tie on desktop; phone 1 step fewer | **Enter does not open the hit.** "Ask Mari: “silver compass”" is preselected below the exact message hit, so Enter hands the phrase to Mari; the keyboard path is 4 steps (`t02-with-1440-02`). **Both paths miss the message:** the chat opens at its newest message, and the hit (message 15) stays about 1500 px above (`t02-with-1440-03`, `t02-without-1440-04`). The jump works inside the open chat, but not across chats.                                                                                               |
| 3   | Change the model in this chat                     | **2 / 2**: composer link icon (phone: Quick Switcher) → "Claude Sonnet". KW: Icon                                                                                                              | **3 / 3**: Ctrl+K → "claude" → Enter                                                                                                                                                                         | Without                            | The "Model for this chat" choice row is preselected and works. After the choice, the **omnibar stays open** with no feedback in the chat. Esc is needed to type again (`t03-with-1440-03`).                                                                                                                                                                                                                                                                                                                                     |
| 4   | Attach a lorebook ("Monastery codex")             | **2 / 3**: Lorebooks icon → "add to active chat" icon on the row (desktop: on hover only). Chat Settings path: **5 / 6** (Lorebooks section → scroll → Add Lorebook → pick). KW: Icon / Buried | **3 / 3**, but only with the verb: Ctrl+K → "add monastery" → Enter                                                                                                                                          | Without (cheapest path)            | **Harmful trap:** typing only the name ("monastery") and pressing Enter flips the lorebook's **global Enabled switch off**. It does not attach it (`t04-with-plain-1440-02/03`, API: `enabled:false`), and no Undo toast is visible. On the phone, the first tap on the row toggles it off and the second tap toggles it back on. At 390 the row title is cut to "Monaste…" and the meta text overlaps it (`t04-with-plain-390-03`).                                                                                            |
| 5   | Flip a deep setting ("Dynamic weather effects")   | **5 / 6** with the Settings search: Settings → search field → "weather" → result → switch. Browsing: **7 / 8** (Settings → Appearance → 4 scrolls → switch). KW: Buried                        | **3 / 3**: Ctrl+K → "weather" → Enter (flips in place)                                                                                                                                                       | **Omnibar** (clear)                | 2-5 steps fewer, and the user does not need to know Appearance → Atmosphere. The Settings panel's own search finds the control but only navigates to it, so one more click is needed.                                                                                                                                                                                                                                                                                                                                           |
| 6   | Find a lorebook entry ("The Vesper Gate")         | **6 / 7**: Lorebooks → "Nebula lore" → section dropdown → Entries → scroll → expand the entry. KW: Buried (must know which lorebook holds it)                                                  | **3 / 3**: Ctrl+K → "vesper" → click the entry row                                                                                                                                                           | **Omnibar** (clear)                | It opens the right lorebook on Entries with the entry expanded. **Enter would ask Mari:** "Ask Mari: “vesper”" is preselected under the single entry hit (`t06-with-1440-02`).                                                                                                                                                                                                                                                                                                                                                  |
| 7   | Start a new roleplay                              | **1 / 3**: "New Roleplay" (+) in the Chats sidebar. Phone: Home → "Start a new roleplay" → close the Chats sheet. KW: Visible                                                                  | **3 / 4**: Ctrl+K → "new roleplay" → Enter. Phone: + close the Chats sheet                                                                                                                                   | Without                            | Both paths open the same wizard (N2 holds). **Phone bug in both paths:** the wizard opens under the Chats sheet, so the user sees a new "New Roleplay" chat in the list, not the wizard (`t07-without-390-03`, `t07-with-390-03`, `t07-probe-390-01/02`). The +1 sheet step is counted for both. The scripts measured 2 and 3 taps; the extra close tap comes from the probe, which shows the wizard only after the sheet is closed. Both paths create the chat before the wizard is complete.                                  |
| 8   | Fix a failed reply (real failure: dead port)      | Switch and retry: **3 / 3** (composer link icon → "Mock Model" → Retry on the "Failed · Retry" line). Open the broken connection: **2 / 3** (Connections → "Local Llama"). KW: Icon            | Switch and retry: **5 / 6** (Ctrl+K → "mock" → Enter → Esc → Retry; phone also needs the second tap). The Fix row: **2 / 3** (Ctrl+K → Enter on "Fix: Generate reply failed" opens the "Local Llama" editor) | Without                            | The "Fix" row is first and preselected, which is good. But Enter only opens the connection editor; it cannot switch the model or retry. After a model choice the omnibar stays open, so Esc is needed before Retry. The "Failed · Retry" line (N1) is the real fast path here.                                                                                                                                                                                                                                                  |
| 9   | Ask how X works ("how do lorebooks work?")        | Lorebooks panel "?" help: **2 / 3** (it covers only that panel's topic). Docs: **5 / 6** (Home → (phone: bookmarks →) Documentation → search → type → hit). KW: Buried                         | **2 / 2**: Ctrl+K → type. The answer appears in the Ask row                                                                                                                                                  | **Omnibar**, _conditional_         | This works only when the aside has a model; here it was pointed at the local stub. With the fresh-install default (local sidecar, not downloaded), the row says "Professor Mari can answer searches like this once she has a model". **For this question phrasing, no docs rows are shown at all** (`t09-with-default-aside-1440-03-after-wait.png`, `t09-with-1440-03`). So a fresh install gets no answer and no docs from the omnibar.                                                                                       |
| 10  | Open a character ("Juniper Ashgrove", 5 cards)    | **2 / 3**: Characters icon (phone: More → Characters) → card. KW: Visible                                                                                                                      | **3 / 4**: Ctrl+K → "juniper" → Enter. Phone: the first tap only expands the row                                                                                                                             | Without                            | With a small library the panel is faster. A large library would need scrolling or the panel search, which was not measured here. On the phone, the two-tap rule for rich rows costs a step.                                                                                                                                                                                                                                                                                                                                     |
| 11  | Change persona to "Kai"                           | **3 / 4**: composer "?" avatar (phone: Quick Switcher → Personas tab) → "Ungrouped (2)" folder → Kai. KW: Icon (the "no persona" avatar is a "?" that looks like Help)                         | **3 / 3**: Ctrl+K → "kai" → Enter                                                                                                                                                                            | Tie on desktop; phone 1 step fewer | The omnibar stays open after the choice (`t11-with-1440-03`). Both paths post a "You are now playing as Kai." notice into the chat. The switcher hides personas in a default "Ungrouped" folder, which costs one tap.                                                                                                                                                                                                                                                                                                           |
| 12  | Peek prompt                                       | **1 / 2**: Peek icon on the last reply (desktop: on hover; phone: tap the reply first). KW: Icon (a magnifier, easy to read as "search")                                                       | **2 / 2**: Ctrl+K → "Peek prompt" row (in the empty list, no typing)                                                                                                                                         | Without                            | **The two doors open different prompts.** The message icon shows the _exact saved_ prompt for that turn. For messages that were not generated in the app, it only shows the toast "No exact saved prompt is available for this turn" (`t12-without-seeded-1440-01-peek-icon-toast.png`). The omnibar row shows a _live preview_ of the next prompt. Without the omnibar, the only other door to the live preview is the hidden `{{prompt}}` composer macro. Measured in "Clinic rounds", whose last reply was really generated. |
| 13  | Search docs ("openrouter")                        | **5 / 6**: Home → (phone: Open bookmarks →) Documentation → search → type → "Supported AI Providers". KW: Buried                                                                               | **3 / 4**: Ctrl+K → "openrouter" → click the docs row. Phone: the first tap only expands it                                                                                                                  | **Omnibar** (clear)                | **Enter would ask Mari:** "Ask Mari: “openrouter”" is promoted above the 7 docs rows and preselected (`t13-with-1440-02`). Both the omnibar and the docs viewer list **internal developer docs** next to user docs, for example "Omnibar UX plan (working file)", "Omnibar feature inventory" and "Hierarchical Maps and Spatial…" (`t03-with-1440-03`, `t09-without-docs-1440-05`).                                                                                                                                            |
| 14  | Switch theme Dark → Light                         | **5 / 6**: Settings (phone: More → Settings) → Appearance → scroll → Dark/Light dropdown → Light. KW: Buried                                                                                   | **3 / 3**: Ctrl+K → "light" → Enter                                                                                                                                                                          | **Omnibar** (clear)                | It works in place.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 15  | Open an agent's settings ("Scene Critic")         | **2 / 3**: Agents icon (phone: More → Agents) → row. KW: Visible                                                                                                                               | **3 / 4**: Ctrl+K → "scene critic" → Enter. Phone: the first tap only expands the row                                                                                                                        | Without                            | The seeded instance has no downloaded agents, so the Agents panel shows only this one. With many installed agents the panel would need scrolling, which was not measured.                                                                                                                                                                                                                                                                                                                                                       |

## Headline

- **Clear omnibar wins: 5 of 15.** Task 5 (deep setting), task 6 (lorebook entry), task 13 (docs), task 14
  (theme), and task 9 (how X works). Task 9 counts only when the aside has a model; on a fresh install it
  gives no answer.
- **Not clearly faster: 10 of 15.** Tasks 1, 2, 3, 4, 7, 8, 10, 11, 12 and 15. In 6 of them (3, 4 by the
  cheapest path, 7, 8, 10, 15) the omnibar takes **more** steps than the normal UI. In the other 4 (1, 2, 11
  and 12) it ties on at least one width.
- The pattern: the omnibar wins where the target is _buried_: a setting, an entry inside a lorebook, a doc.
  It loses where the app already has a visible one- or two-click control: composer switchers, sidebar "+",
  panel icons, Home recent chats. There, the omnibar's fixed cost (open + type + choose = 3) is higher.
- Four cross-cutting problems cost steps or trust in several tasks:
  1. Enter goes to Mari instead of the only real hit (tasks 2, 6, 13).
  2. On the phone, the first tap on a rich row only expands it (tasks 4, 8, 10, 13, 15).
  3. The omnibar stays open after a model or persona choice (tasks 3, 8, 11).
  4. On the phone, the Chats sheet stays over the result (tasks 1, 7; task 7 also without the omnibar).

## Not clearly faster: items for slice 50 (O4)

Removal beats a new feature (O4). Each item names the measured gap and one concrete change.

1. **Task 4: attach a lorebook (harmful).** The plain name + Enter turns the lorebook off app-wide, with no
   visible Undo. _Fix:_ when a chat is open, Enter on a lorebook row that is not attached to it should
   attach (the same unambiguous rule as "add Eliza"). Move the global Enabled switch off Enter: keep it as
   the visible switch, or put it behind an explicit "Disable lorebook" row. A phone tap must never flip it.
   Also fix the cut-off title at 390. Afterwards it is 3 steps with the plain name. It is still not 2 fewer
   than the Lorebooks-panel icon, so do not promote it further.
2. **Task 2: find a message in another chat.** _Fix (both are bugs):_ (a) the cross-chat goto must land on
   the hit, not on the newest message; this affects the Search All Chats modal too. (b) When the query has
   an exact phrase hit in messages, do not promote "Ask Mari" above it or preselect it. Enter should jump.
   After both fixes it ties on desktop and is 1 step faster on the phone, and it saves the user from
   knowing the "Search all chats" icon. Keep it, but it is not a step win.
3. **Task 8: fix a failed reply.** The Fix row only opens the connection editor. _Fix:_ make Enter on
   "Fix: Generate reply failed" open a small choice. List the chat's other connections as choice rows,
   then retry at once; the failed message is known from `lastAppError`. That makes it Ctrl+K → Enter →
   pick = 3 steps, equal to the switcher plus Retry. If that is too much, remove nothing, but do not count
   it as value: the "Failed · Retry" line (N1) is the fast path.
4. **Tasks 3 and 11: change model or persona.** The omnibar is 1 step slower or equal. _Fix:_ close the
   omnibar after a choice row for the active chat runs (model, preset, persona), and show the existing
   confirmation toast. Today the user needs Esc, which is one hidden step. Do not invest more. These rows
   help keyboard users and cost nothing, so keep them, but they are not a selling point. Not omnibar work,
   but measured here: in the persona switcher, list personas without the "Ungrouped" folder.
5. **Task 7: start a new roleplay.** It is 2 steps slower than the sidebar "+" on desktop and 1 step slower
   on the phone. _Recommendation:_ keep the N2 commands for discoverability by typing, with no more
   investment. _Bug (both paths, not omnibar-specific):_ on the phone, close the Chats sheet when the
   new-chat wizard opens.
6. **Task 1: reopen last chat.** It ties on desktop and is 1 step slower on the phone. _Fix:_ when a chat
   row is chosen on the phone, close the Chats sheet if it is open. F3 handled the sheet opening
   afterwards, but not a sheet that was already open. After that it ties at both widths. No further work.
7. **Tasks 10 and 15: open a character or an agent.** With small libraries the panel icon is 1 step faster.
   _Fix:_ on touch, open entity rows on the first tap, as chat and message rows already do (F4, slice 41).
   The row expansion adds a step and nothing that the user needed. That fix also helps tasks 4, 8 and 13.
   Then it ties on the phone. On desktop the gap stays at 1 step for small libraries. The value only shows
   with large libraries; measure that case before investing more.
8. **Task 12: peek prompt.** It is 1 step slower than the hover icon and opens a different thing.
   _Recommendation:_ keep the row, but rename it so that it says what it does, for example "Preview next
   prompt". It is the only door to the live preview that does not need the hidden `{{prompt}}` macro. Not
   a step win.

### Wins that still have defects (also for slice 50)

- **Tasks 6 and 13:** Enter asks Mari instead of opening the single entry or docs hit. The fix is the same
  as in item 2: do not promote "Ask Mari" over a direct hit from late sources such as entries, docs and
  messages. That makes these wins reachable by keyboard.
- **Task 9 (conditional):** on a fresh install the omnibar answers nothing. The aside has no model, and a
  question-phrased query shows no docs rows. _Fix:_ always show the matching docs rows, from the important
  words in the question, under the Ask row. Then the deterministic answer works without a model.
- **Tasks 3, 9 and 13: the docs index includes `docs/development/*`.** Internal plans and inventories
  appear as user docs in the omnibar and in the docs viewer. That includes this file once it is committed.
  _Fix:_ exclude `docs/development/` from the user docs index (server docs search), or mark those files
  internal.

## Not verified

- Real phones: touch was emulated in Chromium. The iOS top edge, the soft keyboard and real gesture timing
  were not tested. A typed query counts as one step at both widths, but on a phone it means opening the
  keyboard and typing, which is slower than one tap.
- Large libraries (hundreds of characters, agents or lorebooks): every panel path here had its target
  visible without searching. Those cases favor the omnibar and were not measured.
- Quick-answer quality: the answer in task 9 came from a stub. Only the flow was judged.
- Light theme and other visual themes: everything was measured in the default dark theme.

## Re-measure after round 9 (slice 65)

Round 9 (slices 60-62g, 62f) added the reply checkup and Mari's `chat.diagnose`, and slice 65 cut two things
(below). This section re-walks the 15 tasks after eight rounds of changes and measures the new tasks T18-T20
from `.tmp/omnibar-ux/strategy-report-2.md` §7. T16 and T17 (connection setup) are not measured: R4/R5 were
dropped because the maintainer is redesigning connection setup.

### How it was measured

- **Build.** `feat/omnibar-professor-mari` at `c4e535878` (slice 65's cuts plus the chat-tool fix below, on
  top of the 2026-10-06 staging merge), run with `scripts/dev.mjs` on client :5288 / server :8081 and a
  throwaway `DATA_DIR` under `.tmp/omnibar-ux/round9/slice-65/measurements/data`. Same widths, same emulated
  touch, same step rules, same "clear win" bar as above.
- **Data.** The same `seed.mjs` as slice 47 (5 characters, 2 personas, 5 chats, 2 lorebooks, 1 custom agent,
  two dead-port connections), plus a working "Mock Model" connection on a local stub (port 8099).
  `seed2.mjs` adds the round-9 cases, and each case's last reply is **generated for real** through
  `POST /api/generate` against the stub, so the server computes the context fit, the lorebook scan and the
  card share itself (no hand-written `generationInfo`):
  - T18 "Long voyage": 80 messages + 1 generated reply on "Mock 4k" (Max Context Window 4,096) with an
    always-on 18-entry lorebook. The server dropped 60 history messages (7,587 tokens needed, budget 3,468)
    and cut the reply limit from 4,096 to 128.
  - T19 "Harbor intrigue": "Harbor secrets" has a 300-token budget; the last message matches four entries.
    The server skipped "The night bell" and "The Saltmarsh Pact" (297 of 300 tokens used).
  - T20 "The drowned library": Odile's card is about 3,760 tokens on "Mock 6k". The server dropped 6 messages,
    cut the reply limit to 1,713, and the checkup measures the card at 96% of the prompt budget.
- **Professor Mari.** No real model. The stub plays Mari's workspace protocol from a script: on a new
  question it calls `chat.diagnose` for `activeChat` from her context, then answers by quoting the **first**
  finding the real server returned; on "shorten the card" it proposes `character.update` (applied, with the
  Keep/Restore review). This proves the plumbing (the right chat, the right numbers reach her, the review
  works); it does not measure a real model's judgment.
- **"Without" for T18-T20** means without the round-9 doors (quiet line, checkup, Peek header,
  `chat.diagnose`): only what the app showed before round 9 (Peek prompt, Active Context, editors).
- **Evidence.** Screenshots and drivers in `.tmp/omnibar-ux/round9/slice-65/measurements/`
  (`t<NN>-<path>-<width>-<step>-<action>.png`, raw step lists in `rec/`, all runs in `summary.txt`).
  Slice 65's cut proofs: `cuts-row-dumps.txt`, `before-empty-*`/`after-empty-*`,
  `before-askmari-*`/`after-askmari-*`.

### Slice 65 cuts

- **The empty list no longer shows the chat's own model, preset and persona.** In a chat, the empty omnibar
  listed the chat's connection, preset and persona rows (Enter opened their editors) before the chat tools,
  and they pushed "Regenerate reply" out of the 8-row context group. They repeat the composer's switchers,
  which win (tasks 3 and 11). They are gone from the empty list only; typing "claude", "kai", "model",
  "preset" or "persona" still finds "Model / Preset / Persona for this chat". A Fix row that reuses the
  chat's connection id stays.
- **No model, no promoted "Ask Mari".** With no language connection and no downloaded local model, a
  question such as "how do lorebooks work?" put "Ask Mari" first and selected, above six docs rows, where
  Enter led to a Mari who cannot answer. Now the docs and FAQ rows lead and Ask Mari is last; on a real dead
  end (no docs, no FAQ, nothing else) her row is still promoted, because it carries the "Choose a model"
  setup hint.

### The 15 tasks, re-measured

Steps are given as **1440 / 390**. "Was" is the slice 47 count.

| #   | Task                                              | Steps without                                                                                                   | Steps with                                                                                                                         | Winner                                   | Note                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reopen last chat                                  | **2 / 2** (was 2 / 2)                                                                                           | **2 / 2** (was 2 / 3)                                                                                                              | Tie                                      | The phone no longer needs the extra Chats-sheet close (slice 50). Not a step win.                                                                                                                                                                                                                                       |
| 2   | Find a message in another chat ("silver compass") | **3 / 4** (was 3 / 4)                                                                                           | **3 / 3** (was 3 / 3)                                                                                                              | Tie on desktop; phone 1 step fewer       | Both paths now land on the hit, and the message row is preselected, so Enter opens it (slice 51). Not a step win.                                                                                                                                                                                                       |
| 3   | Change the model in this chat                     | **2 / 2** (was 2 / 2)                                                                                           | **3 / 3** (was 3 / 3)                                                                                                              | Without                                  | The omnibar now closes after the choice with a "Model for this chat: Claude Sonnet" toast; no Esc. Slice 65 removed the chat's connection row from the empty list, so the omnibar no longer advertises a slower door; typing "claude" still preselects "Model for this chat". The composer switcher is the cleaner win. |
| 4   | Attach a lorebook ("Monastery codex")             | Panel icon **2 / 3**; Chat Settings **4 / 5** (was 5 / 6)                                                       | **3 / 3** with the plain name or "add monastery" (was: plain name disabled the lorebook)                                           | Without (cheapest path)                  | The plain name + Enter now attaches it and leaves the lorebook enabled. The Chat Settings path lost one step.                                                                                                                                                                                                           |
| 5   | Flip a deep setting ("Dynamic weather effects")   | Settings search **5 / 6**; browsing **9 / 11** (was 7 / 8)                                                      | **3 / 3**                                                                                                                          | **Omnibar** (clear)                      | Unchanged win. Browsing to Atmosphere now takes six or seven scrolls because the Appearance tab grew.                                                                                                                                                                                                                   |
| 6   | Find a lorebook entry ("The Vesper Gate")         | **6 / 7**                                                                                                       | **3 / 3**                                                                                                                          | **Omnibar** (clear)                      | The entry row is now preselected, so Enter opens it (was: Enter asked Mari).                                                                                                                                                                                                                                            |
| 7   | Start a new roleplay                              | **1 / 2** (was 1 / 3)                                                                                           | **3 / 3** (was 3 / 4)                                                                                                              | Without                                  | Both paths open the wizard in front; the phone Chats-sheet bug is gone.                                                                                                                                                                                                                                                 |
| 8   | Fix a failed reply (real failure: dead port)      | Switch and retry **3 / 4** (was 3 / 3: the phone Quick Switcher now stays open on the model list, one more tap) | Fix row "Retry with": **3 / 3** (Ctrl+K → Enter → pick "Mock Model"; it retries at once and closes). Switch row + Retry: **4 / 4** | Tie on desktop; phone 1 step fewer       | Slice 50's "Retry with" choice on the Fix row works and closes the omnibar. Still not a step win; the "Failed · Retry" line remains the fast path when the connection itself is fine.                                                                                                                                   |
| 9   | Ask how X works ("how do lorebooks work?")        | Lorebooks "?" **2 / 3**; Docs **5 / 6**                                                                         | With a model: **2 / 2**. Fresh install: **3 / 3** (Ctrl+K → type → open "Lorebooks Overview")                                      | **Omnibar**, now also on a fresh install | Slice 65: with no model the docs rows lead instead of "Ask Mari". Defect left for review: the server docs search ranks "World Maps" first and "Lorebooks Overview" fifth for this question, so Enter on a fresh install opens the wrong article.                                                                        |
| 10  | Open a character ("Juniper Ashgrove", 5 cards)    | **2 / 3**                                                                                                       | **3 / 3** (was 3 / 4)                                                                                                              | Without (tie on the phone)               | Entity rows open on the first tap now.                                                                                                                                                                                                                                                                                  |
| 11  | Change persona to "Kai"                           | **2 / 3** (was 3 / 4: the "Ungrouped" folder is gone)                                                           | **3 / 3**                                                                                                                          | Without (tie on the phone)               | The switcher got one step faster, so the omnibar lost its old tie/phone win. "Persona for this chat" is preselected after typing and closes the omnibar. Slice 65 removed the chat's persona row from the empty list.                                                                                                   |
| 12  | Peek prompt                                       | **1 / 2**                                                                                                       | No door for a healthy reply. Typing "peek" lists the Peek Prompt doc. With a checkup finding: Fix row → Check → Peek, **3 / 3**    | Without                                  | By design: slice 61 deleted the separate "Preview next prompt" row and folded Peek into the reply checkup.                                                                                                                                                                                                              |
| 13  | Search docs ("openrouter")                        | **5 / 6**                                                                                                       | **3 / 4**                                                                                                                          | **Omnibar** (clear)                      | Defect left for review: the preselected first row is the FAQ "Can I use Google Cloud's free credit with Marinara?" (its answer mentions OpenRouter), so Enter opens that instead of "Supported AI Providers". The phone still needs a second tap on docs rows.                                                          |
| 14  | Switch theme Dark → Light                         | **5 / 6**                                                                                                       | **3 / 3**                                                                                                                          | **Omnibar** (clear)                      | Unchanged.                                                                                                                                                                                                                                                                                                              |
| 15  | Open an agent's settings ("Scene Critic")         | **2 / 3**                                                                                                       | **3 / 3** (was 3 / 4)                                                                                                              | Without (tie on the phone)               | Entity rows open on the first tap now.                                                                                                                                                                                                                                                                                  |

**Win count: still 5 of 15** (tasks 5, 6, 9, 13, 14), as the strategy report expected. Task 9 now also wins
on a fresh install. No task regressed to a loss; task 11 lost its phone win because the normal switcher got
faster, which is the right direction. Tasks 3 and 11 stay "Without": the composer switchers are the cleaner
path and the empty list no longer competes with them.

### T18-T20: the round-9 tasks

"Cause" is counted until the right cause **with its number** is on screen. "Fix" is counted until the change
is saved.

| #   | Task                                        | Steps without (pre-round-9 UI)                                                                                                                                                                                                                                                                                                                                                                                                       | Steps with (round 9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Winner                                        | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T18 | Replies got worse at message 80             | **Cause: not named in 10 minutes.** Peek prompt (**1 / 2**) shows "23 sections · ~3,314 tokens" and "Max Output Tokens 128", but nothing says that 60 messages were dropped or why. Naming it needs counting sections against the 81 messages and knowing that Max Context Window minus the reply limit is the input budget. Fix (raise Max Context Window): Connections → editor → scroll → field → Save, **6 / 8**, once you know. | **Cause: 0 / 0** (the quiet line "60 older messages not sent · Check" is under the reply on arrival); the numbers ("Needed 7,587 tokens, budget 3,468") after **1 / 1** (Check) or **2 / 2** (Ctrl+K → Enter on "Fix: Check the last reply"). Mari: **3 / 3** (Ctrl+J or pull right → type → Enter) and she names "60 older messages were not sent: the prompt needed 7587 tokens, the budget was 3468". **Fix: 6 / 8** (Check → "Max context window" → scroll → field → type → Save; the phone needs two scrolls and a second Save tap). | **Round 9** (cause), fix unchanged            | Target met for the cause (≤ 3) at both widths; the fix target (≤ 6) is met on desktop and missed by 2 on the phone. Correct: the line, the checkup and `chat.diagnose` all name the real numbers the server recorded. After saving 16,384 and regenerating, the reply is no longer trimmed. The 2 extra phone steps are the connection editor (the link opens it at the top, not at the field; the first Save tap only commits the field and the button moves), which is out of scope while connection setup is being redesigned. Found and fixed here: every Mari send from a chat with a checkup finding failed with "The selected chat is no longer available", and the typed text vanished with no error line (`c4e535878`; see the review list below for the silent failure). |
| T19 | Entry X does not fire because of the budget | **Cause: 4 / 4** (Chat Settings → scroll → Active Context → open the amber "2 matching lore entries were skipped by token budget" notice, which names both entries and "blocked by lorebook budget"; since #814, May 2026). The round-2 omnibar row "Active lorebook entries" does it in **3 / 3**. Fix: Lorebooks → Harbor secrets → scroll → Token Budget → type → Save, **6 / 8**.                                                | **Cause: 1 / 2** (Peek prompt on the reply; the header says "2 lorebook entries matched but did not fit the token budget: The night bell, The Saltmarsh Pact" with a "Lorebook budget" link). No quiet line and no Fix row: lore skips are not reply-line findings. Mari (scripted `chat.diagnose`): **3 / 3**, names the same entries. **Fix: 6 / 8** (Peek → "Lorebook budget" → scroll → Token Budget → type → Save).                                                                                                                  | Round 9 for the cause (by 2-3 steps); fix tie | The checkup names the right entries and the budget, but not the numbers (300 budget, 297 used); the old notice shows those. After raising the budget to 1,000 and regenerating, nothing is skipped. **Correctness risk for Mari:** her prompt routes "why didn't X fire" to `lorebook.testScan`, not `chat.diagnose`, and the scan ignores budgets: on this seed it reports "The Saltmarsh Pact" as **activated**. A real model following its prompt is likely to name the wrong cause. The "Lorebook budget" link opens the editor at the top, not at Token Budget.                                                                                                                                                                                                               |
| T20 | Card too large for the context              | **Cause: not stated.** The Characters panel shows "Odile the Archivist · ~3,769 tokens" (**2 / 3**, one scroll) next to ~25-token cards, but nothing relates it to the 6k context. Shorter card by hand: editor → Card tab → description → rewrite → Save, with no review.                                                                                                                                                           | **Cause: 1 / 1** (the quiet line says "6 older messages not sent"; Check lists "Large character card · About 3,761 tokens, 96% of the budget · Edit the card" as the **third** row). The Fix row names only the trim. Mari (scripted, quoting the first finding): names the 6 dropped messages, **not** the card. **Reviewed shorter card: 5 / 5** (Ctrl+J or pull right → "shorten Odile's card" → Enter → open "Changed 1 thing" → Keep); the description went from 14,990 to 140 characters, applied in 3 and confirmed with Keep.     | Round 9 (a reviewed fix no button offers)     | Correct number (3,761 tokens, 96% of 3,931), but the **ranking is wrong for this case**: the card is the root cause and the trim is its symptom, yet the line, the Fix row and the first `chat.diagnose` finding all lead with the trim. A real Mari told to "name exactly one cause" may pick the first finding. "Edit the card" opens the editor on Metadata, not on the description. The run's "GOAL No request phrase reported" line is placeholder text shown to the user (seen with the scripted model).                                                                                                                                                                                                                                                                     |

### Headline

- **The old 15: still 5 clear wins** (5, 6, 9, 13, 14). The cuts did not cost a win; they removed rows that
  only competed with the composer.
- **T18 is the clear round-9 win:** before, the cause was invisible in the UI; now it is on screen on arrival
  with the right numbers, and Mari names it in 3 steps. The fix stays 6 / 8 because it lives in the
  connection editor.
- **T19 is a modest win** (cause 1-2 steps instead of 3-4, because the old Active Context notice already
  listed budget skips). Mari's own "why didn't X fire" path can name the wrong cause.
- **T20 is a win for the fix** (a reviewed shorter card in 5 steps; no button does that), but the checkup
  ranks the symptom above the cause.

### For the slice 65 review and fix phase

Found while measuring; not fixed in this phase unless noted.

1. **Fixed here (`c4e535878`):** Mari sends from any chat with a reply-checkup finding failed: the "Fix: Check
   the last reply" row's id (`chat-tool:reply-checkup:<chatId>`) reached the server as chat id
   `reply-checkup:<chatId>`. Regression assert added.
2. **Silent send failure:** when that send failed, the user's message disappeared, the composer cleared, and no
   red "failed · Retry" line appeared (console only).
3. **T20 ranking:** when `card_large` holds, it is the cause of `history_trimmed`/`reply_budget_cut`; the
   line, the Fix row and `chat.diagnose` should lead with the card (or Mari's prompt should say so).
4. **T19 Mari routing:** "why didn't X fire" goes to `lorebook.testScan`, which reports budget-skipped entries
   as activated. Either add the budget result to the scan or route this question through `chat.diagnose` too.
5. **Arrival block after the first send:** on the first send into a brand-new Mari thread, a second arrival
   block is appended under her answer and the view scrolls to it, hiding the answer (1440, scripted model).
6. **Mari on the chat's connection:** in one run a fresh Mari thread opened from "Long voyage" was created on
   that chat's 4k connection instead of the default; her prompt was truncated and she failed the protocol.
   Not reproduced cleanly; the drivers pinned Mari's connection afterwards. Verify.
7. **Docs ranking (task 9) and FAQ preselection (task 13):** see the notes in the table.
8. **Deep links land at the top:** "Max context window", "Lorebook budget" and "Edit the card" open the right
   editor but not the right field or tab (+1-2 steps each, more on the phone).

### Not verified

- Real models: Mari's answers came from a script that quotes the first finding. Her judgment with a real
  model (which cause she picks, whether she calls `chat.diagnose` or `lorebook.testScan`) was not measured.
- One reviewer, not three: the strategy report asked for three fresh-eyes reviewers per task (3/3 bar). This
  pass had one, who knows the codebase, which favors the "without" paths.
- Real phones, light theme and large libraries: as in slice 47.
