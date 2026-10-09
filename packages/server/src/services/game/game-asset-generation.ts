// ──────────────────────────────────────────────
// Game: On-the-fly Asset Generation
//
// Generates NPC portraits and location backgrounds
// mid-game using the user's image generation connection.
// Called from the scene-wrap pipeline when
// `enableSpriteGeneration` is active.
// ──────────────────────────────────────────────

import { MAX_IMAGE_PROMPT_INSTRUCTIONS_LENGTH } from "@marinara-engine/shared";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { logger } from "../../lib/logger.js";
import { basename, join } from "path";
import { DATA_DIR } from "../../utils/data-dir.js";
import { generateImage, type ImageGenRequest, type ImageGenResult } from "../image/image-generation.js";
import { buildAssetManifest, GAME_ASSETS_DIR } from "./asset-manifest.service.js";
import type { PromptOverridesStorage } from "../storage/prompt-overrides.storage.js";
import {
  loadPrompt,
  GAME_NPC_PORTRAIT,
  GAME_BACKGROUND,
  MAPS_LOCATION_ARTWORK,
} from "../prompt-overrides/index.js";
import {
  type ImageGenerationDefaultsProfile,
  type ImageGenerationQuality,
  type ImageStyleProfileSettings,
  type SceneIllustrationCharacterPrompt,
} from "@marinara-engine/shared";
import type { ImageGenerationSize } from "../image/image-generation-settings.js";
import { compileImagePrompt } from "../image/image-prompt-compiler.js";

const NPC_AVATAR_DIR = join(DATA_DIR, "avatars", "npc");
const DEFAULT_GAME_BACKGROUND_SIZE: ImageGenerationSize = { width: 1280, height: 720 };
const DEFAULT_GAME_PORTRAIT_SIZE: ImageGenerationSize = { width: 1024, height: 1024 };
const GENERATED_GAME_BACKGROUND_EXTS = ["png", "jpg", "jpeg", "webp", "avif", "gif"] as const;
const GAME_BACKGROUND_EXT_SET = new Set<string>(GENERATED_GAME_BACKGROUND_EXTS);
const GENERATED_BACKGROUND_MAX_INPUT_PIXELS = 32_000_000;
const GAME_PORTRAIT_NEGATIVE_PROMPT =
  "text, letters, captions, subtitles, UI, watermark, logo, signature, speech bubble, split screen, panel, collage, contact sheet, grid, four portraits, multiple portraits, duplicated face, extra head, extra person, bad anatomy, low quality";
const GAME_BACKGROUND_NEGATIVE_PROMPT =
  "text, letters, captions, subtitles, UI, watermark, logo, signature, foreground character, main character, named character, portrait, close-up person, posed subject, split screen, panel, collage, contact sheet, grid, multiple frames, low quality";
const MAX_GENERATED_ASSET_SLUG_BYTES = 180;

// sharp is optional in the server package. Generated game backgrounds should be
// stored at the VN canvas ratio when possible, but generation must still work on
// platforms where sharp is unavailable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharpFn = any;
let _sharp: SharpFn | null = null;
let _sharpLoadFailed = false;

async function getSharp(): Promise<SharpFn | null> {
  if (_sharp) return _sharp;
  if (_sharpLoadFailed) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - optional native dependency
    const mod = await import("sharp");
    _sharp = (mod.default ?? mod) as SharpFn;
    return _sharp;
  } catch {
    _sharpLoadFailed = true;
    return null;
  }
}

type GameBackgroundImage = {
  buffer: Buffer;
  ext: string;
};


function atomicWriteBuffer(filePath: string, buffer: Buffer): void {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(tmpPath, buffer);
    renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }
}






/** Return the extension implied by known image file signatures. */
function detectImageExt(buffer: Buffer): string | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "gif";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
  }
  return null;
}

/** Prefer the actual encoded bytes, then fall back to provider metadata. */
function normalizeGeneratedImageExt(result: Pick<ImageGenResult, "mimeType" | "ext">, buffer: Buffer): string {
  const detectedExt = detectImageExt(buffer);
  if (detectedExt) return detectedExt;

  const ext = result.ext.trim().toLowerCase().replace(/^\./, "");
  if (GAME_BACKGROUND_EXT_SET.has(ext)) return ext === "jpeg" ? "jpg" : ext;

  const mime = result.mimeType.toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("avif")) return "avif";
  if (mime.includes("gif")) return "gif";
  return "png";
}

