import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// R3 (slice 62): Professor Mari's `chat.diagnose` read. Covers the payload shape (findings +
// generation numbers + lorebook budgets + preset sampler keys) against a known fixture, and the
// hard R22 requirement that no seeded message text ever reaches the payload.

const dataDir = mkdtempSync(join(tmpdir(), "marinara-chat-diagnose-"));
const previous = {
  DATA_DIR: process.env.DATA_DIR,
  FILE_STORAGE_DIR: process.env.FILE_STORAGE_DIR,
  MARINARA_FILE_STORAGE_DIR: process.env.MARINARA_FILE_STORAGE_DIR,
};
let db: Awaited<
  ReturnType<typeof import("../../packages/server/src/db/file-backed-store.js").createFileNativeDB>
> | null = null;

try {
  const fileStorageDir = join(dataDir, "file-storage");
  process.env.DATA_DIR = dataDir;
  process.env.FILE_STORAGE_DIR = fileStorageDir;
  process.env.MARINARA_FILE_STORAGE_DIR = fileStorageDir;

  const [
    { createFileNativeDB },
    { createChatsStorage },
    { createConnectionsStorage },
    { createPromptsStorage },
    { createLorebooksStorage },
    { MariDbService },
  ] = await Promise.all([
    import("../../packages/server/src/db/file-backed-store.js"),
    import("../../packages/server/src/services/storage/chats.storage.js"),
    import("../../packages/server/src/services/storage/connections.storage.js"),
    import("../../packages/server/src/services/storage/prompts.storage.js"),
    import("../../packages/server/src/services/storage/lorebooks.storage.js"),
    import("../../packages/server/src/services/mari-db/mari-db.service.js"),
  ]);
  db = await createFileNativeDB();

  const chats = createChatsStorage(db);
  const connections = createConnectionsStorage(db);
  const presets = createPromptsStorage(db);
  const lorebooks = createLorebooksStorage(db);
  const mariDb = new MariDbService(db);

  const preset = await presets.create({
    name: "Vivid Preset",
    parameters: { maxTokens: 300, enabledParameters: { temperature: true, topP: false } },
  } as never);
  const connection = await connections.create({
    name: "Conn A",
    provider: "openai",
    promptPresetId: preset!.id,
  } as never);
  const chat = await chats.create({
    name: "Trip chat",
    mode: "roleplay",
    characterIds: [],
    connectionId: connection!.id,
  } as never);
  const lorebook = await lorebooks.create({ name: "Haunted Archive", tokenBudget: 777, chatId: chat!.id } as never);

  const SEEDED_USER_SECRET = "ZEBRA-ALPHA-9f3k-the-user-said-this";
  const SEEDED_ASSISTANT_SECRET = "QUETZALCOATL-BETA-7x1-the-reply-said-this";
  await chats.createMessage({ chatId: chat!.id, role: "user", characterId: null, content: SEEDED_USER_SECRET });
  const assistantMsg = await chats.createMessage({
    chatId: chat!.id,
    role: "assistant",
    characterId: null,
    content: SEEDED_ASSISTANT_SECRET,
  });
  await chats.updateMessageExtra(assistantMsg!.id, {
    generationInfo: {
      model: "m",
      provider: "openai",
      finishReason: "length",
      tokensContext: 9300,
      maxContext: 8192,
      maxTokens: 300,
      tokensCompletion: 300,
      contextFit: {
        trimmed: true,
        droppedHistory: 7,
        tokensBefore: 9000,
        tokensAfter: 6900,
        inputBudget: 8000,
        replyBudgetFrom: 1024,
        replyBudgetTo: 300,
      },
    },
  });

  const result = await mariDb.executeAction({ action: "chat.diagnose", chatId: chat!.id, sessionId: "test" } as never);
  assert.equal(result.ok, true);
  const output = result.output as any;

  // ── Shape: findings + raw numbers + lorebook budgets + preset info, against the known fixture ──
  assert.equal(output.messageId, assistantMsg!.id, "omitted messageId resolves to the newest assistant reply");
  const codes = output.findings.map((f: { code: string }) => f.code);
  assert.ok(codes.includes("cut_off"), "finishReason length must surface the cut_off finding");
  assert.ok(codes.includes("history_trimmed"), "the saved contextFit drop must surface history_trimmed");
  const fixes = Object.fromEntries(output.findings.map((f: { code: string; fix: string }) => [f.code, f.fix]));
  assert.match(fixes.cut_off, /preset\.update/u, "a cut-off reply's one fix is the Max Tokens write");
  assert.match(fixes.history_trimmed, /Advanced Parameters/u, "a finding without its own write points to Chat Settings");
  assert.equal(output.generationInfo.tokensContext, 9300);
  assert.equal(output.generationInfo.maxContext, 8192);
  assert.equal(output.generationInfo.ended, "cut off at the output limit", "the end state is plain words");
  assert.ok(!("finishReason" in output.generationInfo), "the raw provider finishReason must not reach Mari");
  assert.equal(output.generationInfo.tokensCompletion, 300);
  assert.equal(output.generationInfo.contextFit.droppedHistory, 7);
  assert.deepEqual(output.lorebooks, [{ name: "Haunted Archive", tokenBudget: 777 }]);
  assert.equal(output.preset.name, "Vivid Preset");
  assert.deepEqual(
    output.preset.samplerKeys.sort(),
    ["temperature", "maxTokens", "topK", "frequencyPenalty", "presencePenalty", "reasoningEffort", "verbosity"].sort(),
  );
  assert.ok(!output.preset.samplerKeys.includes("topP"), "a sampler key disabled on the preset must be excluded");

  // ── R22: not one byte of either seeded message's own text may leave this action ──
  const serialized = JSON.stringify(output);
  assert.ok(!serialized.includes(SEEDED_USER_SECRET), "the user's message text must never reach the payload");
  assert.ok(!serialized.includes(SEEDED_ASSISTANT_SECRET), "the assistant's reply text must never reach the payload");

  // An explicit messageId is honored too, and still carries no text.
  const byId = await mariDb.executeAction({
    action: "chat.diagnose",
    chatId: chat!.id,
    messageId: assistantMsg!.id,
    sessionId: "test",
  } as never);
  assert.equal(byId.ok, true);
  assert.equal((byId.output as any).messageId, assistantMsg!.id);
  assert.ok(!JSON.stringify(byId.output).includes(SEEDED_ASSISTANT_SECRET));

  // A chat with no assistant/narrator reply yet returns an empty, well-shaped result.
  const freshChat = await chats.create({ name: "Fresh", mode: "roleplay", characterIds: [] } as never);
  const empty = await mariDb.executeAction({ action: "chat.diagnose", chatId: freshChat!.id, sessionId: "test" } as never);
  assert.equal(empty.ok, true);
  assert.deepEqual((empty.output as any).findings, []);
  assert.equal((empty.output as any).messageId, null);
} finally {
  await db?._fileStore.close();
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(dataDir, { recursive: true, force: true });
}

console.log("chat-diagnose regression passed");
