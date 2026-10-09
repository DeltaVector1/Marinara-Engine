// ──────────────────────────────────────────────
// Documentation language packs: download, verify, install, remove.
//
// Translated doc trees live on the repo's `docs-i18n` branch as
// `<lang>/manifest.json` + `<lang>/<mirrored doc paths>.md`. This service
// downloads a language into DATA_DIR/doc-packs/<lang> (gitignored, volume-
// persisted — survives every update path), verifying a sha256 + byte size for
// every file against the manifest. English is built into the repo and is never
// downloaded or deleted. Only one downloaded language is kept on disk.
// ──────────────────────────────────────────────
import { createHash } from "node:crypto";
import { APP_VERSION } from "@marinara-engine/shared";
import { logger } from "../../lib/logger.js";
import { safeFetch } from "../../utils/security.js";

/**
 * Base URL of the docs-i18n content branch. Overridable for forks and mirrors.
 * Must be a public https host — safeFetch blocks loopback/private/reserved
 * addresses, so a LAN mirror is intentionally refused.
 */
const DEFAULT_BASE_URL = "https://raw.githubusercontent.com/Pasta-Devs/Marinara-Engine/docs-i18n";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_FETCH_ATTEMPTS = 3;

export interface DocsPackManifestFile {
  path: string;
  sha256: string;
  bytes: number;
}

export function docsPackBaseUrl(): string {
  const configured = process.env.DOCS_I18N_BASE_URL?.trim();
  const base = configured || DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

/**
 * Pin GitHub raw URLs to the branch head's immutable commit before downloading.
 * raw.githubusercontent.com serves each object through a CDN with independent
 * TTLs, so fetching manifest + files at the mutable branch ref can mix versions
 * after a push and fail every sha256 check until caches expire. Commit-pinned
 * URLs are immutable and cannot skew. Non-GitHub mirrors are used as-is.
 */
const RAW_GITHUB_RE = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)$/;

export async function resolvePinnedBase(base: string): Promise<string> {
  const match = base.match(RAW_GITHUB_RE);
  if (!match) return base;
  const owner = match[1]!;
  const repo = match[2]!;
  const ref = match[3]!;
  if (/^[0-9a-f]{40}$/.test(ref)) return base;
  try {
    const response = await safeFetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
      {
        policy: { allowedProtocols: ["https:"], allowedHostnames: ["api.github.com"] },
        maxResponseBytes: 64 * 1024,
        allowedContentTypes: ["application/vnd.github.sha", "text/plain", "application/json"],
        allowMissingContentType: true,
        headers: {
          Accept: "application/vnd.github.sha",
          "User-Agent": `MarinaraEngine/${APP_VERSION}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw new Error(`GitHub ref lookup failed with HTTP ${response.status}`);
    const sha = (await response.text()).trim();
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("GitHub ref lookup returned an unexpected body");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${sha}`;
  } catch (err) {
    // Rate-limited or offline API: fall back to the branch ref. Hash checks
    // still guarantee integrity; worst case is a retryable skew failure.
    logger.warn(err, "Could not pin the docs-i18n ref to a commit; downloading from the branch URL");
    return base;
  }
}

export async function fetchPackBytes(url: string, maximum: number): Promise<Buffer> {
  const response = await safeFetch(url, {
    // Forks/mirrors are allowed, so no hostname pin — integrity rests on the
    // per-file sha256 checks. https-only and the default reserved-IP blocking
    // keep an .env override from becoming an SSRF vector.
    policy: { allowedProtocols: ["https:"] },
    maxResponseBytes: maximum,
    allowMissingContentType: true,
    headers: { "User-Agent": `MarinaraEngine/${APP_VERSION}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function fetchPackFile(url: string, file: DocsPackManifestFile): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FILE_FETCH_ATTEMPTS; attempt++) {
    try {
      const buffer = await fetchPackBytes(url, Math.min(file.bytes + 1, MAX_FILE_BYTES));
      if (buffer.byteLength !== file.bytes) {
        throw new Error(`Size mismatch for ${file.path}: expected ${file.bytes}, got ${buffer.byteLength}`);
      }
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      if (sha256 !== file.sha256) throw new Error(`Hash mismatch for ${file.path}`);
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < FILE_FETCH_ATTEMPTS) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to download ${file.path}`);
}

// ──────────────────────────────────────────────
// Boot-time reconcile: after an Engine update, refresh the selected pack
// ──────────────────────────────────────────────