/** Resize generated backgrounds through sharp when available, preserving original format otherwise. */
async function gameBackgroundImage(result: ImageGenResult, size: ImageGenerationSize): Promise<GameBackgroundImage> {
  const input = Buffer.from(result.base64, "base64");
  const sharp = await getSharp();
  if (!sharp) return { buffer: input, ext: normalizeGeneratedImageExt(result, input) };
  try {
    const buffer = await sharp(input, {
      limitInputPixels: GENERATED_BACKGROUND_MAX_INPUT_PIXELS,
      failOn: "warning",
    })
      .resize(size.width, size.height, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    return { buffer, ext: "png" };
  } catch (err) {
    logger.warn(err, "[game-asset-gen] Failed to resize generated game background; saving original image");
    return { buffer: input, ext: normalizeGeneratedImageExt(result, input) };
  }
}

/** Build the generated game background file path for a slug and extension. */
function generatedBackgroundPath(targetDir: string, slug: string, ext: string): string {
  return join(targetDir, `${slug}.${ext}`);
}

/** Find an existing generated background regardless of the saved image format. */
function existingGeneratedBackgroundPath(targetDir: string, slug: string): string | null {
  for (const ext of GENERATED_GAME_BACKGROUND_EXTS) {
    const candidate = generatedBackgroundPath(targetDir, slug, ext);
    if (isUsableGeneratedImagePath(candidate)) return candidate;
  }
  return null;
}

function existingGeneratedPortraitPath(targetDir: string, slug: string): string | null {
  for (const ext of GENERATED_GAME_BACKGROUND_EXTS) {
    const candidate = join(targetDir, `${slug}.${ext}`);
    if (isUsableGeneratedImagePath(candidate)) return candidate;
  }
  return null;
}

function isUsableGeneratedImagePath(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) return false;
    const stat = statSync(filePath);
    if (!stat.isFile() || stat.size <= 0) return false;
    return detectImageExt(readFileSync(filePath)) !== null;
  } catch {
    return false;
  }
}




export function readAvatarBase64(avatarPath: string | null | undefined): string | undefined {
  if (!avatarPath) return undefined;
  const cleanAvatarPath = avatarPath.split("?")[0] ?? avatarPath;
  const parts = cleanAvatarPath.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part.includes("\\"))) return undefined;

  let diskPath: string | null = null;
  if (cleanAvatarPath.startsWith("/api/avatars/file/")) {
    const filename = parts.at(-1);
    if (filename) diskPath = join(DATA_DIR, "avatars", filename);
  } else if (cleanAvatarPath.startsWith("/api/avatars/npc/")) {
    const chatId = parts.at(-2);
    const filename = parts.at(-1);
    if (chatId && filename) diskPath = join(DATA_DIR, "avatars", "npc", chatId, filename);
  } else if (cleanAvatarPath.startsWith("avatars/")) {
    diskPath = join(DATA_DIR, ...parts);
  }

  if (!diskPath) return undefined;
  try {
    if (!existsSync(diskPath)) return undefined;
    return readFileSync(diskPath).toString("base64");
  } catch {
    return undefined;
  }
}

/** Sanitise a name into a safe filesystem slug. */
function safeName(name: string): string {
  const trimmed = name.trim();
  const slug = trimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (slug || !trimmed) return slug;
  return `asset-${createHash("sha256").update(trimmed).digest("hex").slice(0, 8)}`;
}

function truncateSlugByBytes(slug: string, maxBytes: number): string {
  let truncated = slug;
  while (Buffer.byteLength(truncated, "utf8") > maxBytes) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.replace(/-+$/g, "");
}

function safeGeneratedAssetSlug(name: string, opts: { maxBytes?: number; suffix?: string } = {}): string {
  const maxBytes = opts.maxBytes ?? MAX_GENERATED_ASSET_SLUG_BYTES;
  const slug = safeName(name) || "asset";
  const suffix = opts.suffix ? safeName(opts.suffix) : "";
  const candidate = suffix ? `${slug}-${suffix}` : slug;
  if (Buffer.byteLength(candidate, "utf8") <= maxBytes) return candidate;

  const hash = createHash("sha256").update(slug).digest("hex").slice(0, 8);
  const tail = [hash, suffix].filter(Boolean).join("-");
  const prefixBudget = Math.max(1, maxBytes - Buffer.byteLength(tail, "utf8") - 1);
  const prefix = truncateSlugByBytes(slug, prefixBudget) || "asset";
  return `${prefix}-${tail}`;
}

function npcPortraitSlug(req: NpcPortraitRequest): string {
  const identityHash = createHash("sha256")
    .update([req.npcName, req.appearance, req.gender ?? "", req.pronouns ?? ""].join("\n"))
    .digest("hex")
    .slice(0, 8);
  return safeGeneratedAssetSlug(req.npcName, {
    maxBytes: 160,
    suffix: identityHash,
  });
}

function deriveExplicitNonHumanCue(value: string): string | null {
  const match = value.match(
    /\b(?:xenomorph|extraterrestrial|alien|biomechanical|insectoid|reptilian|avian|amphibian|android|robot|synth(?:etic)?|animal|cat|kitten|dog|puppy|wolf|fox|bird|raven|crow|owl|horse|deer|rabbit|rat|mouse|snake|lizard|dragon|beast|creature|monster|spirit|ghost|construct|golem|doll|object|statue|mascot|non[-\s]?human|anthropomorphic|feral|quadruped)\b/i,
  );
  if (!match?.[0]) return null;
  const cue = match[0].toLowerCase().replace(/\s+/g, "-");
  return cue === "non-human" || cue === "nonhuman" ? "non-human creature" : cue;
}

