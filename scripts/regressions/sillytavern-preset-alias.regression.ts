import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const fixtureRoot = mkdtempSync(join(tmpdir(), "marinara-st-preset-alias-"));
const dataDir = join(fixtureRoot, "data", "default-user");
const envFile = join(fixtureRoot, ".env");
writeFileSync(envFile, "");
process.env.DATA_DIR = join(fixtureRoot, "engine-data");
process.env.FILE_STORAGE_DIR = join(fixtureRoot, "engine-data", "storage");
process.env.MARINARA_ENV_FILE = envFile;
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";

try {
  mkdirSync(join(dataDir, "characters"), { recursive: true });
  const textGenDir = join(dataDir, "TextGen Settings");
  const openAiDir = join(dataDir, "OpenAI Settings");
  mkdirSync(textGenDir);
  mkdirSync(openAiDir);
  const identicalPreset = JSON.stringify({ name: "Same preset", temperature: 0.7 });
  writeFileSync(join(textGenDir, "textgen.json"), identicalPreset);
  writeFileSync(join(textGenDir, "another.json"), JSON.stringify({ name: "Another preset" }));
  writeFileSync(join(openAiDir, "openai.json"), identicalPreset);

  const lowerCaseAlias = join(dataDir, "textgen settings");
  if (existsSync(lowerCaseAlias)) {
    const aliasInfo = statSync(lowerCaseAlias);
    const originalInfo = statSync(textGenDir);
    assert.equal(aliasInfo.dev, originalInfo.dev, "Case-folded path stays on the same device");
    assert.equal(aliasInfo.ino, originalInfo.ino, "Case-folded path resolves to the same folder");
  } else {
    symlinkSync("TextGen Settings", lowerCaseAlias, "dir");
  }

  const { scanSTFolder } = await import("../../packages/server/src/services/import/st-bulk.importer.js");
  const scan = await scanSTFolder(fixtureRoot);
  assert.equal(scan.success, true);
  assert.equal(scan.presets.length, 3, "Each physical folder is scanned once, with all three files kept");
  assert.deepEqual(scan.presets.map((preset) => relative(dataDir, preset.path)).sort(), [
    "OpenAI Settings/openai.json",
    "TextGen Settings/another.json",
    "TextGen Settings/textgen.json",
  ]);
  assert.equal(
    scan.presets.filter((preset) => preset.name === "Same preset").length,
    2,
    "Distinct folders retain presets with identical file contents",
  );

  const emptyRoot = join(fixtureRoot, "empty-profile");
  mkdirSync(join(emptyRoot, "data", "default-user", "characters"), { recursive: true });
  const emptyScan = await scanSTFolder(emptyRoot);
  assert.equal(emptyScan.success, true);
  assert.equal(emptyScan.presets.length, 0, "Missing preset folders remain skipped");
  console.log("SillyTavern preset folder alias regression checks passed.");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
