import { normalizeTextForMatch, type WrapFormat } from "@marinara-engine/shared";

import { formatZonedConversationDate, formatZonedConversationTime } from "../../services/conversation/timezone.js";
import { wrapContent } from "../../services/prompt/format-engine.js";

type ConversationContextCharacter = {
  charId?: string;
  name: string;
};

export function buildConversationCurrentContextBlock(args: {
  nowInstant: Date;
  promptTimeZone?: string;
  convoCharInfo: ConversationContextCharacter[];
  personaName: string;
  mentionedCharacterNames?: string[] | null;
  wrapFormat: WrapFormat;
}): string {
  const timeStr = formatZonedConversationTime(args.nowInstant, args.promptTimeZone);
  const dateStr = formatZonedConversationDate(args.nowInstant, args.promptTimeZone);

  const mentionLine = buildMentionLine({
    mentionedCharacterNames: args.mentionedCharacterNames,
    convoCharInfo: args.convoCharInfo,
    personaName: args.personaName,
  });

  const contextLines = [...(mentionLine ? [mentionLine] : []), `The current time and date: ${timeStr}, ${dateStr}.`];

  return wrapContent(contextLines.join("\n"), "Context", args.wrapFormat);
}

export function replaceConversationContextBlockForTarget(
  content: string,
  sharedContextBlock: string,
  targetContextBlock: string,
): string {
  if (!sharedContextBlock || sharedContextBlock === targetContextBlock || !content.includes(sharedContextBlock)) {
    return content;
  }
  return content.split(sharedContextBlock).join(targetContextBlock);
}

function buildMentionLine(args: {
  mentionedCharacterNames?: string[] | null;
  convoCharInfo: ConversationContextCharacter[];
  personaName: string;
}): string | null {
  const mentionedNames = (args.mentionedCharacterNames ?? []).filter((name) =>
    args.convoCharInfo.some((character) => normalizeTextForMatch(character.name) === normalizeTextForMatch(name)),
  );
  if (mentionedNames.length === 0) return null;

  if (args.convoCharInfo.length === 1) {
    return `${args.personaName} @mentioned you directly.`;
  }

  return `${args.personaName} @mentioned: ${mentionedNames.join(", ")} — this is directed at ${
    mentionedNames.length === 1 ? "that person" : "those people"
  } specifically.`;
}