function normalizeNpcGenderCue(gender: string | null | undefined, pronouns: string | null | undefined, text: string) {
  const explicit = `${gender ?? ""} ${pronouns ?? ""}`.toLowerCase();
  if (/\b(?:non[-\s]?binary|enby|androgynous|genderless|agender|they\/them)\b/.test(explicit)) {
    return "androgynous";
  }
  if (/\b(?:female|woman|girl|lady|feminine|she\/her|she|her)\b/.test(explicit)) return "female";
  if (/\b(?:male|man|boy|gentleman|masculine|he\/him|he|him|his)\b/.test(explicit)) return "male";

  const lower = text.toLowerCase();
  if (/\b(?:non[-\s]?binary|enby|androgynous|genderless|agender)\b/.test(lower)) return "androgynous";
  if (/\b(?:she|her|hers|woman|female|girl|lady)\b/.test(lower)) return "female";
  if (/\b(?:he|him|his|man|male|boy|gentleman)\b/.test(lower)) return "male";
  return null;
}

function deriveNpcAgeCue(text: string): string | null {
  const lower = text.toLowerCase();
  const decade = lower.match(/\b(?:early|mid|late)\s+(?:twenties|thirties|forties|fifties|sixties)\b/);
  if (decade?.[0]) return decade[0];
  const ageLabel = lower.match(/\b(?:young adult|middle[-\s]aged|elderly|senior|adult|teen(?:ager)?|child|kid)\b/);
  if (ageLabel?.[0]) return ageLabel[0].replace(/\s+/, " ");

  const adultMilestones = [
    /\b(?:owner|employee|business|agency|rent|debt|pay off|mercenary work|adventuring guilds?)\b/,
    /\b(?:joined the army|basic training|deployed|shipped off|fight in the war|crew)\b/,
    /\b(?:high\s*school dropout|expelled|academy|final exam)\b/,
    /\b(?:refugee|moved to|save enough money|opened)\b/,
  ];
  const score = adultMilestones.reduce((count, pattern) => count + (pattern.test(lower) ? 1 : 0), 0);
  return score >= 2 ? "young adult" : null;
}

