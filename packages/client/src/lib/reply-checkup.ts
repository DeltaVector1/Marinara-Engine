// R2: the reply checkup's client side — run diagnoseReply on a loaded message and word its findings.
// The quiet line under a reply, the omnibar Fix row and the Peek header all read these.
import {
  diagnoseReply,
  REPLY_CHECKUP_LINE_CODES,
  type CharacterData,
  type ReplyCheckupFinding,
  type ReplyCheckupInput,
  type ReplyCheckupLink,
} from "@marinara-engine/shared";
import { parseMessageExtraRecord } from "./chat-message-extra";
import type { OmnibarTranslate } from "./omnibar-entity-rows";

export function checkReply(
  message: { content: string; extra?: unknown },
  options: { connectionId?: string | null; character?: { id: string; data: unknown } | null } = {},
): ReplyCheckupFinding[] {
  const { character } = options;
  const data = character ? parseMessageExtraRecord(character.data) : null;
  return diagnoseReply({
    message: {
      content: message.content ?? "",
      extra: parseMessageExtraRecord(message.extra) as NonNullable<ReplyCheckupInput["message"]["extra"]>,
    },
    connectionId: options.connectionId ?? null,
    character: character && data ? { id: character.id, data: data as Partial<CharacterData> } : null,
  });
}

/** Findings about the reply itself: only these earn the quiet line and the Fix row. */
export function replyLineFindings(findings: readonly ReplyCheckupFinding[]): ReplyCheckupFinding[] {
  return findings.filter((finding) => REPLY_CHECKUP_LINE_CODES.includes(finding.code));
}

const num = (value: string | number | undefined) => (typeof value === "number" ? value.toLocaleString() : value);

/** Short label: the quiet line ("Cut off · Check") and the Fix row's detail. */
export function replyCheckupLabel(finding: ReplyCheckupFinding, t: OmnibarTranslate): string {
  const { values } = finding;
  switch (finding.code) {
    case "cut_off":
      return t("chat.replyCheckup.label.cutOff", "Cut off");
    case "empty_reply":
      return t("chat.replyCheckup.label.emptyReply", "Empty reply");
    case "history_trimmed":
      return t("chat.replyCheckup.label.historyTrimmed", "{{count}} older messages not sent", { count: values.count });
    case "reply_budget_cut":
      return t("chat.replyCheckup.label.replyBudgetCut", "Reply limit cut to {{to}} tokens", { to: num(values.to) });
    case "lore_budget_skipped":
      return t("chat.replyCheckup.label.loreBudgetSkipped", "{{count}} lorebook entries left out", {
        count: values.count,
      });
    case "card_large":
      return t("chat.replyCheckup.label.cardLarge", "Large character card");
  }
}

/** One fact with its numbers, for the checkup list and the Peek header. */
export function replyCheckupFact(finding: ReplyCheckupFinding, t: OmnibarTranslate): string {
  const { values } = finding;
  switch (finding.code) {
    case "cut_off":
      return values.limit
        ? t("chat.replyCheckup.fact.cutOff", "The reply hit its {{limit}}-token limit and stopped mid-sentence.", {
            limit: num(values.limit),
          })
        : t("chat.replyCheckup.fact.cutOffNoLimit", "The reply hit its token limit and stopped mid-sentence.");
    case "empty_reply":
      return t("chat.replyCheckup.fact.emptyReply", "The model sent back no visible text.");
    case "history_trimmed":
      return t(
        "chat.replyCheckup.fact.historyTrimmed",
        "{{count}} older messages were not sent. The prompt needed {{before}} tokens; the budget was {{budget}}.",
        { count: values.count, before: num(values.before), budget: num(values.budget) },
      );
    case "reply_budget_cut":
      return t(
        "chat.replyCheckup.fact.replyBudgetCut",
        "The reply limit went from {{from}} to {{to}} tokens to make room for the prompt.",
        { from: num(values.from), to: num(values.to) },
      );
    case "lore_budget_skipped":
      return t(
        "chat.replyCheckup.fact.loreBudgetSkipped",
        "{{count}} lorebook entries matched but did not fit the token budget: {{names}}.",
        { count: values.count, names: values.names },
      );
    case "card_large":
      return t(
        "chat.replyCheckup.fact.cardLarge",
        "The character card is about {{tokens}} tokens, {{percent}}% of the {{budget}}-token prompt budget.",
        { tokens: num(values.tokens), percent: values.percent, budget: num(values.budget) },
      );
  }
}

/** Names the setting a finding's link opens. */
export function replyCheckupLinkLabel(link: ReplyCheckupLink, t: OmnibarTranslate): string {
  if (link.kind === "chat-settings") {
    return link.section === "lorebooks"
      ? t("chat.replyCheckup.link.lorebookBudget", "Lorebook token budget")
      : t("chat.replyCheckup.link.maxTokens", "Max output tokens");
  }
  if (link.resource === "connection") return t("chat.replyCheckup.link.maxContext", "Max context window");
  if (link.resource === "lorebook") return t("chat.replyCheckup.link.lorebook", "Lorebook budget");
  return t("chat.replyCheckup.link.character", "Edit the card");
}
