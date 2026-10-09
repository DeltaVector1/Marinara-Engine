// ──────────────────────────────────────────────
// Routes: Character Sprite Upload, List & Serving
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { normalizeSpriteExpressionLabel } from "@marinara-engine/shared";
import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync, readFileSync } from "fs";
import { randomUUID } from "crypto";
import { writeFile, mkdir, unlink, copyFile, rm, rename } from "fs/promises";
import { extname, join } from "path";
import { DATA_DIR } from "../utils/data-dir.js";
import {
  getBackgroundRemoverStatus,
  tryRemoveBackgroundWithBackgroundRemover,
} from "../services/image/background-remover.service.js";
import { removeUniformSpriteBackgroundPng } from "../services/image/sprite-background.service.js";
import { clampByte, clampUnit, getSharp, type RgbColor } from "../services/image/sharp-runtime.js";
import { logger } from "../lib/logger.js";
import { SPRITE_RENAME_RATE_LIMIT } from "../middleware/rate-limit.js";
import { assertInsideDir } from "../utils/security.js";
import { sendValidatedMediaFile, validateImageAssetFile } from "../utils/media-file-security.js";
const spriteRenameQueues = new Map<string, Promise<void>>();

async function withSpriteRenameLock<T>(characterId: string, operation: () => Promise<T>): Promise<T> {
  const previous = spriteRenameQueues.get(characterId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queuedTail = previous.then(() => current);
  spriteRenameQueues.set(characterId, queuedTail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (spriteRenameQueues.get(characterId) === queuedTail) spriteRenameQueues.delete(characterId);
  }
}

async function getSpriteCapabilities() {
  try {
    await getSharp();
    return {
      imageProcessingAvailable: true,
      backgroundRemovalAvailable: true,
      reason: null as string | null,
    };
  } catch (error) {
    return {
      imageProcessingAvailable: false,
      backgroundRemovalAvailable: false,
      reason: error instanceof Error ? error.message : "Image processing is unavailable on this platform.",
    };
  }
}
const SPRITES_ROOT = join(DATA_DIR, "sprites");
const SPRITE_FILE_RE = /\.(png|jpg|jpeg|gif|webp|avif|svg)$/i;
const CLEANUP_INPUT_FILE_RE = /\.(png|jpg|jpeg|webp|avif)$/i;
const SPRITE_EXPORT_NAME_RE = /[^a-z0-9._ -]+/gi;
type SpriteCleanupEngine = "auto" | "backgroundremover" | "builtin";
type UsedSpriteCleanupEngine = "backgroundremover" | "builtin";

interface SpriteCleanupBackupEntry {
  expression: string;
  originalFilename: string;
  cleanedFilename: string;
  backupFilename: string;
}

interface SpriteCleanupBackupManifest {
  id: string;
  createdAt: string;
  entries: SpriteCleanupBackupEntry[];
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function normalizeSpriteExpression(raw: string): string {
  return normalizeSpriteExpressionLabel(raw, { fullBody: /^\s*full[_\s-]+/iu.test(raw) });
}

function sanitizeSpriteExportName(raw: unknown, fallback: string): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  const normalized = value.replace(/[\\/]/g, "_").replace(SPRITE_EXPORT_NAME_RE, "_").replace(/\s+/g, " ").trim();
  let start = 0;
  let end = normalized.length;
  const isUnsafeEdge = (character: string | undefined) =>
    character === "." || character === "_" || character === "-" || character?.trim() === "";
  while (start < end && isUnsafeEdge(normalized[start])) start++;
  while (end > start && isUnsafeEdge(normalized[end - 1])) end--;
  const sanitized = normalized.slice(start, end);
  return sanitized || fallback;
}

function normalizeSpriteCleanupEngine(raw: unknown): SpriteCleanupEngine {
  if (typeof raw !== "string") return "auto";
  const value = raw.trim().toLowerCase();
  if (value === "backgroundremover" || value === "background-remover" || value === "ai") return "backgroundremover";
  if (value === "builtin" || value === "built-in" || value === "matte" || value === "white") return "builtin";
  return "auto";
}

function isSafeBackupId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]+$/i.test(value) && !value.includes("..");
}

