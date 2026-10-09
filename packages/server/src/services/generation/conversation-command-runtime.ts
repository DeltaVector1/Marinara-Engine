import { currentRoomGeneration, roomConversationCommandAllowed } from "../multiplayer/generation-policy.js";
import {
  BUILT_IN_AGENTS,
  CONVERSATION_COMMAND_AGENT_IDS,
  CONVERSATION_COMMAND_KEYS,
  type ChatMode,
  type ConversationCommandKey,
  type WrapFormat,
} from "@marinara-engine/shared";

import type { CharacterCommand } from "../conversation/character-commands.js";
import { wrapContent } from "../prompt/format-engine.js";
import { listCapabilityConversationCommandInstructions } from "../capability-packages/capability-command-registry.service.js";

type ChatRowForCommands = {
  id: string;
  mode?: string | null;
  name?: string | null;
  characterIds?: unknown;
};

type CharacterRowForCommands = {
  data?: unknown;
};

type ConversationCommandsChatsStore = {
  list(): Promise<ChatRowForCommands[]>;
};

type ConversationCommandsCharactersStore = {
  getById(id: string): Promise<CharacterRowForCommands | null>;
};

export function readConversationCommandToggles(
  metadata: Record<string, unknown>,
): Partial<Record<ConversationCommandKey, boolean>> {
  const raw = metadata.conversationCommandToggles;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const toggles: Partial<Record<ConversationCommandKey, boolean>> = {};
  for (const key of CONVERSATION_COMMAND_KEYS) {
    if (typeof source[key] === "boolean") toggles[key] = source[key] as boolean;
  }
  return toggles;
}

export function isConversationCommandEnabled(metadata: Record<string, unknown>, key: ConversationCommandKey): boolean {
  return roomConversationCommandAllowed(key) && readConversationCommandToggles(metadata)[key] !== false;
}

function getConversationCommandKey(command: CharacterCommand): ConversationCommandKey | null {
  switch (command.type) {
    case "schedule_update":
      return "schedule_update";
    case "cross_post":
      return "cross_post";
    case "selfie":
      return "selfie";
    case "memory":
      return "memory";
    case "scene":
      return "scene";
    case "call":
      return "call";
    case "influence":
      return "influence";
    case "note":
      return "note";
    case "react":
      return "react";
    default:
      return null;
  }
}

function isConversationCommandAvailable(key: ConversationCommandKey): boolean {
  const packageAgentId = CONVERSATION_COMMAND_AGENT_IDS[key];
  return !packageAgentId || BUILT_IN_AGENTS.some((agent) => agent.id === packageAgentId);
}

export function filterEnabledConversationCommands(
  commands: CharacterCommand[],
  metadata: Record<string, unknown>,
): CharacterCommand[] {
  return commands.filter((command) => {
    if (!roomConversationCommandAllowed(command.type)) return false;
    const key = getConversationCommandKey(command);
    return key === null || (isConversationCommandAvailable(key) && isConversationCommandEnabled(metadata, key));
  });
}


