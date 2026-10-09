// ──────────────────────────────────────────────
// Noodle Prompt Instructions
// ──────────────────────────────────────────────

const NOODLE_ADULT_PLATFORM_POLICY =
  "Noodle only accepts confirmed adult accounts and personas. Every participant on Noodle is 18+; minors are not allowed on the platform. NSFW content is allowed, anything goes, and adult in-character drama, flirtation, gossip, and explicit references may appear when they fit the accounts involved.";
const NOODLE_PERSONA_AUTHORSHIP_INSTRUCTION =
  "- The user persona is controlled exclusively by the user. Never generate posts, replies, likes, reposts, poll votes, or follows as a persona. Personas may only be mentioned or targeted by other accounts.";
const NOODLE_PERSONA_IDENTITY_INSTRUCTION =
  "- Every persona account is a separate user identity. Preserve the accountKey on historical posts and replies: changing the currently selected persona never changes, merges, or reattributes activity created by another persona.";
const NOODLE_UNIQUE_CONTENT_INSTRUCTION =
  "- Never reuse the same message text for more than one post or reply by the same account. In particular, do not copy a new post's content into a reply or duplicate a reply as a new post.";
export const NOODLE_TIMELINE_BASE_DEFAULT_PROMPT = [
  "You write a fake social media timeline for Marinara Engine's in-app parody site called Noodle.",
  NOODLE_ADULT_PLATFORM_POLICY,
  "- Structured actions are limited to posts, polls, follows, likes, reposts, replies, and poll votes.",
  "- Generated interactions may target existing posts included in this prompt or posts you create in this response.",
  "- To respond directly to an existing comment, create a reply interaction for its post and set parentInteractionId to that comment's exact replyId.",
  "- Do not make an account interact with the same existing post again when it has already liked, reposted, voted, or replied there, unless that account was tagged or is answering a direct response to its own comment. Never make an account reply to its own comment.",
  "- Avoid repeating an account's recent post topic or phrasing. Continue an existing thread only when new activity gives the account a reason to return.",
  NOODLE_UNIQUE_CONTENT_INSTRUCTION,
  NOODLE_PERSONA_AUTHORSHIP_INSTRUCTION,
  NOODLE_PERSONA_IDENTITY_INSTRUCTION,
  "- For each interaction, set either targetTempId or targetPostId and set the unused target field to null.",
  "- pollOptionIndex must be a zero-based integer for votes and null for every other interaction.",
  "- An exact @handle in post or reply text tags that active account. Preserve the @handle exactly when mentioning someone.",
  "- Return JSON only. No prose outside the JSON object.",
].join("\n");
const NOODLE_CREATIVE_FORMAT_INSTRUCTIONS = [
  "- Characters and random users may create polls in their own posts and vote in polls. Occasionally use a poll when an audience question or set of choices fits naturally with the account and current activity; polls are optional, not a quota.",
  "- Standard Unicode emojis are allowed in post and reply content. Use them naturally when they fit the account's voice or reaction; emojis are optional, and not every post or reply needs one.",
  "- Characters are allowed to be assholes to each other when it fits their personalities, history, and relationships. They may be rude, insulting, confrontational, jealous, petty, sarcastic, start arguments, revive old grievances, form rivalries, or deliberately stir up interpersonal drama. This is permission, not a quota: do not force hostility into every refresh or flatten established characterization just to create conflict.",
] as const;
const NOODLE_CHARACTER_ONLY_POLL_INSTRUCTION =
  "- Characters may create polls in their own posts and vote in polls. Occasionally use a poll when an audience question or set of choices fits naturally with the account and current activity; polls are optional, not a quota.";
const NOODLE_CHARACTER_ONLY_CREATIVE_FORMAT_INSTRUCTIONS = [
  NOODLE_CHARACTER_ONLY_POLL_INSTRUCTION,
  ...NOODLE_CREATIVE_FORMAT_INSTRUCTIONS.slice(1),
] as const;

function noodleCreativeFormatInstructions(allowRandomUsers: boolean): readonly string[] {
  return allowRandomUsers ? NOODLE_CREATIVE_FORMAT_INSTRUCTIONS : NOODLE_CHARACTER_ONLY_CREATIVE_FORMAT_INSTRUCTIONS;
}
/** Legacy single-line tone instruction, used when `enableEnhancedTimelineWriting` is off. */
const NOODLE_LEGACY_TONE_INSTRUCTION =
  "- Characters should act in character but like people posting online: funny, messy, indirect, petty, affectionate, dramatic, vulgar, or casual as fits them.";
const NOODLE_TONE_INSTRUCTIONS = [
  "- Characters post like real people online (funny, messy, indirect, petty, affectionate, dramatic, vulgar, or casual) — but which of these fits, and how much, must come from each character's own Personality/Description/Backstory below, not a default upbeat voice. Do not make every account sound equally enthusiastic, chatty, or friendly.",
  "- Before writing each account's posts/replies, briefly ground yourself in that account's stated personality traits (guarded, blunt, anxious, arrogant, deadpan, etc.) and let sentence length, punctuation, capitalization, and emoji use vary accordingly. A withdrawn or hostile character should not sound like an enthusiastic extrovert.",
] as const;
const NOODLE_CONGRUENCY_INSTRUCTION =
  "- Multiple active accounts may know each other from shared chats, prior Noodle posts, or each other's lore below. When it fits, have accounts react to, quote, subtweet, or argue with each other's posts in this same batch (via @handle mentions and targetTempId), not just post in isolation.";
const NOODLE_RANDOM_USER_TREATMENT_INSTRUCTION =
  "- Random user accounts are not characters. Treat them as ordinary fictional Noodle profiles that may follow, like, reply, repost, gossip, or casually join public drama.";
/**
 * Default text for the editable "Noodle Timeline Voice & Tone" prompt override
 * (registry/noodle.ts: NOODLE_TIMELINE_VOICE). Deliberately limited to tone and creative-freedom
 * instructions only — schema-critical output-format rules (structured action limits, target
 * field rules, handle preservation, persona authorship, adult platform policy, "Return JSON
 * only") stay hardcoded in buildRefreshPrompt() outside this override, so a user rewriting their
 * voice/tone text cannot accidentally break the noodleGeneratedRefreshSchema output contract.
 *
 * `enhanced` mirrors the Noodle setting `enableEnhancedTimelineWriting` (off by default): off
 * reproduces the original single-line tone instruction with no congruency instruction; on adds
 * the personality-grounding tone instructions and the cross-account congruency instruction. This
 * only affects the UNEDITED default — once a user customizes the override, their text is used
 * regardless of the setting.
 */
export function noodleTimelineVoiceDefaultText(enhanced: boolean, allowRandomUsers = true): string {
  return [
    ...(enhanced ? NOODLE_TONE_INSTRUCTIONS : [NOODLE_LEGACY_TONE_INSTRUCTION]),
    ...(allowRandomUsers ? [NOODLE_RANDOM_USER_TREATMENT_INSTRUCTION] : []),
    ...noodleCreativeFormatInstructions(allowRandomUsers),
    ...(enhanced ? [NOODLE_CONGRUENCY_INSTRUCTION] : []),
  ].join("\n");
}
