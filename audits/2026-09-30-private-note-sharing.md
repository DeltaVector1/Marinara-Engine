# Private-note sharing translation follow-up

## Scope

- Issue: [#6896](https://github.com/Pasta-Devs/Marinara-Engine/issues/6896).
- Source: [#6897](https://github.com/Pasta-Devs/Marinara-Engine/pull/6897),
  commit `822320d354bd6abfd8cc68c4bb51094a6d3a0bb6`.
- Translate the new paragraph under "Your private notes" in
  `docs/roleplay/getting-started.md` into all ten documentation packs.
- Preserve English UI labels and explain that a note stays out of model prompts
  unless shared with a selected character, requires solo or Individual replies,
  and stops being shared when removed.
- Leave UI packs and the deferred Game Mode work (#6742 and #6813) unchanged.

The source feature PR was still open at validation time, with its head unchanged
at the commit above. This translation update depends on that English wording.
The manifests identify this paragraph's source snapshot, not a new full-pack
catchup audit. The earlier Game Mode exclusions still apply.

## Validation

- Added one paragraph per language: `de`, `es`, `fr`, `pt-br`, `pl`, `ru`,
  `ja`, `ko`, `zh-hans`, and `hi`.
- Regenerated all ten manifests with `scripts/docs-i18n/build-manifest.mjs`.
- All ten `scripts/docs-i18n/validate-pack.mjs` runs passed against the source
  snapshot above: 136 translated guides and 136 English guides per pack.
- A focused integrity check confirmed exactly one added paragraph per guide,
  exact English UI-label parity, NFC text, and no forbidden whitespace. Removing
  that paragraph reproduces each original file byte-for-byte. Only that guide's
  manifest entry changed; all 1,360 file hashes and byte sizes matched disk.
- `git diff --check` passed.
- `pnpm install` and `pnpm check` passed in the Engine checkout at
  `c67519cbe79eb8b55629ce692e32b37c3a583aed`. The baseline check required an
  unsandboxed retry because the sandbox blocked the context-loader subprocess.
  These are baseline checks, not execution tests of the source feature PR.
- Local CodeRabbit review is pending.

Manual verification still needed: native-language proofreading and viewing the
updated guides in the app after the source feature is available.