function normalizeVisualTag(value: string): string | null {
  const tag = value
    .toLowerCase()
    .replace(/\b(?:her|his|their|the|a|an|with|has|have|having|is|are|was|were)\b/g, " ")
    .replace(/[^a-z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!tag || tag.length > 48) return null;
  if (/\b(?:someone|something|nothing|thing|person|people|room|scene)\b/.test(tag)) return null;
  return tag;
}

function addUniqueVisualTag(tags: string[], value: string | null | undefined): void {
  const tag = value ? normalizeVisualTag(value) : null;
  if (!tag || tags.some((existing) => existing.toLowerCase() === tag)) return;
  tags.push(tag);
}

function collectNpcVisualAttributeTags(text: string): string[] {
  const tags: string[] = [];
  const clean = text.replace(/\s+/g, " ");
  const nounPattern =
    /\b((?:short|long|curly|wavy|straight|messy|neat|dark|light|pale|bright|piercing|deep|warm|cool|grey|gray|blue|green|hazel|brown|black|blonde|blond|auburn|red|white|silver|golden|olive|tan|tanned|fair|freckled|weathered)(?:[-\s]+[a-z]+){0,4}\s+(?:hair|eyes|skin))\b/gi;
  for (const match of clean.matchAll(nounPattern)) {
    addUniqueVisualTag(tags, match[1]);
  }

  const eyesArePattern =
    /\beyes?\s+(?:are|is|were|was)\s+(?:a\s+|an\s+)?((?:piercing|bright|deep|pale|dark|light|grey|gray|blue|green|hazel|brown|black|amber)(?:[-\s]+[a-z]+){0,3})\b/gi;
  for (const match of clean.matchAll(eyesArePattern)) {
    addUniqueVisualTag(tags, `${match[1]} eyes`);
  }

  const skinPattern =
    /\b(?:skin|complexion)\s+(?:is|are|was|were)?\s*(?:a\s+|an\s+)?((?:pale|fair|tan|tanned|olive|brown|dark|light|warm|cool|freckled|weathered)(?:[-\s]+[a-z]+){0,3})\b/gi;
  for (const match of clean.matchAll(skinPattern)) {
    addUniqueVisualTag(tags, `${match[1]} skin`);
  }

  return tags.slice(0, 4);
}

function buildNpcAppearanceLine(req: NpcPortraitRequest, nonHumanCue: string | null): string {
  const context = req.appearance.trim();
  if (nonHumanCue && !context) return `Appearance: ${nonHumanCue}.`;

  const identityTags: string[] = [];
  if (nonHumanCue) {
    identityTags.push(nonHumanCue);
  } else {
    identityTags.push(deriveNpcAgeCue(context) ?? "adult");
    identityTags.push(normalizeNpcGenderCue(req.gender, req.pronouns, context) ?? "androgynous");
    identityTags.push("human or humanoid person");
  }
  identityTags.push(...collectNpcVisualAttributeTags(context));

  const identityLine = identityTags.length > 0 ? `Appearance: ${identityTags.join(", ")}.` : "";
  if (!context) return identityLine || "Appearance: human or humanoid adult.";
  return `${identityLine} Required canonical NPC visual profile from the GM-created game state: ${context}. Use these traits as the subject identity.`.trim();
}

function npcPortraitVariables(req: NpcPortraitRequest) {
  const context = req.appearance.trim();
  const nonHumanCue = deriveExplicitNonHumanCue(`${req.npcName} ${context}`);
  return {
    npcName: req.npcName,
    appearanceLine: buildNpcAppearanceLine(req, nonHumanCue),
    nonHumanRule: nonHumanCue
      ? "The description explicitly indicates a non-human subject. Preserve that exact species, body plan, age category, and silhouette; do not turn it into a human or kemonomimi character unless the description says humanoid."
      : "Unless the description explicitly says otherwise, depict this NPC as a human or humanoid person. Do not infer an animal species from the name, mood, speech verbs, or setting.",
    artStyleLine: req.artStyle ? `Art style: ${req.artStyle}.` : "",
    compositionRule: nonHumanCue
      ? "Use a centered avatar composition appropriate to the subject, including a creature portrait or full head-and-body crop only when that best preserves the described non-human form."
      : "Use a centered human/humanoid avatar composition: face and shoulders, readable expression, clear outfit cues.",
  };
}

function resolvedSize(size: ImageGenerationSize | undefined, fallback: ImageGenerationSize): ImageGenerationSize {
  return {
    width: size?.width ?? fallback.width,
    height: size?.height ?? fallback.height,
  };
}

// ── NPC Portrait Generation ──

interface NpcPortraitRequest {
  chatId: string;
  npcName: string;
  appearance: string;
  gender?: string | null;
  pronouns?: string | null;
  /** Unified art style prompt for visual consistency. */
  artStyle?: string;
  /** Connection credentials — already resolved & decrypted. */
  imgSource?: string | null;
  imgModel: string;
  imgBaseUrl: string;
  imgApiKey: string;
  imgService?: string | null;
  imgEndpointId?: string | null;
  imgComfyWorkflow?: string | undefined;
  imgDefaults?: ImageGenerationDefaultsProfile | null;
  imgQuality?: ImageGenerationQuality;
  imgFallback?: ImageGenRequest["fallback"];
  styleProfiles?: ImageStyleProfileSettings;
  styleProfileId?: string | null;
  debugLog?: (message: string, ...args: any[]) => void;
  /** Storage for user-supplied prompt overrides. Optional — falls back to default builder when omitted. */
  promptOverridesStorage?: PromptOverridesStorage;
  /** Optional LLM prompt director used to rewrite the deterministic prompt before provider submission. */
  dynamicPromptGenerator?: GameDynamicImagePromptGenerator;
  size?: ImageGenerationSize;
  promptOverride?: string;
  negativePromptOverride?: string;
  /** When true, overwrite an existing generated NPC portrait instead of reusing it. */
  force?: boolean;
  /** Optional request-scoped abort signal. */
  signal?: AbortSignal;
}

type CompiledGameImagePrompt = {
  prompt: string;
  negativePrompt: string;
};

type GameDynamicImagePromptKind = "portrait" | "background" | "illustration";

type GameDynamicImagePromptRequest = {
  kind: GameDynamicImagePromptKind;
  title: string;
  sourcePrompt: string;
  assetContext: string[];
  maxCharacters: number;
};

type GameDynamicImagePromptGenerator = (
  request: GameDynamicImagePromptRequest,
) => Promise<string | null | undefined>;

async function buildNpcPortraitRawPrompt(req: NpcPortraitRequest): Promise<string> {
  const vars = npcPortraitVariables(req);
  return req.promptOverridesStorage
    ? await loadPrompt(req.promptOverridesStorage, GAME_NPC_PORTRAIT, vars)
    : GAME_NPC_PORTRAIT.defaultBuilder(vars);
}

async function buildNpcPortraitProviderPrompt(req: NpcPortraitRequest): Promise<CompiledGameImagePrompt> {
  if (req.promptOverride?.trim()) {
    return {
      prompt: req.promptOverride.trim(),
      negativePrompt: req.negativePromptOverride?.trim() || "",
    };
  }
  const sourcePrompt = await buildNpcPortraitRawPrompt(req);
  const prompt = await maybeGenerateDynamicGameImagePrompt(req.dynamicPromptGenerator, {
    kind: "portrait",
    title: req.npcName,
    sourcePrompt,
    maxCharacters: 1400,
    assetContext: [
      `NPC name: ${req.npcName}`,
      req.appearance ? `Appearance traits: ${req.appearance}` : "",
      req.gender ? `Gender: ${req.gender}` : "",
      req.pronouns ? `Pronouns: ${req.pronouns}` : "",
      req.artStyle ? `Art style: ${req.artStyle}` : "",
    ],
  });
  return compileGameImagePrompt(
    req.dynamicPromptGenerator ? { ...req, appearance: null, preserveFullSourcePrompt: true } : req,
    "portrait",
    prompt,
    1400,
    GAME_PORTRAIT_NEGATIVE_PROMPT,
  );
}

function compileGameImagePrompt(
  req: Pick<
    NpcPortraitRequest | BackgroundGenRequest | SceneIllustrationGenRequest,
    "styleProfiles" | "styleProfileId" | "imgDefaults" | "artStyle"
  > & {
    appearance?: string | null;
    preserveFullBackgroundPrompt?: boolean;
    preserveFullScenePrompt?: boolean;
    preserveFullSourcePrompt?: boolean;
    omitProfileStyleText?: boolean;
    omitProfileSubjectTags?: boolean;
  },
  kind: "portrait" | "background" | "illustration",
  prompt: string,
  maxLength: number,
  hardNegative?: string,
  negativePrompt?: string | null,
) {
  const canonicalAppearance = kind === "portrait" && typeof req.appearance === "string" ? req.appearance.trim() : "";
  const protectedCanonicalAppearance = canonicalAppearance.slice(0, 700);
  const canonicalPrefix = protectedCanonicalAppearance
    ? `Required canonical NPC visual profile: ${protectedCanonicalAppearance}`
    : "";
  if (!req.styleProfiles) {
    return {
      prompt: prependCanonicalAppearanceIfMissing(
        prompt,
        protectedCanonicalAppearance,
        canonicalPrefix,
        maxLength,
        ". ",
      ),
      negativePrompt: [negativePrompt, hardNegative].filter(Boolean).join(", "),
    };
  }
  if (
    req.preserveFullSourcePrompt ||
    ((kind === "illustration" || kind === "background") && req.preserveFullScenePrompt)
  ) {
    const compilePrefix = (dedupeAgainstPrompt: string) =>
      compileImagePrompt({
        kind,
        prompt: "",
        dedupeAgainstPrompt,
        negativePrompt,
        hardNegative,
        styleProfiles: req.styleProfiles!,
        styleProfileId: req.styleProfileId,
        imageDefaults: req.imgDefaults,
        generatedStyle: req.artStyle,
        applyPromptModeToSourcePrompt: false,
        omitProfileStyleText: req.omitProfileStyleText,
        omitProfileSubjectTags: req.omitProfileSubjectTags,
      });
    // The preliminary prefix determines how much preserved source text can actually fit.
    // Compare against only that guaranteed slice so truncation cannot remove the sole style copy.
    const preliminaryPrefix = compilePrefix(prompt);
    const preliminaryHeader = [canonicalPrefix, preliminaryPrefix.prompt].filter(Boolean).join(", ");
    const guaranteedSourceLength = Math.max(
      0,
      maxLength - preliminaryHeader.length - (preliminaryHeader && prompt.trim() ? 2 : 0),
    );
    const compiledPrefix = compilePrefix(prompt.trim().slice(0, guaranteedSourceLength));
    const protectedPrompt = [canonicalPrefix, compiledPrefix.prompt, prompt.trim()].filter(Boolean).join(", ");
    return {
      prompt: protectedPrompt.slice(0, maxLength),
      negativePrompt: compiledPrefix.negativePrompt,
    };
  }
  const compiled = compileImagePrompt({
    kind,
    prompt,
    negativePrompt,
    hardNegative,
    styleProfiles: req.styleProfiles,
    styleProfileId: req.styleProfileId,
    imageDefaults: req.imgDefaults,
    generatedStyle: req.artStyle,
    applyPromptModeToSourcePrompt:
      (kind === "background" && !req.preserveFullBackgroundPrompt) ||
      (kind === "illustration" && !req.preserveFullScenePrompt),
    omitProfileStyleText: req.omitProfileStyleText,
    omitProfileSubjectTags: req.omitProfileSubjectTags,
  });
  return {
    prompt: prependCanonicalAppearanceIfMissing(
      compiled.prompt,
      protectedCanonicalAppearance,
      canonicalPrefix,
      maxLength,
      ", ",
    ),
    negativePrompt: compiled.negativePrompt,
  };
}

function prependCanonicalAppearanceIfMissing(
  prompt: string,
  canonicalAppearance: string,
  canonicalPrefix: string,
  maxLength: number,
  separator: string,
): string {
  // Inspect the provider-visible slice. If identity is missing, rebuild from the original
  // prompt so prefixing still happens before the single final maxLength truncation.
  const truncatedPrompt = prompt.slice(0, maxLength);
  if (!canonicalPrefix || promptContainsCanonicalAppearance(truncatedPrompt, canonicalAppearance)) {
    return truncatedPrompt;
  }
  return [canonicalPrefix, prompt].filter(Boolean).join(separator).slice(0, maxLength);
}

function promptContainsCanonicalAppearance(prompt: string, canonicalAppearance: string): boolean {
  // Whole-word matching can still treat short or generic appearances as incidental matches;
  // changing this behavior trades duplicate suppression against identity preservation.
  const normalizedAppearance = normalizedPromptText(canonicalAppearance);
  if (!normalizedAppearance) return false;
  return ` ${normalizedPromptText(prompt)} `.includes(` ${normalizedAppearance} `);
}

function normalizedPromptText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

async function maybeGenerateDynamicGameImagePrompt(
  generator: GameDynamicImagePromptGenerator | undefined,
  request: GameDynamicImagePromptRequest,
): Promise<string> {
  if (!generator) return request.sourcePrompt;
  try {
    const generated = cleanDynamicGameImagePrompt(await generator(request), request.maxCharacters);
    if (!generated) throw new Error("Dynamic image prompt generation returned no usable prompt");
    return generated;
  } catch (err) {
    logger.warn(err, "[game-asset-gen] Dynamic image prompt generation failed");
    throw err;
  }
}

function cleanDynamicGameImagePrompt(value: string | null | undefined, maxCharacters: number): string | null {
  const clean = (value ?? "")
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length < 20) return null;
  return clean.slice(0, Math.max(1, maxCharacters)).trim() || null;
}

