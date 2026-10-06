# Professor Mari cards v5 — implementation spec

Live mockup: `index.html` next to this file (toggle dark/light, phone 390 / desktop 1440). Kept from
`.tmp/omnibar-ux/cards-v5/` for slice 62d (R10); the `before/` and `mock-shots/` screenshots and the
`shoot*.mjs` drivers it names below stayed in `.tmp` and are not kept here.

The root font size is **17px** (`html { font-size }` in the app), so every rem below is ×17.

## 1. Design rules

1. **One anatomy.** Every card is a *row*: leading slot · title · one muted fact · one trailing thing.
2. **One or two lines.** A row is never taller than two text lines. Detail opens *inside* the row, on demand.
3. **Groups, not boxes.** Rows that stack share ONE inset group (one border, one radius, inset dividers).
   No border or radius inside a group. No box inside a box.
4. **Three radii, each with one job.** Group `0.875rem`; slot `0.375rem` (concentric with the group
   corner: 14.9 − 8.5 padding = 6.4px) or a circle for portraits; buttons and badges are capsules.
5. **One fact, never the type.** The slot already says what the thing is (58b icons and badges). The fact
   says something useful about *this* thing (a state, a count, where it lives). Never “Chat”, never a tag.
6. **The trailing thing says what a tap does.** `›` opens now · gold `✦` asks Mari · rotating `›` shows the
   change · quiet text button (Undo) · one small solid capsule for the single primary action (Keep).
7. **What needs you comes first.** “Needs your OK” sits above “Changed”.
8. **Calm states.** No hover lift, no pink borders, no per-card stagger. Selected = 9% primary tint.
9. **Phone:** groups span the full transcript width (the sprite stays beside the text only).
   **Desktop:** groups start at the text edge (after the sprite); refs and next steps use 2 columns from a
   36rem group width.

## 2. Tokens

New custom properties (put them next to `--mari-hairline` in `globals.css:1384`, `:root` block; the light
block needs no overrides — they derive from existing tokens):

