// ──────────────────────────────────────────────
// Routes: Chat Backgrounds (upload, list, delete, serve, tags, rename)
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { existsSync, mkdirSync, readdirSync, unlinkSync, readFileSync, writeFileSync, renameSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import { join, extname, basename, parse as parsePath } from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { DATA_DIR } from "../utils/data-dir.js";
import { buildAssetManifest, GAME_ASSETS_DIR, getAssetManifest } from "../services/game/asset-manifest.service.js";
import { moveBackgroundAssignment, normalizeBackgroundLibraryOrganization, pruneBackgroundLibraryOrganization, removeBackgroundFolder, type BackgroundLibraryOrganization } from "../services/background-library-organization.js";
import { assertInsideDir, isAllowedImageBuffer } from "../utils/security.js";
import { sendValidatedMediaFile, validateImageAssetFile } from "../utils/media-file-security.js";
import { parseThumbnailWidth, resolveThumbPath } from "../services/image/image-thumbnail.js";

const BG_DIR = join(DATA_DIR, "backgrounds");
const META_PATH = join(BG_DIR, "meta.json");
const ORGANIZATION_PATH = join(BG_DIR, "organization.json");

// Ensure directory exists
function ensureDir() {
  if (!existsSync(BG_DIR)) {
    mkdirSync(BG_DIR, { recursive: true });
  }
}

interface BgMeta {
  tags: string[];
}
type MetaMap = Record<string, BgMeta>;

function normalizeBackgroundMeta(value: unknown): MetaMap {
  const meta = Object.create(null) as MetaMap;
  if (!value || typeof value !== "object" || Array.isArray(value)) return meta;

  for (const [filename, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const tags = (entry as { tags?: unknown }).tags;
    if (!Array.isArray(tags)) continue;
    meta[filename] = { tags: tags.filter((tag): tag is string => typeof tag === "string") };
  }
  return meta;
}

function readMeta(): MetaMap {
  ensureDir();
  if (!existsSync(META_PATH)) return normalizeBackgroundMeta(undefined);
  try {
    return normalizeBackgroundMeta(JSON.parse(readFileSync(META_PATH, "utf-8")));
  } catch {
    return normalizeBackgroundMeta(undefined);
  }
}

function writeMeta(meta: MetaMap) {
  ensureDir();
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2), "utf-8");
}

function readOrganization(): BackgroundLibraryOrganization {
  ensureDir();
  if (!existsSync(ORGANIZATION_PATH)) return { folders: [], assignments: {}, favorites: [] };
  try {
    return normalizeBackgroundLibraryOrganization(JSON.parse(readFileSync(ORGANIZATION_PATH, "utf-8")));
  } catch {
    return { folders: [], assignments: {}, favorites: [] };
  }
}

