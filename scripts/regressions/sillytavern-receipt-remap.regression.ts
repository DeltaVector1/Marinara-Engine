import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dataDir = mkdtempSync(join(tmpdir(), "marinara-st-receipt-remap-"));
const envFile = join(dataDir, ".env");
writeFileSync(envFile, "");
process.env.DATA_DIR = dataDir;
process.env.FILE_STORAGE_DIR = join(dataDir, "storage");
process.env.MARINARA_ENV_FILE = envFile;
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";

const { buildApp } = await import("../../packages/server/src/app.js");
const { getDB } = await import("../../packages/server/src/db/connection.js");
const { createChatsStorage } = await import("../../packages/server/src/services/storage/chats.storage.js");
const { importSTChat } = await import("../../packages/server/src/services/import/st-chat.importer.js");
const app = await buildApp();
await app.ready();
const db = await getDB();
const storage = createChatsStorage(db);

const countImportSelects = async (count: number) => {
  const lines = [JSON.stringify({ user_name: "User", character_name: "Character" })];
  for (let i = 0; i < count; i++) {
    lines.push(JSON.stringify({ name: "User", is_user: true, mes: `Message ${i}` }));
  }
  const select = db.select.bind(db);
  let reads = 0;
  db.select = ((...args: Parameters<typeof db.select>) => {
    reads++;
    return select(...args);
  }) as typeof db.select;
  try {
    const result = await importSTChat(lines.join("\n"), db);
    assert.ok(result.chatId, JSON.stringify(result));
  } finally {
    db.select = select;
  }
  return reads;
};

try {
  const oneMessageReads = await countImportSelects(1);
  const manyMessageReads = await countImportSelects(80);
  assert.equal(
    manyMessageReads,
    oneMessageReads,
    `Ordinary imports should not add one receipt-scan query per message (${oneMessageReads} -> ${manyMessageReads})`,
  );

  const receipt = {
    targetMessageId: "source-target",
    targetSwipeIndex: 0,
    originalContent: "The whole answer.",
    interruptedContent: "The cut answer.",
  };
  const target = {
    marinara_message_id: "source-target",
    is_user: true,
    mes: "The cut answer.",
  };
  const owner = {
    marinara_message_id: "source-owner",
    is_user: false,
    mes: "Wait.",
    swipes: ["Wait.", "One more thing."],
    swipe_id: 1,
    extra: {
      marinara_swipes: [
        {
          index: 0,
          extra: {
            roleplayCommandActivity: [
              { command: { type: "interrupt", part: "answer" }, raw: "[interrupt]", interruption: receipt },
            ],
          },
        },
      ],
    },
  };
  const mapped = await importSTChat(
    [
      JSON.stringify({ user_name: "User", character_name: "Character" }),
      JSON.stringify(target),
      JSON.stringify(owner),
    ].join("\n"),
    db,
  );
  assert.ok(mapped.chatId, JSON.stringify(mapped));
  const mappedMessages = await storage.listMessages(mapped.chatId);
  const mappedSwipes = await storage.getSwipes(mappedMessages[1]!.id);
  const mappedTargetSwipes = await storage.getSwipes(mappedMessages[0]!.id);
  const mappedReceipt = JSON.parse(String(mappedSwipes[0]!.extra)).roleplayCommandActivity[0].interruption;
  assert.equal(mappedReceipt.targetMessageId, mappedMessages[0]!.id);
  assert.notEqual(mappedReceipt.targetMessageId, "source-target");
  assert.equal(mappedReceipt.targetSwipeIndex, 0);
  assert.equal(mappedReceipt.targetSwipeId, mappedTargetSwipes[0]!.id);
  assert.equal(mappedReceipt.restored, undefined, "A valid receipt on a non-active swipe remains usable");

  const active = await importSTChat(
    [
      JSON.stringify({ user_name: "User", character_name: "Character" }),
      JSON.stringify(target),
      JSON.stringify({
        ...owner,
        extra: {
          roleplayCommandActivity: [
            { command: { type: "interrupt", part: "answer" }, raw: "[interrupt]", interruption: receipt },
          ],
        },
      }),
    ].join("\n"),
    db,
  );
  assert.ok(active.chatId, JSON.stringify(active));
  const activeMessages = await storage.listMessages(active.chatId);
  const activeOwner = await storage.getMessage(activeMessages[1]!.id);
  const activeReceipt = JSON.parse(String(activeOwner?.extra)).roleplayCommandActivity[0].interruption;
  assert.equal(activeReceipt.targetMessageId, activeMessages[0]!.id);
  assert.notEqual(activeReceipt.targetMessageId, "source-target");
  assert.equal(activeReceipt.restored, undefined, "A valid receipt on the active swipe remains usable");

  const missing = await importSTChat(
    [
      JSON.stringify({ user_name: "User", character_name: "Character" }),
      JSON.stringify({
        ...owner,
        marinara_message_id: undefined,
        extra: {
          roleplayCommandActivity: [
            { command: { type: "interrupt", part: "answer" }, raw: "[interrupt]", interruption: receipt },
          ],
        },
      }),
    ].join("\n"),
    db,
  );
  assert.ok(missing.chatId, JSON.stringify(missing));
  const missingMessage = (await storage.listMessages(missing.chatId))[0]!;
  const missingReceipt = JSON.parse(String(missingMessage.extra)).roleplayCommandActivity[0].interruption;
  assert.equal(missingReceipt.targetMessageId, "source-target");
  assert.equal(missingReceipt.restored, true, "An unresolved valid receipt is retained and disabled");
  console.log(JSON.stringify({ oneMessageReads, manyMessageReads }));
} finally {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
