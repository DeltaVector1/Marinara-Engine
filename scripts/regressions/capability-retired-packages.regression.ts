import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateRequestSchema } from "../../packages/shared/src/schemas/chat.schema.js";

const dataDir = await mkdtemp(join(tmpdir(), "marinara-retired-packages-"));
process.env.DATA_DIR = dataDir;
process.env.MARINARA_AGENT_CATALOG_URL = "https://example.com/catalog.json";

const source = "export default {};";
const sourceHash = createHash("sha256").update(source).digest("hex");
const version = "1.0.0";
const engine = { min: "0.0.0", maxExclusive: "99.0.0" };
const catalogIds = [
  "uno",
  "storyboard",
  "game-surface-agent",
  "maps",
  "conversation-calls",
  "ordinary-agent",
  "example-ruleset",
];
const asset = "retired asset";
const assetHash = createHash("sha256").update(asset).digest("hex");
const kindById: Record<string, string[]> = {
  uno: ["turn-game"],
  storyboard: ["agent"],
  "game-surface-agent": ["agent"],
  maps: ["maps"],
  "conversation-calls": ["conversation-calls"],
  "ordinary-agent": ["agent"],
  "example-ruleset": ["ruleset"],
};

function manifest(id: string) {
  return {
    schemaVersion: 1,
    id,
    name: id,
    version,
    engine,
    kind: kindById[id],
    entrypoints: { server: "server.js", client: "client.js" },
    ...(id === "game-surface-agent" ? { contributions: { slots: ["game-surface"] } } : {}),
    ...(id === "uno" || id === "maps"
      ? {
          schemaVersion: 2,
          capabilityApi: { major: 1, minor: 10 },
          builtAgainst: { engineVersion: "1.0.0", engineCommit: "0".repeat(40) },
          contributions: { assets: { paths: ["icon.png"] } },
        }
      : {}),
    files: ["server.js", "client.js"]
      .map((path) => ({ path, sha256: sourceHash, bytes: Buffer.byteLength(source) }))
      .concat(
        id === "uno" || id === "maps" ? [{ path: "icon.png", sha256: assetHash, bytes: Buffer.byteLength(asset) }] : [],
      ),
    permissions: [],
  };
}

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  packages: catalogIds.map((id) => ({
    manifest: manifest(id),
    artifact: { url: `https://example.com/${id}.zip`, sha256: "0".repeat(64), bytes: 1 },
  })),
};
let fetchCount = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  fetchCount += 1;
  return new Response(JSON.stringify(catalog), { headers: { "content-type": "application/json" } });
};

try {
  assert.equal(
    Object.hasOwn(generateRequestSchema.parse({ chatId: "legacy", turnGameBots: true }), "turnGameBots"),
    false,
    "legacy turn-game bot requests must not activate a retired generation path",
  );

  const sidecarConfigPath = join(dataDir, "models", "sidecar-config.json");
  await mkdir(join(dataDir, "models"), { recursive: true });
  await writeFile(sidecarConfigPath, JSON.stringify({ useForTrackers: false, useForGameScene: true }));
  const sidecarPath = new URL("../../packages/server/src/services/sidecar/sidecar-model.service.ts", import.meta.url);
  const { sidecarModelService } = await import(sidecarPath.href);
  assert.equal(sidecarModelService.isEnabled(), false, "a legacy game-scene flag must not keep the sidecar enabled");
  assert.equal(
    Object.hasOwn(sidecarModelService.getConfig(), "useForGameScene"),
    false,
    "the retired sidecar setting must not be returned to clients",
  );

  const packageManagerPath = new URL(
    "../../packages/server/src/services/capability-packages/package-manager.service.ts",
    import.meta.url,
  );
  const { capabilityPackageManager } = await import(packageManagerPath.href);
  const catalogResult = await capabilityPackageManager.catalog();
  assert.deepEqual(
    catalogResult.packages.map((entry) => entry.manifest.id).sort(),
    ["conversation-calls", "maps", "ordinary-agent"],
    "catalogs must hide retired IDs and every game/ruleset package",
  );

  const installed = [];
  for (const id of [
    "uno",
    "storyboard",
    "game-surface-agent",
    "maps",
    "conversation-calls",
    "ordinary-agent",
    "example-ruleset",
  ]) {
    const packageManifest = manifest(id);
    const packageRoot = join(dataDir, "capability-packages", "versions", id, version);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(join(packageRoot, "server.js"), source);
    await writeFile(join(packageRoot, "client.js"), source);
    if (id === "uno" || id === "maps") await writeFile(join(packageRoot, "icon.png"), asset);
    installed.push({
      id,
      version,
      manifest: packageManifest,
      installedAt: new Date().toISOString(),
      status: "active",
      error: null,
      readiness: "ready",
      readinessError: null,
      legacy: false,
    });
  }
  const capabilityRoot = join(dataDir, "capability-packages");
  await mkdir(capabilityRoot, { recursive: true });
  await writeFile(join(capabilityRoot, "installed.json"), JSON.stringify({ schemaVersion: 1, packages: installed }));

  assert.deepEqual(
    (await capabilityPackageManager.runtimePackages()).map(({ installed: item }) => item.id).sort(),
    ["conversation-calls", "maps", "ordinary-agent"],
    "startup must not load retired, game, or ruleset server modules",
  );
  for (const id of ["uno", "storyboard", "game-surface-agent", "example-ruleset"]) {
    assert.equal(await capabilityPackageManager.clientEntrypoint(id), null, `${id} client entrypoint must be retired`);
  }
  for (const id of ["conversation-calls", "maps", "ordinary-agent"]) {
    assert.ok(await capabilityPackageManager.clientEntrypoint(id), `${id} client entrypoint must remain available`);
  }
  assert.equal(await capabilityPackageManager.packageAsset("uno", "icon.png"), null);
  assert.equal((await capabilityPackageManager.packageAsset("maps", "icon.png"))?.data.toString(), asset);

  const beforeInstall = fetchCount;
  await assert.rejects(capabilityPackageManager.install("uno", version, "0".repeat(64)), /not present/);
  assert.equal(fetchCount, beforeInstall + 1, "install must stop at the filtered catalog and never fetch an artifact");
} finally {
  globalThis.fetch = originalFetch;
  await rm(dataDir, { recursive: true, force: true });
}

console.log("Retired capability packages cannot appear, install, or activate; retained packages remain available.");
