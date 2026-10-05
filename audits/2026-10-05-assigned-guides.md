# Mobile tools and agent parameters documentation catch-up

Issues: #7124 and #7142.

English source: Engine `staging` at `67c043d861b43a35251da00829ea2d8f57094af2`.
Translation base: `cd3a1b89a8499acab3ae04b2936a1d80ed82e84e`.

## Scope

Update these guides in all ten documentation packs (`de`, `es`, `fr`, `hi`,
`ja`, `ko`, `pl`, `pt-br`, `ru`, `zh-hans`):

- `appearance/custom-css-themes.md`
- `chats/chat-settings.md`
- `roleplay/getting-started.md`
- `agents/agents-overview.md`
- `agents/custom-agents.md`
- `connections/subscription-clis.md`
- `prompts/generation-parameters.md`

The mobile guides cover round Chat tools buttons, pointer and keyboard
reordering, Echo Chamber movement/resizing/pinning/locking, the updated Dottore
and Mari presets, and public CSS hooks. The parameter guides cover connection
defaults, Send switches, model support, JSON-agent reasoning defaults, retries,
package precedence, and available context/output budgets.

The packs are published on `docs-i18n`, the branch the staging app downloads.
No Engine runtime change or version bump is required.

## Validation

All 70 guide translations are reconciled. Missing mobile-menu and Apply preset
styling sections were included where older packs lacked the context needed by
the new instructions. The neighboring opening/layout paragraphs now consistently
distinguish desktop tool buttons from the phone menu.

- All ten manifests were rebuilt with the English source commit above and passed
  `node scripts/docs-i18n/validate-pack.mjs <pack-dir>` from that Engine checkout.
  Every pack contains 136 guides; all 1,360 entries have verified byte sizes, SHA256 hashes, unique mirrored paths and source-commit metadata.
- A structural comparison of all 70 touched guides found identical fenced-code
  blocks, inline-code values/counts and link-target values/counts to final
  English. New English fragment anchors resolve in the translated guides.
  Leading headings, NFC normalization, whitespace and line endings passed.
- Independent review corrected a stale mobile-tool opening paragraph and made
  disabled Send switches explicit, keeping them distinct from selecting the
  reasoning value Off. Translation review covered connection precedence,
  retries, JSON defaults, package overrides and bounded thinking headroom.
- `pnpm check` passed on the unchanged English Engine source commit above.
- `node scripts/run-regressions.mjs --filter scripts/regressions/docs-language.regression.ts`
  passed (1/1) on the same Engine source, covering documentation language packs.
- `git diff --check` passed.

Local CodeRabbit reviewed all 81 changed files and completed with zero findings.
Native-speaker review and a manual refresh
of the downloaded packs in the staging app remain useful manual checks; they
are not claimed as completed here.