export async function buildConversationCommandsReminder(args: {
  enabled: boolean;
  chatMode: ChatMode;
  chatMeta: Record<string, unknown>;
  characterIds: string[];
  personaName: string;
  chatId: string;
  chats: ConversationCommandsChatsStore;
  chars: ConversationCommandsCharactersStore;
  wrapFormat: WrapFormat;
  resolvePromptMacros: (value: string) => string;
}): Promise<string | null> {
  if (!args.enabled) return null;
  const { chatMeta, chatMode, characterIds, personaName } = args;
  const scheduleCommandEnabled = isConversationCommandEnabled(chatMeta, "schedule_update");
  const crossPostCommandEnabled = isConversationCommandEnabled(chatMeta, "cross_post");
  const selfieCommandEnabled =
    isConversationCommandAvailable("selfie") && isConversationCommandEnabled(chatMeta, "selfie");
  const memoryCommandEnabled = isConversationCommandEnabled(chatMeta, "memory");
  const sceneCommandEnabled = isConversationCommandEnabled(chatMeta, "scene");
  const reactCommandEnabled = isConversationCommandEnabled(chatMeta, "react");
  const callCommandEnabled = isConversationCommandAvailable("call") && isConversationCommandEnabled(chatMeta, "call");

  // Discover other chats this character is in (for cross_post targets + memory targets)
  const allChatsForCrossPost = currentRoomGeneration() ? [] : await args.chats.list();
  const crossPostTargets: string[] = [];
  const memoryTargetCharIds = new Set<string>();
  for (const c of allChatsForCrossPost) {
    if (c.id === args.chatId || c.mode !== "conversation") continue;
    const cCharIds: string[] =
      typeof c.characterIds === "string" ? JSON.parse(c.characterIds as string) : (c.characterIds as string[]);
    if (characterIds.some((id) => cCharIds.includes(id))) {
      crossPostTargets.push(c.name || c.id);
      // Collect character IDs from shared group chats (groups = 2+ characters)
      if (cCharIds.length > 1) {
        for (const id of cCharIds) {
          if (!characterIds.includes(id)) memoryTargetCharIds.add(id);
        }
      }
    }
  }
  // Also check if the CURRENT chat is a group: characters in this chat can target each other
  if (characterIds.length > 1) {
    for (const id of characterIds) memoryTargetCharIds.add(id);
  }

  // Resolve memory target names
  const memoryTargetNames: string[] = [];
  for (const tid of memoryTargetCharIds) {
    const tRow = await args.chars.getById(tid);
    if (tRow) {
      const tData = JSON.parse(tRow.data as string);
      if (tData.name) memoryTargetNames.push(tData.name);
    }
  }

  // Check if selfie is enabled for this chat (user picked an image gen connection)
  const hasImageGen = !!chatMeta.imageGenConnectionId;

  const commandLines: string[] = [
    `Here are your optional, hidden commands you may use if you wish to, but only when they genuinely fit the conversation:`,
    ``,
  ];
  let availableCommandCount = 0;
  const addCommandLines = (...lines: string[]) => {
    commandLines.push(...lines, ``);
    availableCommandCount += 1;
  };

  if (scheduleCommandEnabled) {
    addCommandLines(
      `- [schedule_update: status="online|idle|dnd|offline", activity="activity name", duration="number of hours (e.g., 1h)"] - only if you change your own status/activity, for example, if the user asks you to stop what you're doing or if you decide to change them yourself.`,
    );
  }

  if (reactCommandEnabled) {
    addCommandLines(
      `- [react: emoji="😂"] or [react: emoji=":name:"] — if you want to react to the user's message, send it in its own line, using any standard emoji, or a custom one. It posts as a small emoji on their message, the way you'd react in a chat app. You can also react to another character instead by adding their name: [react: emoji="🙄" to "Character Name"]. Use it only when it genuinely fits how your character feels in the moment; it is optional, may stand alone or sit alongside your reply, and choosing a flat reaction or none at all is itself a valid choice.`,
    );
  }

  if (crossPostCommandEnabled && crossPostTargets.length > 0) {
    addCommandLines(
      `- [cross_post: target="${crossPostTargets.map((t) => `"${t}"`).join("|")}"] - if you want to redirect your message to a different chat. Use this when the user suggests you say something in another chat, or when it makes sense to message someone else.`,
      ` Example: ${personaName} says "maybe ask about that in the group chat?" → You respond: [cross_post: target="${crossPostTargets[0] ?? "group chat"}"] Hey guys, does anyone know about…`,
    );
  }

  if (selfieCommandEnabled && hasImageGen) {
    addCommandLines(
      `- [selfie] or [selfie: context="description of what the selfie shows"] - you send a photo of yourself. Use this when the user asks for a selfie, photo, or pic, or when you want to share what you look like right now.`,
      `   If you say you are sending, sharing, taking, or attaching a selfie/photo/pic, include [selfie] in that same response. Do not only narrate the action.`,
    );
  }

  // Memory command: only available when there are valid targets (characters in shared group chats)
  if (memoryCommandEnabled && memoryTargetNames.length > 0) {
    addCommandLines(
      `- [memory: target="${memoryTargetNames.map((n) => `"${n}"`).join("|")}", summary="brief description of what happened"] - create a memory that another character will remember. Use this when something notable happens between you and another character that they would naturally remember (e.g., shared a meal, had an argument, made plans). Don't overuse this; only for genuinely memorable moments.`,
      `   Example: [memory: target="${memoryTargetNames[0]}", summary="watched a movie together and argued about the ending"]`,
    );
  }

  // Scene command: only in conversation mode
  if (sceneCommandEnabled && chatMode === "conversation") {
    addCommandLines(
      `- [scene: scenario="brief description of what happens in this scene", background="place"] - request a mini-roleplay scene branching from this conversation. The user will be asked for POV, tense, and optional prompt wishes before the system plans and creates the scene.`,
      `   Example: You agree to go stargazing → include [scene: scenario="lying on a blanket in the park, looking at the stars together", background="park"]`,
      `   WHEN TO USE: You SHOULD proactively trigger a scene whenever the conversation naturally leads to an activity, outing, or situation that would be more immersive as a scene. Examples:`,
      `   - {{user}} says "I'm coming over" or "Let's go to the park" → trigger a scene for arriving/being at that location.`,
      `   - You invite {{user}} somewhere and they accept → trigger a scene for that activity.`,
      `   - A plan is made (date, trip, hangout, confrontation) and the moment arrives → trigger a scene.`,
      `   - Do NOT wait for {{user}} to explicitly ask for a scene. If the conversation implies you and {{user}} are about to DO something together, initiate the scene yourself.`,
    );
  }

  if (callCommandEnabled && chatMode === "conversation") {
    addCommandLines(
      `- [call], [call: reason="brief reason"], or [call: reason="brief reason", greeting="first thing to say after ${personaName} answers"] - ring ${personaName} for an audio call. Use this only when a live call naturally fits, such as when you urgently want to talk, when typing is awkward, or when ${personaName} asks you to call. The system will show an incoming call request; do not assume it was answered unless the call starts. If you include greeting, it will play only after ${personaName} accepts.`,
    );
  }

  const capabilityCommandLines = listCapabilityConversationCommandInstructions();
  if (capabilityCommandLines.length > 0) addCommandLines(...capabilityCommandLines);

  if (availableCommandCount === 0) return null;
  commandLines.push(
    `IMPORTANT: Commands are stripped from your message before the user sees it. The rest of your message is shown normally. You can include multiple commands in one message, but you do not need to use any of them unless it makes sense in context.`,
  );

  return wrapContent(args.resolvePromptMacros(commandLines.join("\n")), "commands", args.wrapFormat);
}
