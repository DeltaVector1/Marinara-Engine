import { type BuiltInAgentManifest } from "@marinara-engine/shared";

const AGENT_CATEGORY_ORDER: Record<string, number> = {
  writer: 0,
  tracker: 1,
  misc: 2,
};

const STANDALONE_ROLEPLAY_AGENT_SETTINGS = new Set([
  "memory-nag",
  "hierarchical-maps",
  "beholder",
  "long-term-memory",
]);

export function hasStandaloneRoleplayAgentSettings(agentId: string): boolean {
  return STANDALONE_ROLEPLAY_AGENT_SETTINGS.has(agentId);
}

export function buildRoleplayAgentSettingsOrder(agents: readonly BuiltInAgentManifest[]): Map<string, number> {
  const order = new Map<string, number>(
    agents
      .map((agent, manifestIndex) => ({ agent, manifestIndex }))
      .filter(({ agent }) => !agent.libraryHidden)
      .sort((a, b) => {
        const categoryDiff =
          (AGENT_CATEGORY_ORDER[a.agent.category] ?? 99) - (AGENT_CATEGORY_ORDER[b.agent.category] ?? 99);
        return categoryDiff || a.manifestIndex - b.manifestIndex;
      })
      .map(({ agent }, index) => [agent.id, index]),
  );
  return order;
}
