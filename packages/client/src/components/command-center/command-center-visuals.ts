import type { ChatMode } from "@marinara-engine/shared";

import type { OmnibarCategory } from "@/lib/omnibar-search";

export type CommandCenterVisualTone = "neutral" | "cool" | "warm" | "playful" | "natural";

export interface CommandCenterVisual {
  label: string;
  tone: CommandCenterVisualTone;
  groupClassName: string;
}

export type CommandCenterCategoryLabels = Record<OmnibarCategory, string>;
export type CommandCenterChatModeLabels = Record<ChatMode, string>;

const CATEGORY_VISUALS: Record<OmnibarCategory, Omit<CommandCenterVisual, "label">> = {
  navigation: { tone: "neutral", groupClassName: "border-[color-mix(in_srgb,var(--foreground)_18%,var(--border))]" },
  chat: { tone: "playful", groupClassName: "border-[color-mix(in_srgb,#22d3ee_35%,var(--border))]" },
  character: { tone: "playful", groupClassName: "border-[color-mix(in_srgb,#fb7185_35%,var(--border))]" },
  persona: { tone: "natural", groupClassName: "border-[color-mix(in_srgb,#2dd4bf_35%,var(--border))]" },
  lorebook: { tone: "warm", groupClassName: "border-[color-mix(in_srgb,#fbbf24_35%,var(--border))]" },
  preset: { tone: "playful", groupClassName: "border-[color-mix(in_srgb,#a78bfa_35%,var(--border))]" },
  connection: { tone: "cool", groupClassName: "border-[color-mix(in_srgb,#60a5fa_35%,var(--border))]" },
  agent: { tone: "playful", groupClassName: "border-[color-mix(in_srgb,#c084fc_35%,var(--border))]" },
  settings: { tone: "neutral", groupClassName: "border-[color-mix(in_srgb,var(--foreground)_18%,var(--border))]" },
  professor: {
    tone: "playful",
    groupClassName: "border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]",
  },
  docs: {
    tone: "neutral",
    groupClassName: "border-[color-mix(in_srgb,var(--foreground)_18%,var(--border))]",
  },
};

const CHAT_MODE_VISUALS: Record<ChatMode, Omit<CommandCenterVisual, "label">> = {
  conversation: { tone: "cool", groupClassName: "border-[color-mix(in_srgb,#22d3ee_35%,var(--border))]" },
  roleplay: { tone: "warm", groupClassName: "border-[color-mix(in_srgb,#fb923c_35%,var(--border))]" },
  game: { tone: "playful", groupClassName: "border-[color-mix(in_srgb,#f472b6_35%,var(--border))]" },
};

export function getCommandCenterCategoryVisual(
  category: OmnibarCategory,
  labels: CommandCenterCategoryLabels,
): CommandCenterVisual {
  return { ...CATEGORY_VISUALS[category], label: labels[category] };
}

export function getCommandCenterChatModeVisual(
  mode: ChatMode,
  labels: CommandCenterChatModeLabels,
): CommandCenterVisual {
  return { ...CHAT_MODE_VISUALS[mode], label: labels[mode] };
}

export function getValidatedCommandCenterAccent(accent: string | null | undefined): string | undefined {
  const value = accent?.trim();
  if (!value || value.length > 64 || typeof CSS === "undefined" || !CSS.supports("color", value)) return undefined;
  return value;
}