function writeOrganization(organization: BackgroundLibraryOrganization) {
  ensureDir();
  const temporaryPath = `${ORGANIZATION_PATH}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, JSON.stringify(organization, null, 2), "utf-8");
    renameSync(temporaryPath, ORGANIZATION_PATH);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

/** Every background id the library can currently show, so organization writes can't reference ghosts. */
function knownBackgroundIds(): Set<string> {
  ensureDir();
  const userIds = readdirSync(BG_DIR)
    .filter((filename) => ALLOWED_EXTS.has(extname(filename).toLowerCase()))
    .map((filename) => `user:${filename}`);
  const gameIds = (getAssetManifest().byCategory.backgrounds ?? [])
    .filter((entry) => !entry.path.startsWith("__user_bg__/"))
    .map((entry) => `game:${entry.tag}`);
  return new Set([...userIds, ...gameIds]);
}

function fileCreatedAt(filePath: string): string {
  try {
    const stats = statSync(filePath);
    const timestamp = stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime;
    return timestamp.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
const BACKGROUND_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;


const backgroundFolderNameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const backgroundAssignmentSchema = z.object({
  backgroundId: z.string().trim().min(1).max(500),
  folderId: z.string().trim().min(1).max(100).nullable(),
});

const backgroundFavoriteSchema = z.object({
  backgroundId: z.string().trim().min(1).max(500),
  favorite: z.boolean(),
});

/** Sanitise a filename: keep alphanumeric, spaces, hyphens, underscores, dots. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _.\-]/g, "").trim();
}

/** Given a desired filename, return a unique filename that doesn't collide with existing files. */
function uniqueFilename(desired: string): string {
  if (!existsSync(join(BG_DIR, desired))) return desired;
  const { name, ext } = parsePath(desired);
  let i = 2;
  while (existsSync(join(BG_DIR, `${name}_${i}${ext}`))) i++;
  return `${name}_${i}${ext}`;
}

function encodeAssetPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}







export async function backgroundsRoutes(app: FastifyInstance) {
  // List all backgrounds (includes tags)
  app.get("/", async () => {
    ensureDir();
    const meta = readMeta();
    const organization = readOrganization();
    const favorites = new Set(organization.favorites);
    const files = readdirSync(BG_DIR).filter((f) => {
      const ext = extname(f).toLowerCase();
      return ALLOWED_EXTS.has(ext);
    });
    const userBackgrounds = files.map((filename) => {
      const id = `user:${filename}`;
      return {
        id,
        filename,
        url: `/api/backgrounds/file/${encodeURIComponent(filename)}`,
        tags: meta[filename]?.tags ?? [],
        source: "user" as const,
        editable: true,
        deletable: true,
        renameable: true,
        createdAt: fileCreatedAt(join(BG_DIR, filename)),
        folderId: organization.assignments[id] ?? null,
        favorite: favorites.has(id),
      };
    });

    const gameAssetBackgrounds = (getAssetManifest().byCategory.backgrounds ?? [])
      .filter((entry) => !entry.path.startsWith("__user_bg__/"))
      .map((entry) => {
        const id = `game:${entry.tag}`;
        return {
          id,
          filename: `${entry.name}${entry.ext}`,
          url: `/api/game-assets/file/${encodeAssetPath(entry.path)}`,
          tags: entry.subcategory ? [entry.subcategory] : [],
          source: "game_asset" as const,
          tag: entry.tag,
          editable: false,
          deletable: false,
          renameable: false,
          createdAt: fileCreatedAt(join(GAME_ASSETS_DIR, entry.path)),
          folderId: organization.assignments[id] ?? null,
          favorite: favorites.has(id),
        };
      });

    return [...userBackgrounds, ...gameAssetBackgrounds];
  });

  // List all unique tags (for autocomplete)
  app.get("/tags", async () => {
    const meta = readMeta();
    const tagSet = new Set<string>();
    for (const entry of Object.values(meta)) {
      for (const t of entry.tags) tagSet.add(t);
    }
    for (const entry of getAssetManifest().byCategory.backgrounds ?? []) {
      if (!entry.path.startsWith("__user_bg__/") && entry.subcategory) tagSet.add(entry.subcategory);
    }
    return [...tagSet].sort();
  });

  app.get("/folders", async () => readOrganization().folders);

  app.post("/folders", async (req, reply) => {
    const parsed = backgroundFolderNameSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.status(400).send({ error: "Folder name is required and must be 80 characters or fewer" });
    const organization = readOrganization();
    const now = new Date().toISOString();
    const folder = { id: randomUUID(), name: parsed.data.name, createdAt: now, updatedAt: now };
    organization.folders.push(folder);
    writeOrganization(organization);
    return folder;
  });

  app.patch("/folders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = backgroundFolderNameSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.status(400).send({ error: "Folder name is required and must be 80 characters or fewer" });
    const organization = readOrganization();
    const folder = organization.folders.find((candidate) => candidate.id === id);
    if (!folder) return reply.status(404).send({ error: "Folder not found" });
    folder.name = parsed.data.name;
    folder.updatedAt = new Date().toISOString();
    writeOrganization(organization);
    return folder;
  });

  app.delete("/folders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const organization = readOrganization();
    if (!organization.folders.some((folder) => folder.id === id)) {
      return reply.status(404).send({ error: "Folder not found" });
    }
    writeOrganization(removeBackgroundFolder(organization, id));
    return { success: true };
  });

  app.patch("/organization", async (req, reply) => {
    const parsed = backgroundAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "A valid backgroundId and folderId are required" });
    const organization = readOrganization();
    if (parsed.data.folderId && !organization.folders.some((folder) => folder.id === parsed.data.folderId)) {
      return reply.status(404).send({ error: "Folder not found" });
    }

    const knownIds = knownBackgroundIds();
    if (!knownIds.has(parsed.data.backgroundId)) {
      return reply.status(404).send({ error: "Background not found" });
    }

    if (parsed.data.folderId) organization.assignments[parsed.data.backgroundId] = parsed.data.folderId;
    else delete organization.assignments[parsed.data.backgroundId];
    writeOrganization(pruneBackgroundLibraryOrganization(organization, knownIds));
    return { success: true, folderId: parsed.data.folderId };
  });

  app.patch("/favorite", async (req, reply) => {
    const parsed = backgroundFavoriteSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.status(400).send({ error: "A valid backgroundId and favorite flag are required" });
    const knownIds = knownBackgroundIds();
    if (!knownIds.has(parsed.data.backgroundId)) {
      return reply.status(404).send({ error: "Background not found" });
    }

    const organization = readOrganization();
    const favorites = new Set(organization.favorites);
    if (parsed.data.favorite) favorites.add(parsed.data.backgroundId);
    else favorites.delete(parsed.data.backgroundId);
    writeOrganization(pruneBackgroundLibraryOrganization({ ...organization, favorites: [...favorites] }, knownIds));
    return { success: true, favorite: parsed.data.favorite };
  });

  // Upload a new background (preserves original filename)
  app.post("/upload", async (req, reply) => {
    ensureDir();
    const data = await req.file({ limits: { fileSize: BACKGROUND_UPLOAD_MAX_BYTES } });
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const ext = extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return reply.status(400).send({ error: `Unsupported file type: ${ext}` });
    }

    // Use the original filename (sanitised) instead of a UUID
    const sanitized = sanitizeFilename(basename(data.filename));
    const safeName = sanitized ? uniqueFilename(sanitized) : uniqueFilename(`background${ext}`);
    const filePath = assertInsideDir(BG_DIR, join(BG_DIR, safeName));
    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      if ((err as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
        return reply.status(413).send({ error: "Background image is too large" });
      }
      throw err;
    }
    if (!isAllowedImageBuffer(buffer, ext)) {
      return reply.status(400).send({ error: "Unsupported or invalid image file" });
    }
    await writeFile(filePath, buffer);

    // Store metadata
    const meta = readMeta();
    meta[safeName] = { tags: [] };
    writeMeta(meta);

    // Rebuild game asset manifest so scene analysis picks up new backgrounds
    buildAssetManifest();

    return {
      success: true,
      filename: safeName,
      url: `/api/backgrounds/file/${encodeURIComponent(safeName)}`,
      tags: [],
    };
  });



  // Set tags for a background
  app.patch("/:filename/tags", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    if (filename.includes("..") || filename.includes("/")) {
      return reply.status(400).send({ error: "Invalid filename" });
    }

    const filePath = assertInsideDir(BG_DIR, join(BG_DIR, filename));
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    const body = req.body as { tags?: string[] };
    if (!Array.isArray(body?.tags)) {
      return reply.status(400).send({ error: "tags must be an array of strings" });
    }

    // Sanitise: lowercase, trim, unique, limit length
    const tags = [
      ...new Set(
        body.tags
          .map((t: unknown) =>
            String(t)
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9 _-]/g, ""),
          )
          .filter((t) => t.length > 0 && t.length <= 40),
      ),
    ];

    const meta = readMeta();
    if (!meta[filename]) meta[filename] = { tags: [] };
    meta[filename].tags = tags;
    writeMeta(meta);

    return { success: true, tags };
  });

  // Rename a background file
  app.patch("/:filename/rename", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    if (filename.includes("..") || filename.includes("/")) {
      return reply.status(400).send({ error: "Invalid filename" });
    }

    const filePath = assertInsideDir(BG_DIR, join(BG_DIR, filename));
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    const body = req.body as { name?: string };
    if (!body?.name || typeof body.name !== "string") {
      return reply.status(400).send({ error: "name is required" });
    }

    // Keep the existing extension
    const ext = extname(filename).toLowerCase();
    const rawName = sanitizeFilename(body.name.replace(/\.[^.]+$/, "")); // strip any extension they included
    if (!rawName) {
      return reply.status(400).send({ error: "Name is empty after sanitisation" });
    }

    const desired = `${rawName}${ext}`;
    if (desired === filename) {
      return { success: true, filename, url: `/api/backgrounds/file/${encodeURIComponent(filename)}` };
    }

    const newFilename = uniqueFilename(desired);
    const newPath = assertInsideDir(BG_DIR, join(BG_DIR, newFilename));

    renameSync(filePath, newPath);

    // Move metadata entry
    const meta = readMeta();
    if (meta[filename]) {
      meta[newFilename] = meta[filename];
      delete meta[filename];
    }
    writeMeta(meta);

    const organization = moveBackgroundAssignment(readOrganization(), `user:${filename}`, `user:${newFilename}`);
    writeOrganization(organization);

    // Rebuild game asset manifest
    buildAssetManifest();

    return {
      success: true,
      oldFilename: filename,
      filename: newFilename,
      url: `/api/backgrounds/file/${encodeURIComponent(newFilename)}`,
    };
  });

  // Serve a background file
  app.get("/file/:filename", async (req, reply) => {
    ensureDir();
    const { filename } = req.params as { filename: string };
    const requestedWidth = parseThumbnailWidth((req.query as { w?: string }).w);

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return reply.status(400).send({ error: "Invalid filename" });
    }

    const filePath = assertInsideDir(BG_DIR, join(BG_DIR, filename));
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    const image = await validateImageAssetFile(filePath, filename);
    if (!image) return reply.status(404).send({ error: "Not found" });

    // Downscaled variant when asked for one; falls back to the original on any miss.
    const thumbPath = requestedWidth ? await resolveThumbPath(filePath, requestedWidth) : null;

    if (thumbPath) {
      await image.handle.close().catch(() => undefined);
      const { createReadStream } = await import("fs");
      return reply
        .header("Content-Type", "image/webp")
        .header("Cache-Control", "no-cache, must-revalidate")
        .send(createReadStream(thumbPath));
    }
    return sendValidatedMediaFile(reply, image, {
      method: req.method,
      rangeHeader: req.headers.range,
      cacheControl: "no-cache, must-revalidate",
    });
  });

  // Delete a background
  app.delete("/:filename", async (req, reply) => {
    ensureDir();
    const { filename } = req.params as { filename: string };

    if (filename.includes("..") || filename.includes("/")) {
      return reply.status(400).send({ error: "Invalid filename" });
    }

    const filePath = assertInsideDir(BG_DIR, join(BG_DIR, filename));
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: "Not found" });
    }

    unlinkSync(filePath);

    // Remove from metadata
    const meta = readMeta();
    delete meta[filename];
    writeMeta(meta);

    writeOrganization(moveBackgroundAssignment(readOrganization(), `user:${filename}`, null));

    // Rebuild game asset manifest
    buildAssetManifest();

    return { success: true };
  });
}
