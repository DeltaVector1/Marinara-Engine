import { SETTINGS_TABS, type ProfessorMariAskContext } from "@marinara-engine/shared";

export type ProfessorMariPresentationState =
  "empty" | "working" | "composing" | "history" | "completed" | "waiting-approval" | "broken";

export function resolveProfessorMariPresentationState({
  hasRecovery,
  hasWorkspaceError,
  pendingReviewCount,
  working,
  hasDraft,
  attachmentCount,
  hasActionResult,
  messageCount,
}: {
  hasRecovery: boolean;
  hasWorkspaceError: boolean;
  pendingReviewCount: number;
  working: boolean;
  hasDraft: boolean;
  attachmentCount: number;
  hasActionResult: boolean;
  messageCount: number;
}): ProfessorMariPresentationState {
  if (hasRecovery || hasWorkspaceError) return "broken";
  if (pendingReviewCount > 0) return "waiting-approval";
  if (working) return "working";
  if (hasDraft || attachmentCount > 0) return "composing";
  if (hasActionResult) return "completed";
  if (messageCount > 0) return "history";
  return "empty";
}

export function stripProfessorMariSpeakerPrefix(value: string): string {
  return value.replace(/^\s*(?:Professor\s+Mari|Mari)\s*:\s*/iu, "");
}

export function isPersistentProfessorMariContext(context: ProfessorMariAskContext | null | undefined): boolean {
  return context?.resource?.kind === "character" || context?.resource?.kind === "lorebook";
}

export function professorMariContextCount(
  attachedContextCount: number,
  context: ProfessorMariAskContext | null | undefined,
): number {
  return Math.max(0, attachedContextCount) + (isPersistentProfessorMariContext(context) ? 1 : 0);
}

export type ProfessorMariContextFacetKind = "resource" | "chat" | "field" | "settings" | "error" | "asideAnswer";

export interface ProfessorMariContextFacet {
  kind: ProfessorMariContextFacetKind;
  text: string;
}

/**
 * Every facet a handoff context carries, so the composer chip and the chip
 * left on a sent message (C2) can render the same list instead of picking
 * one field to show.
 */
export function professorMariContextFacets(
  context: ProfessorMariAskContext | null | undefined,
): ProfessorMariContextFacet[] {
  if (!context) return [];
  const facets: ProfessorMariContextFacet[] = [];
  if (context.resource?.label) facets.push({ kind: "resource", text: context.resource.label });
  if (context.activeChat?.label) facets.push({ kind: "chat", text: context.activeChat.label });
  if (context.field) facets.push({ kind: "field", text: context.field });
  if (context.settingsLocation?.tab) {
    const tabLabel =
      SETTINGS_TABS.find((tab) => tab.id === context.settingsLocation!.tab)?.label ?? context.settingsLocation.tab;
    facets.push({ kind: "settings", text: tabLabel });
  }
  if (context.error?.message) facets.push({ kind: "error", text: context.error.message });
  if (context.asideAnswer?.answer) facets.push({ kind: "asideAnswer", text: context.asideAnswer.answer });
  return facets;
}

export function shouldShowProfessorMariConnectionHint({
  chatId,
  loadedMessagesChatId,
  sending,
  effectiveConnectionId,
}: {
  chatId: string | null;
  loadedMessagesChatId: string | null;
  sending: boolean;
  effectiveConnectionId: string | null;
}): boolean {
  return chatId !== null && loadedMessagesChatId === chatId && !sending && effectiveConnectionId === null;
}

export function shouldOfferProfessorMariStarterSuggestions({
  chatId,
  loadedMessagesChatId,
  messageCount,
  busy,
}: {
  chatId: string | null;
  loadedMessagesChatId: string | null;
  messageCount: number;
  busy: boolean;
}): boolean {
  return chatId !== null && loadedMessagesChatId === chatId && messageCount === 0 && !busy;
}
