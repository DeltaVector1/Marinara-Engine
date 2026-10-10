import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { DB } from "../../packages/server/src/db/connection.js";

const fixtureRoot = mkdtempSync(join(tmpdir(), "marinara-st-bulk-checkpoint-"));
const dataDir = join(fixtureRoot, "data", "default-user");
const firstStorageDir = join(fixtureRoot, "storage-first");
const rejectedStorageDir = join(fixtureRoot, "storage-rejected");
process.env.DATA_DIR = join(fixtureRoot, "marinara-data");
process.env.FILE_STORAGE_DIR = firstStorageDir;
process.env.MARINARA_ENV_FILE = join(fixtureRoot, ".env");
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";
writeFileSync(process.env.MARINARA_ENV_FILE, "");

let db: DB | null = null;
let rejectedDb: DB | null = null;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function persistedChatRows(storageDir: string) {
  const chatDir = join(storageDir, "tables", "chats");
  if (!existsSync(chatDir)) return [];
  return readdirSync(chatDir)
    .filter((name) => name.endsWith(".json"))
    .flatMap(
      (name) => JSON.parse(readFileSync(join(chatDir, name), "utf8")) as Array<{ id: string; metadata: string }>,
    );
}

try {
  mkdirSync(join(dataDir, "characters", "Checkpoint Character"), { recursive: true });
  mkdirSync(join(dataDir, "chats", "Checkpoint Character"), { recursive: true });
  const header = { user_name: "User", character_name: "Checkpoint Character", chat_metadata: {} };
  for (const name of ["first.jsonl", "second.jsonl"])
    writeFileSync(
      join(dataDir, "chats", "Checkpoint Character", name),
      [header, { name: "Checkpoint Character", mes: `Message from ${name}.` }]
        .map((value) => JSON.stringify(value))
        .join("\n"),
    );

  const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
  const { chats } = await import("../../packages/server/src/db/schema/index.js");
  const { scanSTFolder, runSTBulkImport } =
    await import("../../packages/server/src/services/import/st-bulk.importer.js");
  const scan = await scanSTFolder(fixtureRoot);
  assert.equal(scan.success, true);
  assert.equal(scan.chats.length, 2);
  const previousBranch = basename(scan.chats[0]!.path, ".jsonl");
  const { promise: enteredSecondCallback, resolve: markEntered } = deferred();
  const { promise: gate, resolve: release } = deferred();
  let settled = false;

  db = await createFileNativeDB();
  const importing = runSTBulkImport(
    fixtureRoot,
    {
      characters: false,
      chats: scan.chats.map((item) => item.id),
      groupChats: false,
      presets: false,
      lorebooks: false,
      backgrounds: false,
      personas: false,
    },
    db,
    async (progress) => {
      if (progress.category !== "Chats" || progress.current !== 2) return;
      await db!._fileStore.flush(false, true);
      const saved = persistedChatRows(firstStorageDir);
      assert.equal(saved.length, 1, "the first imported file is on disk before import enters the second");
      assert.equal(JSON.parse(saved[0]!.metadata).branchName, previousBranch);
      assert.equal((await db!.select().from(chats)).length, 1);
      markEntered();
      await gate;
    },
  ).then(
    (result) => {
      settled = true;
      return result;
    },
    (error) => {
      settled = true;
      throw error;
    },
  );

  await enteredSecondCallback;
  assert.equal(settled, false, "the importer waits for the second file's progress callback");
  assert.equal(
    persistedChatRows(firstStorageDir).length,
    1,
    "the second file has not started while the callback is gated",
  );
  release();
  const result = await importing;
  assert.equal(result.imported.chats, 2);
  await db._fileStore.flush(false, true);
  assert.equal(persistedChatRows(firstStorageDir).length, 2);

  process.env.FILE_STORAGE_DIR = rejectedStorageDir;
  rejectedDb = await createFileNativeDB();
  const callbackFailure = new Error("checkpoint callback rejected");
  await assert.rejects(
    runSTBulkImport(
      fixtureRoot,
      {
        characters: false,
        chats: scan.chats.map((item) => item.id),
        groupChats: false,
        presets: false,
        lorebooks: false,
        backgrounds: false,
        personas: false,
      },
      rejectedDb,
      async (progress) => {
        if (progress.category === "Chats" && progress.current === 2) throw callbackFailure;
      },
    ),
    (error) => error === callbackFailure,
  );
  assert.equal(
    (await rejectedDb.select().from(chats)).length,
    1,
    "callback rejection stops before importing the next file",
  );
} finally {
  await rejectedDb?._fileStore.close();
  await db?._fileStore.close();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

process.stdout.write("SillyTavern bulk checkpoint regression passed.\n");