function listSpriteInfos(characterId: string) {
  const dir = join(SPRITES_ROOT, characterId);
  ensureDir(dir);

  try {
    return readdirSync(dir)
      .filter((f) => SPRITE_FILE_RE.test(f))
      .map((f) => {
        const ext = extname(f);
        const expression = f.slice(0, -ext.length);
        const mtime = statSync(join(dir, f)).mtimeMs;
        return {
          expression,
          filename: f,
          url: `/api/sprites/${characterId}/file/${encodeURIComponent(f)}?v=${Math.floor(mtime)}`,
        };
      });
  } catch {
    return [];
  }
}
function rgbLuma(color: RgbColor): number {
  return color.red * 0.2126 + color.green * 0.7152 + color.blue * 0.0722;
}

function rgbSpread(color: RgbColor): number {
  return Math.max(color.red, color.green, color.blue) - Math.min(color.red, color.green, color.blue);
}

async function softenBackgroundRemoverMask(
  originalInput: Buffer,
  aiOutput: Buffer,
  cleanupStrength = 35,
): Promise<Buffer> {
  const strength = Math.max(0, Math.min(100, cleanupStrength));
  if (strength >= 99) return aiOutput;

  const sharp = await getSharp();
  const original = await sharp(originalInput).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!original.info.width || !original.info.height) return aiOutput;

  const width = original.info.width;
  const height = original.info.height;
  const pixelCount = width * height;
  const originalRgba = Buffer.from(original.data);
  const originalChannels = original.info.channels;
  const ai = await sharp(aiOutput)
    .ensureAlpha()
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const outputRgba = Buffer.from(ai.data);
  const outputChannels = ai.info.channels;
  const transparentAlpha = 16 + ((100 - strength) / 100) * 18;
  const backgroundMask = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const originalOffset = (pixelIndex: number) => pixelIndex * originalChannels;
  const outputOffset = (pixelIndex: number) => pixelIndex * outputChannels;
  const outputAlpha = (pixelIndex: number) => outputRgba[outputOffset(pixelIndex) + 3] ?? 255;
  const isOutputTransparent = (pixelIndex: number) => outputAlpha(pixelIndex) <= transparentAlpha;

  const markBackground = (pixelIndex: number) => {
    if (backgroundMask[pixelIndex] || !isOutputTransparent(pixelIndex)) return;
    backgroundMask[pixelIndex] = 1;
    queue[queueEnd++] = pixelIndex;
  };

  for (let xPos = 0; xPos < width; xPos++) {
    markBackground(xPos);
    markBackground((height - 1) * width + xPos);
  }
  for (let yPos = 0; yPos < height; yPos++) {
    markBackground(yPos * width);
    markBackground(yPos * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart++]!;
    const xPos = pixelIndex % width;
    const yPos = Math.floor(pixelIndex / width);
    if (xPos > 0) markBackground(pixelIndex - 1);
    if (xPos < width - 1) markBackground(pixelIndex + 1);
    if (yPos > 0) markBackground(pixelIndex - width);
    if (yPos < height - 1) markBackground(pixelIndex + width);
  }

  const hasForegroundNeighbor = (pixelIndex: number): boolean => {
    const xPos = pixelIndex % width;
    const yPos = Math.floor(pixelIndex / width);
    for (let yOffset = -2; yOffset <= 2; yOffset++) {
      const sampleY = yPos + yOffset;
      if (sampleY < 0 || sampleY >= height) continue;
      for (let xOffset = -2; xOffset <= 2; xOffset++) {
        if (xOffset === 0 && yOffset === 0) continue;
        const sampleX = xPos + xOffset;
        if (sampleX < 0 || sampleX >= width) continue;
        if (outputAlpha(sampleY * width + sampleX) >= 168) return true;
      }
    }
    return false;
  };

  const hasOriginalDetailNeighbor = (pixelIndex: number): boolean => {
    const xPos = pixelIndex % width;
    const yPos = Math.floor(pixelIndex / width);
    for (let yOffset = -2; yOffset <= 2; yOffset++) {
      const sampleY = yPos + yOffset;
      if (sampleY < 0 || sampleY >= height) continue;
      for (let xOffset = -2; xOffset <= 2; xOffset++) {
        const sampleX = xPos + xOffset;
        if (sampleX < 0 || sampleX >= width) continue;
        const offset = originalOffset(sampleY * width + sampleX);
        const alpha = originalRgba[offset + 3] ?? 255;
        if (alpha <= 8) continue;
        const color = {
          red: originalRgba[offset] ?? 255,
          green: originalRgba[offset + 1] ?? 255,
          blue: originalRgba[offset + 2] ?? 255,
        };
        if (rgbLuma(color) < 166 || rgbSpread(color) > 42) return true;
      }
    }
    return false;
  };

  const restorePixel = (pixelIndex: number, restoreWeight: number) => {
    const originalPixelOffset = originalOffset(pixelIndex);
    const outputPixelOffset = outputOffset(pixelIndex);
    const originalAlpha = originalRgba[originalPixelOffset + 3] ?? 255;
    const currentAlpha = outputRgba[outputPixelOffset + 3] ?? 255;
    const weight = clampUnit(restoreWeight);
    if (weight <= 0 || currentAlpha >= originalAlpha) return;

    outputRgba[outputPixelOffset] = clampByte(
      (outputRgba[outputPixelOffset] ?? 0) * (1 - weight) + (originalRgba[originalPixelOffset] ?? 0) * weight,
    );
    outputRgba[outputPixelOffset + 1] = clampByte(
      (outputRgba[outputPixelOffset + 1] ?? 0) * (1 - weight) + (originalRgba[originalPixelOffset + 1] ?? 0) * weight,
    );
    outputRgba[outputPixelOffset + 2] = clampByte(
      (outputRgba[outputPixelOffset + 2] ?? 0) * (1 - weight) + (originalRgba[originalPixelOffset + 2] ?? 0) * weight,
    );
    outputRgba[outputPixelOffset + 3] = clampByte(
      Math.max(currentAlpha, currentAlpha * (1 - weight) + originalAlpha * weight),
    );
  };

  const enclosedRestoreWeight = clampUnit((105 - strength) / 70);
  const edgeRestoreWeight = clampUnit((62 - strength) / 85) * 0.55;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    if (!isOutputTransparent(pixelIndex)) continue;

    if (!backgroundMask[pixelIndex]) {
      restorePixel(pixelIndex, enclosedRestoreWeight);
      continue;
    }

    if (edgeRestoreWeight > 0 && hasForegroundNeighbor(pixelIndex) && hasOriginalDetailNeighbor(pixelIndex)) {
      restorePixel(pixelIndex, edgeRestoreWeight);
    }
  }

  return sharp(outputRgba, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function removeSpriteBackgroundPng(
  input: Buffer,
  cleanupStrength = 35,
  engine: SpriteCleanupEngine = "auto",
): Promise<{ buffer: Buffer; engine: UsedSpriteCleanupEngine }> {
  const configuredEngine = engine === "auto" ? getBackgroundRemoverStatus().engine : engine;
  if (configuredEngine === "backgroundremover") {
    const aiOutput = await tryRemoveBackgroundWithBackgroundRemover(input, {
      required: true,
    });
    if (aiOutput) {
      return {
        buffer: await softenBackgroundRemoverMask(input, aiOutput, cleanupStrength),
        engine: "backgroundremover",
      };
    }
  }

  const matteOutput = await removeUniformSpriteBackgroundPng(input, cleanupStrength);
  if (configuredEngine === "builtin" || matteOutput.alreadyTransparent || matteOutput.confidence >= 0.62) {
    return { buffer: matteOutput.buffer, engine: "builtin" };
  }

  const aiOutput = await tryRemoveBackgroundWithBackgroundRemover(input, { required: false });
  if (aiOutput) {
    return {
      buffer: await softenBackgroundRemoverMask(input, aiOutput, cleanupStrength),
      engine: "backgroundremover",
    };
  }

  return { buffer: matteOutput.buffer, engine: "builtin" };
}

function looksLikeBase64(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 32) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);
}