| Token | Value | px @17 | Use |
|---|---|---|---|
| `--mari-card-radius` | `0.875rem` | 14.9 | group corner (same as today's `.mari-outcome`) |
| `--mari-card-pad-block` | `0.5rem` | 8.5 | row padding top/bottom |
| `--mari-card-pad-inline` | `0.75rem` | 12.75 | row padding start/end |
| `--mari-card-slot` | `1.875rem` | 31.9 | leading slot (was 2.25rem / 2rem / 1.9rem in four places) |
| `--mari-card-slot-radius` | `0.375rem` | 6.4 | non-portrait slot |
| `--mari-card-gap` | `0.75rem` | 12.75 | slot ↔ text ↔ trailing |
| `--mari-card-text-edge` | `calc(pad-inline + slot + gap)` | 57.4 | where text starts; inset divider start |
| `--mari-card-title` | `0.8125rem` / 600 / lh 1.3 | 13.8 | row title |
| `--mari-card-fact` | `0.75rem` / 400 / lh 1.3 | 12.75 | fact, section header (500), buttons (600) |
| `--mari-card-slot-fill` | `color-mix(in srgb, var(--foreground) 7%, transparent)` | | non-portrait slot background |
| `--mari-card-selected` | `color-mix(in srgb, var(--primary) 9%, transparent)` | | selected / current row |

Existing tokens, reused as is: `--mari-group-bg` (group fill), `--mari-hairline` (group border, 1px),
`--mari-divider` (inset dividers, 1px), `--mari-hover` (row hover), `--mari-ok` (done check),
`--mari-ins-line` (inserted text), `--mari-workspace-gold` at 62% over `--foreground` (the ✦, as today in
`.mari-next-card[data-kind="mari"]`), `--destructive` (failed fact), `--ring` (focus).

Row sizes: regular row min-height `3rem` (51px, two lines); compact row min-height `2.625rem` (44.6px,
one line, slot `1.5rem`, block padding `0.375rem`). Touch: buttons keep the existing `::after` hit-area
expansion under `(pointer: coarse)`; rows are ≥ 44px.

Portrait slot: circle, `outline: 1px solid oklch(1 0 0 / .1)` dark / `oklch(0 0 0 / .1)` light,
`outline-offset: -1px`. The pink-tinted ring from `CommandCenterMedia` does NOT apply inside cards.
Type badge (58b): unchanged `0.9375rem` on regular rows; `0.75rem` (glyph `0.4375rem`) on compact rows.
Slot glyph: `1rem`, stroke `1.75` (regular); `0.875rem` (compact). Trailing glyph `0.875rem`, muted.

Buttons inside rows (`.mari-btn` today is `min-height 1.875rem`, radius `0.5rem`): in cards use height
`1.75rem`, padding-inline `0.7rem`, radius `999px`, `0.75rem/600`. Quiet = transparent, `--foreground`
text, hover `--mari-hover`. Primary (max one per group) = `--foreground` fill, `--background` text (the
existing `.mari-btn--solid`). Press: `scale: 0.96`.

Section header (only “Needs your OK”, “Changed”, “Next”): `0.75rem/500`, `--muted-foreground`, sentence
case, `padding-inline: var(--mari-card-pad-inline)`, `margin-top: 0.375rem`, `0.375rem` above its group.
No uppercase eyebrows inside Mari cards.

## 3. Anatomy

```
group (border 1px hairline, radius 14.9, fill group-bg, overflow hidden, container-type: inline-size)
└─ item
   ├─ row  [slot 32] 12.75 [title / fact] 12.75 [trailing]      padding 8.5 / 12.75
   └─ detail (only when open)  padding: 0 12.75 12.75 <text-edge>
      ├─ field: label (0.75rem/500 muted) + value (tracked text, chips)
      └─ links: “Exact changes · View as prompt · Raw” (0.75rem/500 muted, gap 1rem)
divider between items: 1px --mari-divider, from text-edge to the end (iOS inset style)
2 columns (group ≥ 36rem): items in a 1fr 1fr grid; a 1px vertical divider, inset 0.625rem top/bottom
compact (group < 36rem, references only): title and fact on one line; the fact truncates first
```

## 4. Per card type

| Card | Group | Slot | Title | Fact | Trailing | Tap |
|---|---|---|---|---|---|---|
| Reference — character / persona | refs group (2 col ≥36rem; compact <36rem) | portrait + badge | name | first sentence of summary/description | `›` | opens it (no sheet) |
| Reference — lorebook | 〃 | cover or book icon | name | “N entries” | `›` | opens |
| Reference — lorebook entry | 〃 | book-open-text | entry name | “<lorebook> · key “<first key>”” (lorebook only if keys unknown) | `›` | opens entry |
| Reference — chat | 〃 | participant face(s) + mode badge | chat name | “N messages · <relative time>” | `›` | opens chat |
| Reference — agent | 〃 | agent art or sparkles | name | “On”/“Off”/“Failed” + “ · <short description>” | `›` | opens agent |
| Reference — setting | 〃 | settings | setting title | “<section> · <value>” when known | `›` | finds setting |
| Outcome — needs your OK | header “Needs your OK”, first | record face | record name | what changes, in words (“Adds 2 keys: compass, heirloom”) | rotating `›`, Undo, **Keep** | toggles detail |
| Outcome — applied (undo window) | header “Changed” | record face | record name | “Changed <fields in words>” | rotating `›`, Undo | toggles detail |
| Outcome — created | 〃 | type icon | name + `New` capsule | “New <type> · <count>” | `›` | opens |
| Outcome — resolved prompt (install/file) | 〃 | check / minus | the existing line text | — (one-line row) | none | — |
| Next step | header “Next” (2 col ≥36rem) | type icon (58b) or action icon | label | `detail` | `›` acts now · `✦` asks Mari (tooltip = today's kind label) | as today (Shift/long-press drafts) |
| Arrival | line + meta, then ONE group, 1 column | as above | as above | as above | as above | as above |
| Reply checkup (open) | one group, max-width 28rem, under the quiet line | alert / info / eye | the finding with its number (“Cut off at 512 tokens”) | why · the setting name | `›` | goes to the setting / Peek |
| Chats panel row | the existing list group | `mari-chat` icon in a 32px slot | chat name | “<context> · <time> · N messages” (context from slice 62b; “General” without) | `⋮` on hover/focus, always on touch | opens chat |

Rules that cut height:
- Reviews start **collapsed** (today `openIndex` starts at 0). A one-row review still collapses.
- One row per record per turn: when an action result and a review describe the same record
  (`resource.kind/id` ↔ `table/id`), render the review row and drop the tile.
- The reference sheet goes; the description becomes the row's `title` attribute (tooltip) and the fact.
- The arrival does not repeat a name that its line already shows unless the row adds a fact.
- Next steps: show at most 4 rows (proposal; I found no cap in the client today).

## 5. States

| State | Look |
|---|---|
| hover | row background `--mari-hover`, 120ms ease-out; no translate |
| pressed | background `color-mix(foreground 9%)`; buttons `scale: .96` |
| focus-visible | `outline: 2px solid var(--ring); outline-offset: -2px` on the row (it sits in a clipped group) |
| selected / current | background `--mari-card-selected`; no border |
| open | trailing `›` rotates 90° (200ms); detail grows with the existing `grid-template-rows 0fr→1fr` |
| busy (Keep/Undo running) | row `opacity: .6`; a 0.8rem spinner replaces the button icon; buttons disabled |
| done | trailing becomes `✓ Kept` / `✓ Undone` in `--mari-ok`, 0.75rem/500; row stays in place |
| failed | fact in `--destructive`; nothing else turns red |
| disabled | `opacity: .45`, `cursor: not-allowed` (as `.mari-btn:disabled`) |

Motion: a group fades in once (`opacity 0→1`, `translate 0 .25rem→0`, 200ms ease-out). Remove the per-card
`mari-welcome-in` stagger from cards. `prefers-reduced-motion`: no fade, no rotation.

## 6. Code places to change

CSS — `packages/client/src/styles/globals.css`:
- `:1384` `:root` Mari block — add the `--mari-card-*` tokens.
- `:969-1130` `.mari-ref-cards`, `.mari-ref-card*`, `.mari-ref-sheet*` — replace pills and sheet with the
  shared group/row classes; delete the sheet rules.
- `:977-1014` `.result-type-icon__*` — keep; add the compact badge size.
- `:1399-1460` `.mari-btn` / `.mari-link` — add the in-card capsule size (or a `.mari-btn--row` modifier).
- `:1580-1680` `.mari-edit*` — the review becomes rows of the shared group: drop `.mari-edit` border/radius
  when it sits in `.mari-outcome`; `.mari-edit__head` → row; `.mari-edit__body` → detail at the text edge.
- `:1777-1830` `.mari-tile`, `.mari-new-badge` — the tile becomes a row; badge stays (sentence case “New”,
  no uppercase).
- `:1878-1925` `.mari-reply-checkup*` — the open panel becomes a group of rows; “Check” weight 500.
- `:2028-2040` `.mari-edit--menus` — Chats panel list: inset dividers, 32px slot.
- `:2441` `@keyframes mari-welcome-in` — keep for the welcome; remove from cards.
- `:2456-2500` `.mari-arrival*` — one alignment edge; `.mari-arrival__copy > .mari-ref-cards` goes.
- `:2941-3000` `.mari-run-outcome`, `.mari-outcome*` — two stacked groups with sentence-case headers;
  delete the uppercase `.mari-outcome__label` and the frame-stripping overrides at `:2977-2991`.
- `:3004-3120` `.mari-next-card*` — one group (2 col via container query); delete `.mari-next-card__kind`
  corner tag (`:3079-3100`) and its `padding-right: 5.5rem` on the label.

Components:
- `components/chat/HomeProfessorMariChat.tsx:2178` `MariWorkspaceActionResultRow` → shared row; trailing
  `›` instead of “Open ›” text; fact “Changed <fields>” in words.
- `:2236` `MariReferencedResources` → group of rows; delete `selectedKey` state (`:2348`) and the sheet
  (`:2363`); new fact rules (section 4); description as `title`.
- `:2434` `MariOutcomeGroup` → render `needsOk` first; headers only when both exist (as today); dedupe
  action-result tiles against reviews of the same record (`:2471` `MariWorkTimelineOutcome` builds both).
- `:5561` `renderTurnPrompt` / `:5578` `renderTurnReviews` — unchanged data flow; pass `collapsed`.
- `:6301` arrival (`HomeProfessorMariChat.Arrival`) and `:6486` (`AppendedArrival`) — one group under
  line + meta: refs rows then next-step rows; drop the duplicate portrait when the line names it and
  the row has no extra fact.
- `:6873-7060` Chats panel — header title “Chats” (`home.professorMari.chats` key text), hint moves to the
  empty state; `ResultTypeIcon type="mari-chat"` (`:7002`) in the 32px slot, not a bare glyph; `⋮` uses the
  repo pattern `opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100`.
- `components/chat/MariSuggestionChips.tsx:300` `MariNextStepCards` → rows; `kindLabel` (`:338`) becomes the
  trailing glyph's `title`/`aria-label` suffix; remove the corner tag (`:385`).
- `components/chat/MariEditEasyViewer.tsx:197` `useState<number | null>(0)` → `null` (collapsed);
  `:255` meta → words (“Adds 2 keys: …”, “Changed description”); `:215` footer links become the detail's
  link line; Undo/Keep move into the row header (`actions` prop, rendered in `.mari-edit__end`);
  `:336` multi-row footer → same link line.
- `components/chat/MariApprovalCards.tsx:76` `DatabaseWorkspaceApprovalCard` — pass Undo/Keep as compact
  row buttons; `:499` `WorkspaceApprovalCard` wrapper unchanged.
- `components/chat/ReplyCheckup.tsx:40` panel → group of rows; `ReplyCheckupFacts` (`:52`) renders rows for
  the chat line, keeps the list for the Peek header (`PeekPromptModal.tsx:623`).
- `components/command-center/ResultTypeIcon.tsx:33` — add `size="card" | "compact"` (32px / 24px); for
  non-avatar kinds in cards use the `0.375rem` tile, not `rounded-md` + pink border
  (`CommandCenterMedia.tsx:79-81`). Omnibar rows keep their current look.
- `components/chat/MariPanelControls.tsx:82` `MARI_SIDE_ROW_CLASS` — align to the row tokens (min-h 3rem,
  gap 0.75rem, px 0.75rem).

Copy (`packages/client/src/localization/locales/en.json`): new semantic keys for “Next”, the reference
facts (“{{count}} messages · {{time}}”, “{{count}} entries”, “key “{{key}}””), the review facts (“Adds
{{count}} keys: {{keys}}”, “Changed {{fields}}”), “Kept”, “Undone”. Reuse `outcomeNeedsYou`,
`outcomeChanged`, `actsNow`, `asksMari`, `actionNew`. Run `heavy pnpm localization:check`.

## 7. Proof the worker must bring

`shoot.mjs` here takes all “before” shots against a seeded instance (copy `data/`, start server + vite,
see the header of `shoot.mjs`); rerun it after the change into `after/` and compare with `mock-shots/`.
390 and 1440, dark and light, plus: a long title (60 chars), a 5-ref turn, a 3-row review opened, busy and
failed states, keyboard Tab through a group, reduced motion. `heavy pnpm check`.

## 8. Open questions

1. **Reference sheet.** v5 removes it (tap opens the thing). Keep a preview for characters (long-press /
   hover card) or not?
2. **Keep as solid capsule.** Neutral `--foreground` fill (as `.mari-btn--solid`) or a pink-tinted capsule?
   v5 uses neutral; pink stays Mari's accent.
3. **Dedupe rule.** Does a real run produce both an action-result tile and an applied review for the same
   record (this fixture has both)? If yes, v5 shows only the review row.
4. **Two densities.** Compact one-line rows only for references on narrow widths. Also for Chats rows?
5. **Reply checkup → Mari.** Add a row “Ask Mari why” once slice 62 (`chat.diagnose`) lands? Not in v5.

---

## 9. Composer (Professor Mari pane)

Mockup: section “10 · Composer” in `index.html`. Before shots: `before/composer-*` (`shoot-composer.mjs`;
the keyboard state is simulated with a 390 × 470 viewport). “Full workspace” here means the same pane
with a side panel open (split), at 1440 — `HomeProfessorMariChat` is mounted only by the omnibar pane.

### 9.1 Critique (measured on this branch)

- **No hierarchy at rest.** Border, glow, paperclip, both menu triggers and send are all pink. The bar at
  rest already looks focused (pink border 24 % + pink shadow); focus only raises the border to 62 %.
- **Controls louder than text.** Connection and mode are bordered boxes (`.mari-chrome-control--compact`,
  radius 0.625rem) with 10.6 px semibold pink text; in light mode that pink at 10.6 px is weak contrast.
  On a phone the coarse-pointer rule makes them 44 px tall boxes, taller than one text line.
- **Radii:** shell 17 px (phone 14.9), menu triggers 10.6, Aware-of chips 6, attachment cards 8, send 12,
  Stop 999, menu 12.75 — seven values in one control.
- **Paperclip** sits in its own 34–44 px box; its icon does not line up with the text edge (desktop: icon
  centre at +18 px, text at +0).
- **Send** is a pink outline paper plane, the same weight as the paperclip; empty vs ready differs only by
  opacity. Claude, ChatGPT and Messages all use one filled round/square button that is clearly off when
  empty and clearly on when ready.
- **Text size:** 17 px in the bar vs 13.8 px in the conversation (desktop). The phone needs ≥ 16 px (iOS
  zoom); desktop does not.
- **Growth:** `resizeComposer` (`HomeProfessorMariChat.tsx:3148`) resets `height: auto` on every keystroke,
  so growth jumps; its cap is 128 px while the CSS cap is `max-h-32` (136 px); after the cap the text
  scrolls with no hint that lines are above.
- **Attachments** render outside the bar (`:6606`) as separate 8 px cards; the message and its files read
  as two things. The Aware-of chips are already inside the top edge (good) but use 10.6 px text.
- **Menus:** the permissions-mode menu is 440 px tall (6 options with 2–3 line descriptions; “Use default
  (Auto)” repeats “Auto”). Connection items are pink text.
- **Placeholder** “Ask Professor Mari” is fine; its colour (`foreground/30`) is fainter than muted text.
- **Stop:** the bar folds into one small centred capsule. The maintainer asked for this; keep it.
- **Phone keyboard:** two lines make a 123 px bar; with the 98 px header about 180 px of conversation
  stays visible. v5 does not make the bar much shorter (≈ 116 px); the header is the bigger cost
  (out of scope).

Reference composers: Claude (neutral shell, quiet text model picker next to a filled send square),
ChatGPT (capsule shell, + at the start, filled black circle send), Apple Messages (capsule field, send is
a filled circle that appears only with text). Shared pattern: neutral frame, text first, one filled send.

### 9.2 Tokens

| Token | Value | px @17 | Use |
|---|---|---|---|
| `--mari-composer-radius` | `1.125rem` | 19.1 | shell |
| `--mari-composer-pad` | `0.5rem` | 8.5 | shell padding |
| `--mari-composer-inner-radius` | `0.625rem` | 10.6 | anything square inside the shell, menu rows (19.1 − 8.5) |
| `--mari-composer-control` | `2rem` | 34 | icon buttons, menu triggers, send, Stop; 44 px hit area under `(pointer: coarse)` via `::after` |
| `--mari-composer-text` | `0.875rem` desktop / `1rem` coarse pointer | 14.9 / 17 | textarea, line-height 1.5 |
| `--mari-composer-lines` | `8` desktop / `6` coarse | | growth cap |
| `--mari-composer-fill` | dark `color-mix(in srgb, var(--foreground) 4%, <canvas>)`; light `color-mix(in srgb, #fff 80%, <canvas>)` | | shell background (canvas = the pane background) |

Colours: rest border `--mari-hairline`; focus border `color-mix(in srgb, var(--primary) 50%, var(--mari-hairline))`
plus ring `0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)`; shadow dark
`0 1px 2px rgb(0 0 0/.12), 0 .75rem 1.5rem -1rem rgb(0 0 0/.5)`, light the same at .05/.18. Controls
`--muted-foreground`, hover/open `--mari-hover` + `--foreground`. Mode trigger keeps its semantic colour:
plan `--primary`, bypass `--destructive`. Missing connection keeps the red dot. Send: ready
`--foreground` fill / `--background` icon (arrow-up, stroke 2.25); empty `color-mix(foreground 10%)` fill,
muted icon. Placeholder `color-mix(in srgb, var(--muted-foreground) 85%, transparent)`.

Chips (Aware of, attachments): height `1.5rem`, capsule, `0.6875rem/500`, icon `0.75rem`, fill
`color-mix(foreground 7%)`; Fix chip `color-mix(primary 14%)` with a primary icon; a “sent later” chip
transparent with a `1px dashed` muted border (as today); image attachment shows a `1.125rem` round
thumbnail; × is a `1.25rem` circle, keep the existing 44 px coarse hit area (`globals.css:3743` rule).

### 9.3 Anatomy

```
dock (unchanged position and width, max 47.5rem)
└─ shell  radius 19.1 · padding 8.5 · gap 2 · 1px border
   ├─ context row (only when present): [attachment chips…] [“Aware of” label] [facet chips…]  wraps
   ├─ textarea  padding 4 / 6 · 1 line min · grows to the cap · then scrolls with a 1.25rem top fade
   └─ bar  [paperclip 34] [connection ⌄] [mode ⌄] ……… [send 34]
working: the shell folds (as today) into ONE centred Stop capsule, 34 px, hairline, shell fill
menus: a floating v5 group above the trigger (radius 0.875rem, padding 4, rows 44.6 px, slot 1.5rem,
       title + one-line fact, check on the selected row, selected row tinted); phone: full composer width
```

Menu copy (new short keys; do NOT shorten the Settings descriptions they come from today):
Use default (Auto) — “Follows Settings” · Auto — “Mari decides when to ask” · Manual — “Asks before every
change” · Accept edits — “Edits records without the review card” · Plan — “Describes changes, makes none” ·
Bypass permissions — “No review cards; deletions still ask”. The full description stays as the row's
`title`. Connection rows: name, fact “provider · model”.

### 9.4 States

| State | Look |
|---|---|
| rest | hairline border, neutral fill, soft shadow; send grey |
| focus | primary-50 % border + 3 px primary-15 % ring (no glow) |
| typing | send solid; ghost draft completion (InlineGhostText) unchanged, muted |
| growing | height transitions 120 ms ease-out per line, to the cap; then scroll + top fade |
| context | chips row inside the top edge; attachments first, then “Aware of” + facets |
| menu open | trigger `--mari-hover` fill; popover above (phone: full width) |
| busy (before Stop exists) | contents at 40 % (today's rule, keep) |
| working | Stop capsule only (today's fold, keep its motion) |
| disabled / no connection | send grey; connection trigger keeps its red dot |

Growth without jumps: measure without leaving `auto` on screen — `from = el.offsetHeight; el.style.height
= "auto"; to = min(el.scrollHeight, cap); el.style.height = from + "px"; el.offsetHeight; el.style.height
= to + "px"` with `transition: height .12s ease-out` (none under reduced motion). Set `data-scrolled`
when `scrollTop > 0` for the fade mask.

### 9.5 Code places

- `components/chat/HomeProfessorMariChat.tsx`
  - `:3148` `resizeComposer` — the transition-friendly measure above; cap from `--mari-composer-lines`
    (not a hard 128).
  - `:6606` `<ProfessorMariAttachmentPreviews>` — move inside the shell's context row; render as chips
    (`:1526` component: thumbnail/file icon + name + ×; keep the reading spinner as a chip).
  - `:6618` shell — keep `getChatInputShellClass` (shared with regular chats) but override in the
    `.mari-workspace-composer` scope, not in `.mari-professor-composer` (see 9.6, Q1).
  - `:6624` `<MariContextFacetChips>` and `:6631` the query chip — chip tokens above.
  - `:6655` `InlineGhostText` and `:6692-6693` textarea — text token, padding `0.25rem 0.375rem`,
    line-height 1.5 on all widths (today `leading-tight` on phones), placeholder colour, drop `max-h-32`.
  - `:6698` toolbar, `:6711` connection trigger, `:6804` mode trigger — borderless capsule triggers.
  - `:6751`, `:6828` popovers; `:5630` `renderPermissionsModeRow` (`:5653` classes) and `:5667`
    `permissionsModeOptions` — v5 rows, one-line facts, divider after the default row.
  - `:6843` send button — 34 px circle, arrow-up, filled when ready (replaces `rounded-xl` + paper plane).
- `components/chat/MariContextFacetChips.tsx:54-95` — chip classes (capsule, 0.6875rem, 1.5rem tall).
- `components/chat/MariAttachButton.tsx:43-55` — 34 px circle, muted icon, stroke 1.75.
- `styles/globals.css`
  - `:657-682` `.mari-professor-composer` rest/focus/light — neutral border, focus ring (see Q1 scope).
  - `:1131-1220` fold and Stop — keep the motion; Stop height/fill to tokens.
  - `:3498` dock (unchanged), `:3619` toolbar gap 0.125rem, `:3666` popover → v5 group look, `:3654`
    missing-connection dot (keep), `:3732-3775` context row and coarse hit areas (keep the 44 px rules
    but draw controls at 34 px).
  - `:4421` `.mari-chrome-control--compact` — not used by the composer any more.
- `localization/locales/en.json` — new short mode-fact keys (`ui.chat.homeprofessormarichat.modeFact.*`);
  placeholder key `home.professorMari.placeholder` (`:2245`) unchanged.

### 9.6 Composer open questions

1. **Scope.** `.mari-professor-composer` also styles Professor Mari's composer in regular chats
   (`ConversationInput.tsx:2237`, `ChatInput.tsx:2067`). Change both (one Mari look) or only the pane?
2. **Send colour.** v5 uses neutral `--foreground` (like Keep). Pink would make Mari's brand the one
   strong colour in the bar. Which?
3. **Phone header.** The 98 px two-row Mari header costs more space with the keyboard open than the
   composer does. A separate pass?