/**
 * Generate a single portrait for an NPC and save it to disk.
 * Returns the avatar URL path on success, or null on failure.
 */
export async function generateNpcPortrait(req: NpcPortraitRequest): Promise<string | null> {
  const slug = npcPortraitSlug(req);
  if (!slug) return null;

  const avatarDir = join(NPC_AVATAR_DIR, req.chatId);

  // Skip if already exists unless the caller explicitly asked for a fresh portrait.
  const existingPortraitPath = !req.force ? existingGeneratedPortraitPath(avatarDir, slug) : null;
  if (existingPortraitPath) {
    return `/api/avatars/npc/${req.chatId}/${basename(existingPortraitPath)}`;
  }

  const compiled = await buildNpcPortraitProviderPrompt(req);
  const prompt = compiled.prompt;
  const size = resolvedSize(req.size, DEFAULT_GAME_PORTRAIT_SIZE);
  req.debugLog?.(
    "[debug/game/image-generation] NPC portrait request name=%s model=%s source=%s size=%dx%d prompt:\n%s",
    req.npcName,
    req.imgModel,
    req.imgSource || req.imgService || "",
    size.width,
    size.height,
    prompt,
  );

  try {
    const result = await generateImage(
      req.imgModel,
      req.imgBaseUrl,
      req.imgApiKey,
      req.imgSource || req.imgService || "",
      {
        prompt,
        negativePrompt: compiled.negativePrompt || undefined,
        model: req.imgModel,
        width: size.width,
        height: size.height,
        imageEndpointId: req.imgEndpointId || undefined,
        comfyWorkflow: req.imgComfyWorkflow || undefined,
        imageDefaults: req.imgDefaults ?? undefined,
        quality: req.imgQuality,
        fallback: req.imgFallback,
        signal: req.signal,
      },
    );

    if (!existsSync(avatarDir)) mkdirSync(avatarDir, { recursive: true });
    const avatarBuffer = Buffer.from(result.base64, "base64");
    const ext = normalizeGeneratedImageExt(result, avatarBuffer);
    const avatarPath = join(avatarDir, `${slug}.${ext}`);
    atomicWriteBuffer(avatarPath, avatarBuffer);

    const url = `/api/avatars/npc/${req.chatId}/${slug}.${ext}`;
    req.debugLog?.(
      "[debug/game/image-generation] NPC portrait result name=%s bytes=%d url=%s",
      req.npcName,
      avatarBuffer.byteLength,
      url,
    );
    logger.info('[game-asset-gen] Generated NPC portrait for "%s" -> %s', req.npcName, url);
    return url;
  } catch (err) {
    logger.warn(err, '[game-asset-gen] Failed to generate portrait for "%s"', req.npcName);
    return null;
  }
}

