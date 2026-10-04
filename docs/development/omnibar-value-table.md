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
