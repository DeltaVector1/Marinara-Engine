type LorebookScopeExclusions = {
  excludedLorebookIds: string[];
  excludedSourceAgentIds: string[];
};

/**
 * Resolve which lorebooks/source-agents are excluded from scope for a chat.
 *
 * Two independent sources are merged:
 *  - Per-chat user exclusions (`metadata.excludedLorebookIds`): books the user
 *    explicitly disabled for THIS chat via the Lorebooks panel. These apply in
 *    every mode — they are how a character/global/persona book (which is
 *    auto-activated, not pinned) gets turned off without unbinding it.
 *  - Game Lorebook Keeper hiding: during normal game play (keeper disabled) the
 *    keeper's managed book and source-agent are hidden so its bookkeeping does
 *    not leak into the prompt.
 */
export function resolveLorebookScopeExclusions(
  metadata: Record<string, unknown> | null | undefined,
): LorebookScopeExclusions {
  const userExcludedLorebookIds = Array.isArray(metadata?.excludedLorebookIds)
    ? (metadata.excludedLorebookIds as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];

  return {
    excludedLorebookIds: [...new Set(userExcludedLorebookIds)],
    excludedSourceAgentIds: [],
  };
}

