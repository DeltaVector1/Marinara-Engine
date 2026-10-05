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

Translation reconciliation and manifest validation are in progress. Final
results will replace this paragraph before the PR becomes ready for review.
