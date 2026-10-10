import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DB } from "../../packages/server/src/db/connection.js";

const fixtureRoot = mkdtempSync(join(tmpdir(), "marinara-st-bulk-chat-completeness-"));
const dataDir = join(fixtureRoot, "data", "default-user");
const storageDir = join(fixtureRoot, "storage");
process.env.DATA_DIR = join(fixtureRoot, "marinara-data");
process.env.FILE_STORAGE_DIR = storageDir;
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";

let db: DB | null = null;

try {
  mkdirSync(join(dataDir, "characters"), { recursive: true });
  mkdirSync(join(dataDir, "chats", "Test Character"), { recursive: true });
  mkdirSync(join(dataDir, "group chats"), { recursive: true });

  const header = { user_name: "User", character_name: "Test Character", chat_metadata: {} };
  const validMessage = { name: "Test Character", mes: "This message is kept.", is_user: false };
  writeFileSync(join(dataDir, "chats", "Test Character", "header-only.jsonl"), JSON.stringify(header));
  writeFileSync(
    join(dataDir, "chats", "Test Character", "partial-history.jsonl"),
    [
      header,
      validMessage,
      "not JSON",
      { unexpected: "metadata record with no message fields" },
      { name: "Test Character", mes: "This message is also kept." },
    ]
      .map((line) => (typeof line === "string" ? line : JSON.stringify(line)))
      .join("\n"),
  );
  writeFileSync(
    join(dataDir, "chats", "Test Character", "invalid-first-line.jsonl"),
    JSON.stringify({ unknown: true }),
  );
  writeFileSync(join(dataDir, "chats", "Test Character", "empty.jsonl"), "");

  writeFileSync(join(dataDir, "group chats", "header-only-group.jsonl"), JSON.stringify(header));
  writeFileSync(
    join(dataDir, "group chats", "orphan-history.jsonl"),
    [
      { name: "Wizard", original_avatar: "Wizard.png", mes: "The first headerless message.", is_user: false },
      { name: "User", mes: "A reply.", is_user: true },
    ]
      .map((line) => JSON.stringify(line))
      .join("\n"),
  );
  writeFileSync(join(dataDir, "group chats", "invalid-group.jsonl"), JSON.stringify({ unknown: true }));
  writeFileSync(join(dataDir, "group chats", "empty-group.jsonl"), "");

  const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
  const { chats, messages } = await import("../../packages/server/src/db/schema/index.js");
  const { scanSTFolder, runSTBulkImport } =
    await import("../../packages/server/src/services/import/st-bulk.importer.js");
  db = await createFileNativeDB();

  const scan = await scanSTFolder(fixtureRoot);
  assert.equal(scan.success, true);
  assert.equal(scan.chats.length, 4, "empty and invalid normal histories stay visible for apply errors");
  assert.equal(scan.groupChats.length, 4, "group histories are scanned without groups metadata");
  const orphan = scan.groupChats.find((item) => item.chatName === "orphan-history");
  assert.equal(orphan?.groupName, "orphan-history");
  assert.deepEqual(orphan?.members, ["Wizard"]);

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

  assert.deepEqual(result.imported, {
    characters: 0,
    chats: 2,
    groupChats: 2,
    presets: 0,
    lorebooks: 0,
    backgrounds: 0,
    personas: 0,
  });
  assert.equal(result.errors.length, 6);
  assert.ok(result.errors.some((error) => error.includes("Invalid JSONL: empty file")));
  assert.ok(result.errors.some((error) => error.includes("first line is not a chat header")));
  assert.ok(result.errors.some((error) => error.includes("Skipped malformed line 3: invalid JSON")));
  assert.ok(result.errors.some((error) => error.includes("Skipped malformed line 4: not a chat message")));

  const importedChats = await db.select().from(chats);
  const importedMessages = await db.select().from(messages);
  assert.equal(importedChats.length, 4);
  assert.equal(importedMessages.length, 4);
  assert.ok(importedMessages.some((message) => message.content === "The first headerless message."));
  const importedOrphan = importedChats.find((chat) => chat.name === "orphan-history");
  assert.ok(importedOrphan);
  assert.equal(JSON.parse(importedOrphan.metadata).branchName, "orphan-history");
  const importedEmpty = importedChats.find((chat) => JSON.parse(chat.metadata).branchName === "header-only");
  assert.ok(importedEmpty);
  assert.equal(importedMessages.filter((message) => message.chatId === importedEmpty.id).length, 0);
} finally {
  await db?._fileStore.close();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

process.stdout.write("SillyTavern bulk chat completeness checks passed.\n");
