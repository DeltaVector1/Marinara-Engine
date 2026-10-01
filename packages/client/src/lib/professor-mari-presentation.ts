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

/**
 * Which assistant turn a held review belongs to: the last reply between the user message sent
 * before the review was requested and the next user message. A review whose turn has no reply (or
 * an unreadable time) stays unassigned, and the caller shows it after the transcript.
 */
export function assignReviewsToTurns<R extends { requestedAt: string }>(
  messages: ReadonlyArray<{ id: string; role: string; createdAt: string }>,
  reviews: ReadonlyArray<R>,
): { byMessageId: Map<string, R[]>; unassigned: R[] } {
  const byMessageId = new Map<string, R[]>();
  const unassigned: R[] = [];
  for (const review of reviews) {
    const requestedAt = Date.parse(review.requestedAt);
    let turnStart = -1;
    messages.forEach((message, index) => {
      if (message.role === "user" && Date.parse(message.createdAt) <= requestedAt) turnStart = index;
    });
    let replyId: string | null = null;
    for (let index = turnStart + 1; turnStart >= 0 && index < messages.length; index++) {
      if (messages[index]!.role === "user") break;
      if (messages[index]!.role === "assistant") replyId = messages[index]!.id;
    }
    if (replyId) byMessageId.set(replyId, [...(byMessageId.get(replyId) ?? []), review]);
    else unassigned.push(review);
  }
  return { byMessageId, unassigned };
}

/**
 * A delete review's main record and totals. The planner lists the selected rows first, their cascade
 * children after, and any side-effect updates before the deletes, while diffPreview stops at 50 rows:
 * so the total comes from affectedRows, not the preview length.
 */
export function summarizeDeleteReview<C extends { table: string; action: string }>(review: {
  affectedRows: number;
  diffPreview: ReadonlyArray<C>;
}) {
  const deleted = review.diffPreview.filter((change) => change.action === "delete");
  const parent = deleted[0];
  if (!parent) return null;
  const count = review.affectedRows - (review.diffPreview.length - deleted.length);
  const selected = deleted.filter((change) => change.table === parent.table);
  return { parent, selected, count, linkedCount: count - selected.length };
}
