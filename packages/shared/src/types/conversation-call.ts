
type ConversationCallStatus = "ringing" | "active" | "ended" | "declined" | "missed";
type ConversationCallMode = "audio" | "video";
type ConversationCallInitiator = "user" | "character";
export type ConversationCallCharacterVideoClipKind = "idle" | "talking" | "laughing" | "angry" | "crying" | "sighing";
type ConversationCallCharacterVideoClipStatus = "missing" | "generating" | "ready" | "error";

export const CONVERSATION_CALL_CHARACTER_VIDEO_CLIP_KINDS: ConversationCallCharacterVideoClipKind[] = [
  "idle",
  "talking",
  "laughing",
  "angry",
  "crying",
  "sighing",
];

export interface ConversationCallSession {
  id: string;
  chatId: string;
  status: ConversationCallStatus;
  mode: ConversationCallMode;
  initiator: ConversationCallInitiator;
  initiatorCharacterId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}



interface ConversationCallCharacterVideoClip {
  kind: ConversationCallCharacterVideoClipKind;
  status: ConversationCallCharacterVideoClipStatus;
  url: string | null;
  error: string | null;
  updatedAt: string | null;
  origin?: "generated" | "uploaded";
  trimStartSeconds?: number | null;
  trimEndSeconds?: number | null;
}

interface ConversationCallCharacterVideoCustomClip {
  id: string;
  label: string;
  prompt: string;
  status: ConversationCallCharacterVideoClipStatus;
  url: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string | null;
  origin?: "generated" | "uploaded";
  trimStartSeconds?: number | null;
  trimEndSeconds?: number | null;
}

export interface ConversationCallCharacterVideoManifest {
  characterId: string;
  characterName: string;
  sourceAvatarPath: string | null;
  generating: boolean;
  updatedAt: string | null;
  clips: ConversationCallCharacterVideoClip[];
  customClips: ConversationCallCharacterVideoCustomClip[];
}
