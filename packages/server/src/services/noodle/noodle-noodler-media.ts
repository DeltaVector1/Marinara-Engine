import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { logger } from "../../lib/logger.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { assertInsideDir } from "../../utils/security.js";

// NoodleR-owned media lives under the gallery data dir but in a namespace whose
// path contains a slash, so the public gallery serve routes (which reject slashes in the
// chatId segment) can never reach it. Only the access-checked media endpoint serves it.
const GALLERY_DIR = join(DATA_DIR, "gallery");
// Renaming this orphans NoodleR media already on disk in existing installations. Accepted
// while NoodleR is in alpha; if that stops being true, migrate rather than rename again.
const NOODLER_MEDIA_PREFIX = "noodler-media/";


/** Access-checked serving URL for a NoodleR post's generated image. */
export function noodlerPostMediaUrl(postId: string): string {
  return `/api/noodle/noodler/posts/${encodeURIComponent(postId)}/media`;
}


// A locked post shows a blurred teaser, not a grey frame — that is what the onboarding
// wizard teaches users to recognise. The blur has to happen server-side: shipping the
// original bytes and blurring in CSS discloses the image to anyone who opens devtools.
// Downscaling to a handful of pixels before blurring makes the original unrecoverable
// rather than merely hidden.
const TEASER_SUFFIX = ".teaser.jpg";

/** Resolve a stored relative NoodleR-media path to an absolute path inside the gallery dir. */
export function resolveNoodlerMediaAbsolutePath(relativePath: string): string | null {
  if (!relativePath.startsWith(NOODLER_MEDIA_PREFIX)) return null;
  try {
    return assertInsideDir(GALLERY_DIR, join(GALLERY_DIR, relativePath));
  } catch {
    return null;
  }
}

/** Best-effort removal of an owned NoodleR-media file when its post is deleted. */
export function unlinkNoodlerMedia(relativePath: string | null): void {
  if (!relativePath) return;
  const absolute = resolveNoodlerMediaAbsolutePath(relativePath);
  if (!absolute) return;
  try {
    if (existsSync(absolute)) unlinkSync(absolute);
    // The cached teaser is a derivative of the same bytes and must not outlive them.
    if (existsSync(`${absolute}${TEASER_SUFFIX}`)) unlinkSync(`${absolute}${TEASER_SUFFIX}`);
  } catch (error) {
    logger.warn(error, "[noodler] Failed to remove NoodleR media file %s", relativePath);
  }
}