// ── Background Generation ──

/** Map a game genre string to one of the canonical background folders. */
function genreToFolder(genre?: string): string {
  if (!genre) return "fantasy";
  const g = genre.toLowerCase();
  if (g.includes("sci") || g.includes("cyber") || g.includes("space") || g.includes("futur")) return "scifi";
  if (g.includes("modern") || g.includes("contemporary") || g.includes("urban") || g.includes("real")) return "modern";
  return "fantasy";
}

interface BackgroundGenRequest {
  chatId: string;
  /** Short slug for the location, e.g. "dark-forest-clearing" */
  locationSlug: string;
  /** Scene description used as the image prompt. */
  sceneDescription: string;
  /** The game's genre/setting/tone for style guidance. */
  genre?: string;
  setting?: string;
  /** Current tracked world-state location, used to keep generic scene prompts grounded. */
  currentLocation?: string | null;
  currentWeather?: string | null;
  currentTimeOfDay?: string | null;
  worldOverview?: string | null;
  /** Unified art style prompt for visual consistency. */
  artStyle?: string;
  /** Chat-level image instructions appended after the Maps or background scene prompt. */
  imagePromptInstructions?: string | null;
  /** Structured context for the dedicated global Maps location-artwork prompt override. */
  mapsArtworkContext?: MapsLocationArtworkContext;
  /** Connection credentials. */
  imgSource?: string | null;
  imgModel: string;
  imgBaseUrl: string;
  imgApiKey: string;
  imgService?: string | null;
  imgEndpointId?: string | null;
  imgComfyWorkflow?: string | undefined;
  imgDefaults?: ImageGenerationDefaultsProfile | null;
  imgQuality?: ImageGenerationQuality;
  imgFallback?: ImageGenRequest["fallback"];
  styleProfiles?: ImageStyleProfileSettings;
  styleProfileId?: string | null;
  debugLog?: (message: string, ...args: any[]) => void;
  /** Storage for user-supplied prompt overrides. Optional — falls back to default builder when omitted. */
  promptOverridesStorage?: PromptOverridesStorage;
  /** Optional LLM prompt director used to rewrite the deterministic prompt before provider submission. */
  dynamicPromptGenerator?: GameDynamicImagePromptGenerator;
  size?: ImageGenerationSize;
  promptOverride?: string;
  negativePromptOverride?: string;
  /** Preserve the complete background prompt instead of distilling it into tagged source cues. */
  preserveFullBackgroundPrompt?: boolean;
  /** Preserve a prompt-writer's complete scene description instead of distilling it into tagged cues. */
  preserveFullScenePrompt?: boolean;
  /** The scene description is already a provider-ready prompt and should not receive the generic background wrapper. */
  providerReadyPrompt?: boolean;
  /** The prompt-writing model already incorporated the selected style profile. */
  omitProfileStyleText?: boolean;
  /** The prompt writer already owns the selected output format and composition. */
  omitProfileSubjectTags?: boolean;
  /** When true, overwrite an existing generated background for this slug instead of reusing it. */
  force?: boolean;
  /** Optional request-scoped abort signal. */
  signal?: AbortSignal;
}

