# Decision model documentation translations

## Scope

- Tracking issue: [#6986](https://github.com/Pasta-Devs/Marinara-Engine/issues/6986).
- English source: [#6987](https://github.com/Pasta-Devs/Marinara-Engine/pull/6987),
  checked against `staging` at `ed542bc5681d323282ab5b6c0400e412d180f31a`.
  The four guides are unchanged from that PR's merged head.
- Update `connections/decision-models.md`, `agents/memory.md`,
  `chats/peek-prompt.md`, and `FAQ.md` in all ten documentation packs.
- Translate the Strands decider setup section, rename the affected Decision
  model labels and prose, and update the memory-heading links. Preserve old
  explicit memory anchors as aliases and add the canonical new anchors.
- Leave UI packs and the deferred Game Mode translation batch unchanged.

This covers the issue's currently listed source change. Keep #6986 available
for later Decision model documentation additions; this is not a full-pack
catchup audit.

## Validation

- Regenerated all ten manifests using `scripts/docs-i18n/build-manifest.mjs`
  with `--source-commit ed542bc5681d323282ab5b6c0400e412d180f31a`.
- `scripts/docs-i18n/validate-pack.mjs` passed for every pack: 136 translated
  guides against 136 English guides, without missing or orphaned guide paths.
  Both scripts ran from an archive of the captured English source revision.
- Focused Markdown checks passed for all 40 changed guides: leading headings,
  unchanged existing code and inline code, exact English commands and link
  targets in the new section, its three-step list structure, new/changed
  fragment targets, and preservation of the legacy memory anchors.
- Checked added lines for NFC normalization, hidden whitespace and full-width
  Latin letters/digits. Verified hashes and byte sizes for all 1,360 manifest
  entries. Only the four intended guide entries changed in each manifest.
- Confirmed the complete diff contains 40 guides, ten manifests and this audit.
  UI packs and deferred Game Mode guides are unchanged. `git diff --check` passed.
- `pnpm install` and `pnpm check` passed in the Engine checkout at
  `c295139588437b01bfdedbdbde336b64bbaf5f82`. This is an Engine baseline check,
  not a runtime test of the source feature. The initial sandboxed check failed
  while reading generated Impeccable context; the permitted retry passed.
  Existing chunk-size and circular-chunk build warnings remained nonblocking.

- Local `coderabbit review --agent --base origin/docs-i18n --committed --fresh`
  completed at `615927ae2d53cf34f5bd6860a1b4bcc9badeb214`: all 51 changed files
  reviewed, zero findings. The only later change records that result here.

Native-language proofreading and in-app reading remain manual checks. The
translated server commands and benchmark figures were checked against English,
not independently executed or measured.
