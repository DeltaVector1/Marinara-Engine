// Dialogue quote patterns shared by the chat renderers.

const DIALOGUE_QUOTE_PAIRS = [
  ['"', '"'],
  ["“", "”"],
  ["«", "»"],
  ["「", "」"],
  ["『", "』"],
] as const;

export const DIALOGUE_QUOTE_PATTERN_SOURCE = '"[^"]+"|“[^”]+”|«[^»]+»|「[^」]+」|『[^』]+』';

export const DIALOGUE_QUOTE_CAPTURE_GROUP_PATTERN_SOURCE = '"([^"]+)"|“([^”]+)”|«([^»]+)»|「([^」]+)」|『([^』]+)』';

export const HTML_SAFE_DIALOGUE_QUOTE_PATTERN_SOURCE = '"[^"<>]+"|“[^”<>]+”|«[^»<>]+»|「[^」<>]+」|『[^』<>]+』';

export function stripSurroundingDialogueQuotes(content: string): string {
  if (content.length < 2) return content;

  for (const [open, close] of DIALOGUE_QUOTE_PAIRS) {
    if (content.startsWith(open) && content.endsWith(close)) {
      return content.slice(open.length, content.length - close.length);
    }
  }

  return content;
}

