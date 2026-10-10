import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DB } from "../../packages/server/src/db/connection.js";

const fixtureRoot = mkdtempSync(join(tmpdir(), "marinara-st-bulk-chat-errors-"));
const dataDir = join(fixtureRoot, "data", "default-user");
const storageDir = join(fixtureRoot, "storage");
process.env.DATA_DIR = join(fixtureRoot, "marinara-data");
process.env.FILE_STORAGE_DIR = storageDir;
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";

let db: DB | null = null;

try {
  mkdirSync(join(dataDir, "chats", "Test Character"), { recursive: true });
  mkdirSync(join(dataDir, "characters"), { recursive: true });
  mkdirSync(join(dataDir, "groups"), { recursive: true });
  mkdirSync(join(dataDir, "group chats"), { recursive: true });

  const header = { user_name: "User", character_name: "Test Character", chat_metadata: {} };
  const validChat = [header, { name: "Test Character", mes: "A valid chat message." }]
    .map((line) => JSON.stringify(line))
    .join("\n");
  const invalidFirstLine = "not valid JSON";

  writeFileSync(join(dataDir, "chats", "Test Character", "valid.jsonl"), validChat);
  writeFileSync(join(dataDir, "chats", "Test Character", "invalid-first-line.jsonl"), invalidFirstLine);
  writeFileSync(
    join(dataDir, "groups", "test-group.json"),
    JSON.stringify({
      id: "test-group",
      name: "Test Group",
      members: [],
      chats: ["valid-group", "invalid-first-line-group"],
    }),
  );
  writeFileSync(join(dataDir, "group chats", "valid-group.jsonl"), validChat);
  writeFileSync(join(dataDir, "group chats", "invalid-first-line-group.jsonl"), invalidFirstLine);

  const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
  const { chats, messages } = await import("../../packages/server/src/db/schema/index.js");
  const { runSTBulkImport } = await import("../../packages/server/src/services/import/st-bulk.importer.js");
  db = await createFileNativeDB();

  const result = await runSTBulkImport(
    fixtureRoot,
    {
      characters: false,
      chats: true,
      groupChats: true,
      presets: false,
      lorebooks: false,
      backgrounds: false,
      personas: false,
    },
    db,
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.imported, {
    characters: 0,
    chats: 1,
    groupChats: 1,
    presets: 0,
    lorebooks: 0,
    backgrounds: 0,
    personas: 0,
  });
  assert.deepEqual(result.errors, [
    'Chat "Test Character": Invalid JSONL: invalid first line (1)',
    'Group chat "Test Group": Invalid JSONL: invalid first line (1)',
  ]);
  assert.equal((await db.select().from(chats)).length, 2);
  assert.equal((await db.select().from(messages)).length, 2);
} finally {
  await db?._fileStore.close();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

process.stdout.write("SillyTavern bulk chat import error checks passed.\n");