interface MapsLocationArtworkContext {
  locationName: string;
  locationDescription: string;
  locationType: string;
  parentLocationName: string;
  parentLocationDescription: string;
  locationPath: string;
  genre: string;
  campaignArtStyle: string;
  imageInstructions: string;
}


interface SceneIllustrationGenRequest {
  chatId: string;
  title?: string;
  prompt: string;
  reason?: string;
  characters?: string[];
  characterDescriptions?: string[];
  /** Ensure requested appearance notes survive a selected formatter that omits the appearance variable. */
  ensureCharacterAppearance?: boolean;
  slug?: string;
  genre?: string;
  setting?: string;
  artStyle?: string;
  /** Extra user instructions appended to scene illustration prompts. */
  imagePromptInstructions?: string;
  /** Use the Game-specific provider prompt wrapper. False keeps the scene prompt direct while preserving optional appearance notes. */
  useGamePromptTemplate?: boolean;
  referenceImages?: string[];
  /** The first attached reference image depicts the current Maps location. */
  locationReferenceImageAttached?: boolean;
  /** Structured named-character prompts for providers with native multi-character controls. */
  characterPrompts?: SceneIllustrationCharacterPrompt[];
  imgSource?: string | null;
  imgModel: string;
  imgBaseUrl: string;
  imgApiKey: string;
  imgService?: string | null;
  imgEndpointId?: string | null;
  imgComfyWorkflow?: string | undefined;
  imgDefaults?: ImageGenerationDefaultsProfile | null;
  imgQuality?: ImageGenerationQuality;
  imgFallback?: ImageGenRequest["fallback"];
  styleProfiles?: ImageStyleProfileSettings;
  styleProfileId?: string | null;
  debugLog?: (message: string, ...args: any[]) => void;
  /** Storage for user-supplied prompt overrides. Optional — falls back to default builder when omitted. */
  promptOverridesStorage?: PromptOverridesStorage;
  /** Optional LLM prompt director used to rewrite the deterministic prompt before provider submission. */
  dynamicPromptGenerator?: GameDynamicImagePromptGenerator;
  size?: ImageGenerationSize;
  promptOverride?: string;
  negativePromptOverride?: string;
  /** Receives the exact compiled prompt passed to the image provider. */
  onCompiledPrompt?: (compiled: CompiledGameImagePrompt) => void;
  /** Selected provider-facing storyboard image prompt template. */
  storyboardImagePromptTemplateId?: string | null;
  /** Chat-local provider-facing storyboard image prompt templates. */
  storyboardImagePromptTemplates?: unknown;
  /** Preserve the full generated scene prompt instead of distilling it into the selected tagged prompt grammar. */
  preserveFullScenePrompt?: boolean;
  /** Optional request-scoped abort signal. */
  signal?: AbortSignal;
}

async function buildBackgroundRawPrompt(req: BackgroundGenRequest): Promise<string> {
  if (req.mapsArtworkContext) {
    const context = req.mapsArtworkContext;
    const sentence = (value: string) => {
      const clean = value.trim();
      return !clean || /[.!?]$/u.test(clean) ? clean : `${clean}.`;
    };
    const variables = {
      ...context,
      locationPrompt: req.sceneDescription.trim(),
      genreLine: sentence(context.genre),
      campaignArtStyleLine: context.campaignArtStyle.trim()
        ? `Campaign art style: ${sentence(context.campaignArtStyle)}`
        : "",
      imageInstructionsLine: context.imageInstructions.trim()
        ? `User image instructions: ${context.imageInstructions.trim()}`
        : "",
    };
    return req.promptOverridesStorage
      ? await loadPrompt(req.promptOverridesStorage, MAPS_LOCATION_ARTWORK, variables)
      : MAPS_LOCATION_ARTWORK.defaultBuilder(variables);
  }
  if (req.providerReadyPrompt) return req.sceneDescription.trim();
  const styleHint = [req.artStyle, req.genre, req.setting].filter(Boolean).join(", ");
  const worldContext = buildBackgroundWorldContext(req);
  const groundedSceneDescription = [worldContext, req.sceneDescription].filter(Boolean).join(". ");
  const backgroundVars = {
    sceneDescription: groundedSceneDescription,
    styleLine: styleHint ? `Style: ${styleHint}.` : "",
  };
  const rawPrompt = req.promptOverridesStorage
    ? await loadPrompt(req.promptOverridesStorage, GAME_BACKGROUND, backgroundVars)
    : GAME_BACKGROUND.defaultBuilder(backgroundVars);
  const imagePromptInstructionsLine = req.imagePromptInstructions?.trim()
    ? `User image instructions: ${req.imagePromptInstructions.trim().replace(/\s+/g, " ").slice(0, MAX_IMAGE_PROMPT_INSTRUCTIONS_LENGTH)}`
    : "";
  return imagePromptInstructionsLine && !rawPrompt.includes(imagePromptInstructionsLine)
    ? `${rawPrompt}\n${imagePromptInstructionsLine}`
    : rawPrompt;
}