function extractBase64ImageData(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma < 0) return "";
    return trimmed.slice(comma + 1);
  }

  return trimmed;
}

export async function spritesRoutes(app: FastifyInstance) {
  app.get("/capabilities", async () => ({
    ...(await getSpriteCapabilities()),
    backgroundRemover: getBackgroundRemoverStatus(),
  }));

  app.get("/cleanup/status", async () => ({
    backgroundRemover: getBackgroundRemoverStatus(),
  }));

  /**
   * GET /api/sprites/:characterId
   * List all sprite expressions for a character.
   */
  app.get<{ Params: { characterId: string } }>("/:characterId", async (req, reply) => {
    const { characterId } = req.params;
    if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
      return reply.status(400).send({ error: "Invalid character ID" });
    }
    return listSpriteInfos(characterId);
  });

  /**
   * POST /api/sprites/:characterId/export
   * Export selected sprite expressions as one zip with a folder inside.
   * Body: { expressions?: string[], folderName?: string }
   */
  app.post<{ Params: { characterId: string } }>("/:characterId/export", async (req, reply) => {
    const { characterId } = req.params;

    if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
      return reply.status(400).send({ error: "Invalid character ID" });
    }

    const dir = join(SPRITES_ROOT, characterId);
    if (!existsSync(dir)) {
      return reply.status(404).send({ error: "No sprites found" });
    }

    const body = req.body as { expressions?: unknown; folderName?: unknown };
    const requestedExpressions =
      Array.isArray(body.expressions) && body.expressions.length > 0
        ? new Set(body.expressions.map((expr) => normalizeSpriteExpression(String(expr))).filter(Boolean))
        : null;
    const files = readdirSync(dir).filter((filename) => SPRITE_FILE_RE.test(filename));
    const targets = files.filter((filename) => {
      const expression = filename.slice(0, -extname(filename).length);
      return !requestedExpressions || requestedExpressions.has(normalizeSpriteExpression(expression));
    });

    if (targets.length === 0) {
      return reply.status(404).send({ error: "No matching sprites found" });
    }

    const folderName = sanitizeSpriteExportName(body.folderName, `sprites-${characterId}`);
    const zip = new AdmZip();
    for (const filename of targets) {
      zip.addFile(`${folderName}/${filename}`, readFileSync(join(dir, filename)));
    }

    return reply
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${folderName}.zip"`)
      .send(zip.toBuffer());
  });

  /**
   * POST /api/sprites/:characterId
   * Upload a sprite image for a given expression.
   * Body: { expression: string, image: string (base64 data URL) }
   */
  app.post<{ Params: { characterId: string } }>("/:characterId", async (req, reply) => {
    const { characterId } = req.params;

    // Prevent path traversal
    if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
      return reply.status(400).send({ error: "Invalid character ID" });
    }

    const body = req.body as { expression?: string; image?: string };

    if (!body.expression?.trim()) {
      return reply.status(400).send({ error: "Expression label is required" });
    }
    if (!body.image) {
      return reply.status(400).send({ error: "No image data provided" });
    }

    const expression = normalizeSpriteExpression(body.expression);
    if (!expression) {
      return reply.status(400).send({ error: "Expression label must include at least one letter or number" });
    }

    // Parse base64
    let base64 = body.image;
    let ext = "png";
    if (base64.startsWith("data:")) {
      const match = base64.match(/^data:image\/([\w+]+);base64,/);
      if (match?.[1]) {
        ext = match[1].replace("+xml", "");
        base64 = base64.slice(base64.indexOf(",") + 1);
      }
    }

    const dir = join(SPRITES_ROOT, characterId);
    await mkdir(dir, { recursive: true });

    const filename = `${expression}.${ext}`;
    const filepath = join(dir, filename);
    await writeFile(filepath, Buffer.from(base64, "base64"));

    const mtime = statSync(filepath).mtimeMs;
    return {
      expression,
      filename,
      url: `/api/sprites/${characterId}/file/${encodeURIComponent(filename)}?v=${Math.floor(mtime)}`,
    };
  });

  /**
   * POST /api/sprites/:characterId/cleanup-saved
   * Run background cleanup on already-saved sprite files and overwrite them as PNGs.
   * Body: { expressions?: string[], cleanupStrength?: number, engine?: "auto" | "backgroundremover" | "builtin" }
   */
  app.post<{ Params: { characterId: string } }>("/:characterId/cleanup-saved", async (req, reply) => {
    const { characterId } = req.params;

    if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
      return reply.status(400).send({ error: "Invalid character ID" });
    }

    const dir = join(SPRITES_ROOT, characterId);
    if (!existsSync(dir)) {
      return reply.status(404).send({ error: "No sprites found" });
    }

    const body = req.body as { expressions?: string[]; cleanupStrength?: number; engine?: SpriteCleanupEngine };
    const requestedExpressions =
      Array.isArray(body.expressions) && body.expressions.length > 0
        ? new Set(body.expressions.map((expr) => normalizeSpriteExpression(String(expr))).filter(Boolean))
        : null;
    const cleanupStrength = Number.isFinite(body.cleanupStrength) ? Number(body.cleanupStrength) : 35;
    const cleanupEngine = normalizeSpriteCleanupEngine(body.engine);

    const files = readdirSync(dir).filter((filename) => SPRITE_FILE_RE.test(filename));
    const targets = files.filter((filename) => {
      const expression = filename.slice(0, -extname(filename).length);
      return !requestedExpressions || requestedExpressions.has(normalizeSpriteExpression(expression));
    });

    if (targets.length === 0) {
      return reply.status(404).send({ error: "No matching sprites found" });
    }

    const backupId = `${Date.now()}-${randomUUID()}`;
    const backupDir = join(dir, ".cleanup-backups", backupId);
    const manifest: SpriteCleanupBackupManifest = {
      id: backupId,
      createdAt: new Date().toISOString(),
      entries: [],
    };
    const failed: Array<{ expression: string; error: string }> = [];
    const engineCounts: Record<UsedSpriteCleanupEngine, number> = {
      backgroundremover: 0,
      builtin: 0,
    };
    let processed = 0;

    for (const filename of targets) {
      const expression = filename.slice(0, -extname(filename).length);
      const inputPath = join(dir, filename);

      try {
        if (!CLEANUP_INPUT_FILE_RE.test(filename)) {
          throw new Error("Only PNG, JPEG, WEBP, and AVIF sprites can be background-cleaned");
        }

        const output = await removeSpriteBackgroundPng(readFileSync(inputPath), cleanupStrength, cleanupEngine);
        const outputFilename = `${expression}.png`;
        const outputPath = join(dir, outputFilename);
        await mkdir(backupDir, { recursive: true });
        await copyFile(inputPath, join(backupDir, filename));
        manifest.entries.push({
          expression,
          originalFilename: filename,
          cleanedFilename: outputFilename,
          backupFilename: filename,
        });
        await writeFile(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));
        await writeFile(outputPath, output.buffer);

        if (filename !== outputFilename) {
          try {
            unlinkSync(inputPath);
          } catch (unlinkErr) {
            logger.warn(unlinkErr, "Failed to remove original sprite after cleanup");
          }
        }

        engineCounts[output.engine] += 1;
        processed += 1;
      } catch (err) {
        logger.warn(err, 'Saved sprite "%s" background cleanup failed', expression);
        failed.push({
          expression,
          error: err instanceof Error ? err.message : "Cleanup failed",
        });
      }
    }

    if (manifest.entries.length === 0) {
      await rm(backupDir, { recursive: true, force: true });
    }

    const payload = {
      processed,
      failed,
      backupId: manifest.entries.length > 0 ? backupId : null,
      engine: cleanupEngine,
      backgroundRemoverProcessed: engineCounts.backgroundremover,
      builtinProcessed: engineCounts.builtin,
      sprites: listSpriteInfos(characterId),
    };

    if (processed === 0 && failed.length > 0) {
      return reply.status(500).send({ ...payload, error: "No saved sprites were cleaned" });
    }

    return payload;
  });

  /**
   * POST /api/sprites/:characterId/cleanup-restore
   * Restore the previous saved sprite files from a cleanup backup.
   * Body: { backupId: string }
   */
  app.post<{ Params: { characterId: string } }>("/:characterId/cleanup-restore", async (req, reply) => {
    const { characterId } = req.params;

    if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
      return reply.status(400).send({ error: "Invalid character ID" });
    }

    const body = req.body as { backupId?: string };
    if (!isSafeBackupId(body.backupId)) {
      return reply.status(400).send({ error: "Invalid backup ID" });
    }

    const dir = join(SPRITES_ROOT, characterId);
    const backupDir = join(dir, ".cleanup-backups", body.backupId);
    const manifestPath = join(backupDir, "manifest.json");

    if (!existsSync(manifestPath)) {
      return reply.status(404).send({ error: "Cleanup backup was not found" });
    }

    let manifest: SpriteCleanupBackupManifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SpriteCleanupBackupManifest;
    } catch {
      return reply.status(500).send({ error: "Cleanup backup manifest is unreadable" });
    }

    let restored = 0;
    const failed: Array<{ expression: string; error: string }> = [];

    for (const entry of manifest.entries) {
      try {
        if (
          !entry.backupFilename ||
          !entry.originalFilename ||
          entry.backupFilename.includes("..") ||
          entry.originalFilename.includes("..") ||
          entry.cleanedFilename.includes("..") ||
          entry.backupFilename.includes("/") ||
          entry.originalFilename.includes("/") ||
          entry.cleanedFilename.includes("/") ||
          entry.backupFilename.includes("\\") ||
          entry.originalFilename.includes("\\") ||
          entry.cleanedFilename.includes("\\")
        ) {
          throw new Error("Backup entry has an invalid filename");
        }

        await copyFile(join(backupDir, entry.backupFilename), join(dir, entry.originalFilename));
        if (entry.cleanedFilename !== entry.originalFilename) {
          await unlink(join(dir, entry.cleanedFilename)).catch(() => undefined);
        }
        restored += 1;
      } catch (err) {
        logger.warn(err, 'Saved sprite "%s" cleanup restore failed', entry.expression);
        failed.push({
          expression: entry.expression,
          error: err instanceof Error ? err.message : "Restore failed",
        });
      }
    }

    if (restored > 0 && failed.length === 0) {
      await rm(backupDir, { recursive: true, force: true });
    }

    const payload = {
      restored,
      failed,
      sprites: listSpriteInfos(characterId),
    };

    if (restored === 0 && failed.length > 0) {
      return reply.status(500).send({ ...payload, error: "No saved sprites were restored" });
    }

    return payload;
  });

  /**
   * PATCH /api/sprites/:characterId/:expression
   * Rename a saved sprite without replacing its image.
   * Body: { expression: string }
   */
  app.patch<{ Params: { characterId: string; expression: string } }>(
    "/:characterId/:expression",
    { config: { rateLimit: SPRITE_RENAME_RATE_LIMIT } },
    async (req, reply) =>
      withSpriteRenameLock(req.params.characterId, async () => {
        const { characterId, expression } = req.params;
        if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
          return reply.status(400).send({ error: "Invalid character ID" });
        }

        const body = req.body;
        const nextExpression =
          body &&
          typeof body === "object" &&
          !Array.isArray(body) &&
          typeof (body as { expression?: unknown }).expression === "string"
            ? normalizeSpriteExpression((body as { expression: string }).expression)
            : "";
        if (!nextExpression) {
          return reply.status(400).send({ error: "Expression label must include at least one letter or number" });
        }

        const dir = join(SPRITES_ROOT, characterId);
        if (!existsSync(dir)) return reply.status(404).send({ error: "No sprites found" });

        const files = readdirSync(dir);
        const source = files.find((filename) => {
          const ext = extname(filename);
          return SPRITE_FILE_RE.test(filename) && filename.slice(0, -ext.length) === expression;
        });
        if (!source) return reply.status(404).send({ error: "Expression not found" });

        const extension = extname(source);
        const target = `${nextExpression}${extension}`;
        const hasNameCollision = files.some((filename) => {
          if (!SPRITE_FILE_RE.test(filename)) return false;
          const filenameExpression = filename.slice(0, -extname(filename).length);
          return filename !== source && filenameExpression.toLowerCase() === nextExpression.toLowerCase();
        });
        if (hasNameCollision) {
          return reply.status(409).send({ error: "An expression with that name already exists" });
        }

        if (target !== source) await rename(join(dir, source), join(dir, target));
        const mtime = statSync(join(dir, target)).mtimeMs;
        return {
          expression: nextExpression,
          filename: target,
          url: `/api/sprites/${characterId}/file/${encodeURIComponent(target)}?v=${Math.floor(mtime)}`,
        };
      }),
  );

  /**
   * DELETE /api/sprites/:characterId/:expression
   * Remove a sprite expression image.
   */
  app.delete<{ Params: { characterId: string; expression: string } }>(
    "/:characterId/:expression",
    async (req, reply) => {
      const { characterId, expression } = req.params;

      // Prevent path traversal
      if (characterId.includes("..") || characterId.includes("/") || characterId.includes("\\")) {
        return reply.status(400).send({ error: "Invalid character ID" });
      }

      const dir = join(SPRITES_ROOT, characterId);

      if (!existsSync(dir)) {
        return reply.status(404).send({ error: "No sprites found" });
      }

      const files = readdirSync(dir);
      const match = files.find((f) => {
        const ext = extname(f);
        return f.slice(0, -ext.length) === expression;
      });

      if (!match) {
        return reply.status(404).send({ error: "Expression not found" });
      }

      unlinkSync(join(dir, match));
      return reply.status(204).send();
    },
  );

  /**
   * GET /api/sprites/:characterId/file/:filename
   * Serve a sprite image file.
   */
  app.get<{ Params: { characterId: string; filename: string } }>("/:characterId/file/:filename", async (req, reply) => {
    const { characterId, filename } = req.params;

    // Prevent path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      characterId.includes("..") ||
      characterId.includes("/") ||
      characterId.includes("\\")
    ) {
      return reply.status(400).send({ error: "Invalid path" });
    }

    const filePath = assertInsideDir(SPRITES_ROOT, join(SPRITES_ROOT, characterId, filename));
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    const image = await validateImageAssetFile(filePath, filename, { allowSvg: true });
    if (!image) return reply.status(404).send({ error: "Not found" });

    if (image.isSvg) reply.header("Content-Security-Policy", "sandbox; default-src 'none'");
    return sendValidatedMediaFile(reply, image, {
      method: req.method,
      rangeHeader: req.headers.range,
      cacheControl: "public, max-age=31536000, immutable",
    });
  });

  /**
   * POST /api/sprites/cleanup
   * Apply background cleanup to already generated sprites.
   * Body: { cells: [{ expression, base64 }], cleanupStrength, engine?: "auto" | "backgroundremover" | "builtin" }
   * Returns: { cells: [{ expression, base64 }] }
   */
  app.post("/cleanup", async (req, reply) => {
    const body = req.body as {
      cells?: Array<{ expression?: string; base64?: string }>;
      cleanupStrength?: number;
      engine?: SpriteCleanupEngine;
    };

    if (!body.cells || body.cells.length === 0) {
      return reply.status(400).send({ error: "At least one cell is required" });
    }

    const cleanupStrength = Number.isFinite(body.cleanupStrength) ? Number(body.cleanupStrength) : 35;
    const cleanupEngine = normalizeSpriteCleanupEngine(body.engine);

    try {
      const engineCounts: Record<UsedSpriteCleanupEngine, number> = {
        backgroundremover: 0,
        builtin: 0,
      };
      const processed = await Promise.all(
        body.cells.map(async (cell) => {
          const base64 = extractBase64ImageData(cell.base64 ?? "");
          if (!base64 || !looksLikeBase64(base64)) {
            throw new Error(`Invalid base64 image for expression: ${cell.expression ?? "unknown"}`);
          }

          const inputBuffer = Buffer.from(base64, "base64");
          const output = await removeSpriteBackgroundPng(inputBuffer, cleanupStrength, cleanupEngine);
          engineCounts[output.engine] += 1;

          return {
            expression: cell.expression ?? "",
            base64: output.buffer.toString("base64"),
          };
        }),
      );

      return {
        cells: processed,
        engine: cleanupEngine,
        backgroundRemoverProcessed: engineCounts.backgroundremover,
        builtinProcessed: engineCounts.builtin,
      };
    } catch (err: any) {
      logger.error(err, "Sprite cleanup failed");
      return reply.status(500).send({
        error: err?.message || "Sprite cleanup failed",
      });
    }
  });
}
