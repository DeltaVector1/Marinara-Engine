import type { AgentInjection } from "../../services/agents/agent-pipeline.js";

export function normalizeContextInjections(raw: unknown): AgentInjection[] {
  if (!Array.isArray(raw)) return [];
  const normalized: AgentInjection[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const text = entry.trim();
      if (text) normalized.push({ agentType: "prose-guardian", text });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { agentType?: unknown; agentName?: unknown; text?: unknown };
    if (typeof candidate.agentType !== "string" || typeof candidate.text !== "string") continue;
    const text = candidate.text.trim();
    if (text) {
      normalized.push({
        agentType: candidate.agentType,
        agentName: typeof candidate.agentName === "string" ? candidate.agentName : undefined,
        text,
      });
    }
  }
  return normalized;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    const text = entry.trim();
    return text ? [text] : [];
  });
}