function buildBackgroundWorldContext(req: BackgroundGenRequest): string {
  const fragments = [
    req.genre,
    req.setting,
    req.currentLocation ? `location ${req.currentLocation}` : "",
    req.currentWeather ? `${req.currentWeather} weather` : "",
    req.currentTimeOfDay ? req.currentTimeOfDay : "",
    compactWorldOverview(req.worldOverview),
  ]
    .map((fragment) => cleanBackgroundContextFragment(fragment))
    .filter(Boolean);
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const fragment of fragments) {
    const key = fragment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(fragment);
  }
  return deduped.slice(0, 6).join(", ");
}

function compactWorldOverview(value: string | null | undefined): string {
  const clean = cleanBackgroundContextFragment(value);
  if (!clean) return "";
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0]?.trim() ?? clean;
  return firstSentence.split(/\s+/).slice(0, 18).join(" ");
}

function cleanBackgroundContextFragment(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[<>\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim()
    .slice(0, 180);
}

export async function buildBackgroundProviderPrompt(req: BackgroundGenRequest): Promise<CompiledGameImagePrompt> {
  if (req.promptOverride?.trim()) {
    return {
      prompt: req.promptOverride.trim(),
      negativePrompt: req.negativePromptOverride?.trim() || "",
    };
  }
  const sourcePrompt = await buildBackgroundRawPrompt(req);
  const prompt = await maybeGenerateDynamicGameImagePrompt(req.dynamicPromptGenerator, {
    kind: "background",
    title: req.locationSlug,
    sourcePrompt,
    maxCharacters: 1000,
    assetContext: [
      `Location slug: ${req.locationSlug}`,
      `Scene description: ${req.sceneDescription}`,
      req.genre ? `Genre: ${req.genre}` : "",
      req.setting ? `Setting: ${req.setting}` : "",
      req.currentLocation ? `Current location: ${req.currentLocation}` : "",
      req.currentWeather ? `Weather: ${req.currentWeather}` : "",
      req.currentTimeOfDay ? `Time of day: ${req.currentTimeOfDay}` : "",
      req.worldOverview ? `World overview: ${req.worldOverview}` : "",
      req.artStyle ? `Art style: ${req.artStyle}` : "",
      req.imagePromptInstructions ? `User image instructions: ${req.imagePromptInstructions}` : "",
    ],
  });
  return compileGameImagePrompt(
    req.dynamicPromptGenerator
      ? { ...req, artStyle: req.mapsArtworkContext ? undefined : req.artStyle, preserveFullSourcePrompt: true }
      : req.mapsArtworkContext
        ? { ...req, artStyle: undefined }
        : req,
    "background",
    prompt,
    req.preserveFullBackgroundPrompt || req.preserveFullScenePrompt ? 7000 : 1000,
    GAME_BACKGROUND_NEGATIVE_PROMPT,
  );
}









/**
 * Generate a background image for a game location and add it to the
 * asset manifest. Returns the asset tag on success, or null on failure.
 */
export async function generateBackground(req: BackgroundGenRequest): Promise<string | null> {
  const slug = safeGeneratedAssetSlug(req.locationSlug);
  if (!slug) return null;

  const subcategory = genreToFolder(req.genre);
  const targetDir = join(GAME_ASSETS_DIR, "backgrounds", subcategory);

  // Build asset tag: backgrounds:<category>:<slug>
  const tag = `backgrounds:${subcategory}:${slug}`;

  // Skip if already generated
  if (!req.force && existingGeneratedBackgroundPath(targetDir, slug)) {
    return tag;
  }

  const compiled = await buildBackgroundProviderPrompt(req);
  const prompt = compiled.prompt;
  const size = resolvedSize(req.size, DEFAULT_GAME_BACKGROUND_SIZE);
  req.debugLog?.(
    "[debug/game/image-generation] background request slug=%s model=%s source=%s targetSize=%dx%d prompt:\n%s",
    slug,
    req.imgModel,
    req.imgSource || req.imgService || "",
    size.width,
    size.height,
    prompt,
  );

  try {
    const result = await generateImage(
      req.imgModel,
      req.imgBaseUrl,
      req.imgApiKey,
      req.imgSource || req.imgService || "",
      {
        prompt,
        negativePrompt: compiled.negativePrompt || undefined,
        model: req.imgModel,
        width: size.width,
        height: size.height,
        imageEndpointId: req.imgEndpointId || undefined,
        comfyWorkflow: req.imgComfyWorkflow || undefined,
        imageDefaults: req.imgDefaults ?? undefined,
        quality: req.imgQuality,
        fallback: req.imgFallback,
        signal: req.signal,
      },
    );

    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
    const image = await gameBackgroundImage(result, size);
    const targetPath = generatedBackgroundPath(targetDir, slug, image.ext);
    atomicWriteBuffer(targetPath, image.buffer);

    // Rebuild manifest so the new tag is available immediately
    buildAssetManifest();

    logger.info('[game-asset-gen] Generated background "%s" -> tag: %s', slug, tag);
    req.debugLog?.(
      "[debug/game/image-generation] background result slug=%s bytes=%d tag=%s",
      slug,
      image.buffer.byteLength,
      tag,
    );
    return tag;
  } catch (err) {
    logger.warn(err, '[game-asset-gen] Failed to generate background "%s"', slug);
    return null;
  }
}
