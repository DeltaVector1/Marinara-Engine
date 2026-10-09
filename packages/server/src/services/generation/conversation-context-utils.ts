interface SmartGroupCandidatePromptData {
  id: string;
  name: string;
  talkativeness: number;
  personality?: string;
  description?: string;
}

export function formatSmartGroupCandidates(
  candidates: SmartGroupCandidatePromptData[],
  useCandidateBlocks: boolean,
): string {
  return candidates
    .map((candidate) => {
      const fields = [
        `id: ${candidate.id}`,
        `name: ${candidate.name}`,
        `talkativeness: ${candidate.talkativeness}%`,
        candidate.personality ? `personality: ${candidate.personality}` : null,
        candidate.description ? `description: ${candidate.description}` : null,
      ].filter((field): field is string => field !== null);

      if (useCandidateBlocks) return ["<candidate>", ...fields, "</candidate>"].join("\n");
      return fields.map((field, index) => `${index === 0 ? "- " : "  "}${field}`).join("\n");
    })
    .join("\n\n");
}

export function parsePromptPresetChoices(value: unknown): Record<string, string | string[]> | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const choices = parsed as Record<string, unknown>;
    const isValid = Object.values(choices).every(
      (choice) =>
        typeof choice === "string" || (Array.isArray(choice) && choice.every((item) => typeof item === "string")),
    );
    return isValid ? (choices as Record<string, string | string[]>) : null;
  } catch {
    return null;
  }
}
