// ──────────────────────────────────────────────
// Prompt Overrides — Public exports
// ──────────────────────────────────────────────
export { loadPrompt } from "./load-prompt.js";
export { renderTemplate, validateTemplate } from "./template.js";
export type { TemplateValidationResult } from "./template.js";
export {
  PROMPT_OVERRIDE_REGISTRY,
  CHARACTERS_REFERENCE_SHEET,
  GAME_NPC_PORTRAIT,
  GAME_BACKGROUND,
  MAPS_LOCATION_ARTWORK,
  GAME_SCENE_ILLUSTRATION,
  GAME_NARRATION_SUMMARIZER,
  GAME_VIDEO,
  ROLEPLAY_GALLERY_VIDEO_DIRECTOR,
  CONVERSATION_CALL_VIDEO_PROMPTS,
  CONVERSATION_CALL_CUSTOM_VIDEO_PROMPT,
  CONVERSATION_CALL_VIDEO_PROMPT_BY_KIND,
  CONVERSATION_CALL_VIDEO_CLIP_INSTRUCTION_BY_KIND,
  CONVERSATION_CALL_VIDEO_CLIP_LABEL_BY_KIND,
  CONVERSATION_SELFIE,
  getPromptOverrideDef,
  listPromptOverrideKeys,
} from "./registry.js";
export type {
  PromptOverrideKeyDef,
  PromptVariable,
  CharactersReferenceSheetCtx,
  GameNpcPortraitCtx,
  GameBackgroundCtx,
  MapsLocationArtworkCtx,
  GameSceneIllustrationCtx,
  GameNarrationSummarizerCtx,
  GameVideoCtx,
  RoleplayGalleryVideoDirectorCtx,
  ConversationCallCustomVideoClipCtx,
  ConversationCallVideoClipCtx,
  ConversationSelfieCtx,
} from "./registry.js";
