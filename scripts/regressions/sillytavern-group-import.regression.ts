import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DB } from "../../packages/server/src/db/connection.js";

const fixtureRoot = mkdtempSync(join(tmpdir(), "marinara-st-group-import-"));
const dataDir = join(fixtureRoot, "data", "default-user");
const storageDir = join(fixtureRoot, "storage");
process.env.DATA_DIR = join(fixtureRoot, "marinara-data");
process.env.FILE_STORAGE_DIR = storageDir;
process.env.NODE_ENV = "test";
process.env.MARINARA_LITE = "true";

let db: DB | null = null;

try {
  mkdirSync(join(dataDir, "characters"), { recursive: true });
  mkdirSync(join(dataDir, "chats", "Twin_A"), { recursive: true });
  mkdirSync(join(dataDir, "chats", "Twin_B"), { recursive: true });
  mkdirSync(join(dataDir, "chats", "Legacy"), { recursive: true });
  mkdirSync(join(dataDir, "groups"), { recursive: true });
  mkdirSync(join(dataDir, "group chats"), { recursive: true });

  const characterCard = (name: string) => ({
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: { name, description: "", personality: "", scenario: "", first_mes: "", mes_example: "" },
  });
  writeFileSync(join(dataDir, "characters", "Doctor_Dottore.json"), JSON.stringify(characterCard("Il Dottore")));
  writeFileSync(join(dataDir, "characters", "Professor_Mari.json"), JSON.stringify(characterCard("Professor Mari")));
  writeFileSync(join(dataDir, "characters", "Twin_A.json"), JSON.stringify(characterCard("Twin")));
  writeFileSync(join(dataDir, "characters", "Twin_B.json"), JSON.stringify(characterCard("Twin")));
  writeFileSync(join(dataDir, "characters", "Legacy.json"), JSON.stringify(characterCard("Legacy")));
  const chat = (characterName: string, message: string) =>
    [
      { user_name: "User", character_name: characterName, chat_metadata: {} },
      { name: characterName, mes: message },
    ]
      .map((line) => JSON.stringify(line))
      .join("\n");
  writeFileSync(join(dataDir, "chats", "Twin_A", "a.jsonl"), chat("Twin", "Twin A's private chat."));
  writeFileSync(join(dataDir, "chats", "Twin_B", "b.jsonl"), chat("Twin", "Twin B's private chat."));
  writeFileSync(join(dataDir, "chats", "Legacy", "legacy.jsonl"), chat("Legacy", "Legacy fallback chat."));
  writeFileSync(
    join(dataDir, "groups", "lab-group.JSON"),
    JSON.stringify({
      id: "lab-group",
      name: "The Laboratory",
      members: ["Doctor_Dottore.png", "Professor_Mari.png"],
      chat_id: "current-chat",
      chats: ["past-chat", "current-chat"],
    }),
  );
  writeFileSync(
    join(dataDir, "group chats", "current-chat.JSONL"),
    [
      { user_name: "unused", character_name: "unused", chat_metadata: {} },
      { name: "Mari", is_user: true, mes: "Begin the experiment." },
      {
        name: "The Doctor",
        original_avatar: "Doctor_Dottore.png",
        is_user: false,
        mes: "Naturally.",
      },
    ]
      .map((line) => JSON.stringify(line))
      .join("\n"),
  );
  writeFileSync(
    join(dataDir, "group chats", "past-chat.jsonl"),
    [
      { user_name: "unused", character_name: "unused", chat_metadata: {} },
      {
        name: "Professor Mari",
        is_user: false,
        mes: "I have the notes.",
      },
    ]
      .map((line) => JSON.stringify(line))
      .join("\n"),
  );
  writeFileSync(
    join(dataDir, "groups", "twin-group.json"),
    JSON.stringify({
      id: "twin-group",
      name: "The Twins",
      members: ["Twin_A.json", "Twin_B.json"],
      chats: ["twins-session"],
    }),
  );
  writeFileSync(
    join(dataDir, "group chats", "twins-session.jsonl"),
    [
      { user_name: "unused", character_name: "unused", chat_metadata: {} },
      { name: "Twin_A", mes: "Twin A speaks." },
      { name: "Twin_B", mes: "Twin B speaks." },
    ]
      .map((line) => JSON.stringify(line))
      .join("\n"),
  );

  const { createFileNativeDB } = await import("../../packages/server/src/db/file-backed-store.js");
  const { chats, characters, messages } = await import("../../packages/server/src/db/schema/index.js");
  const { scanSTFolder, runSTBulkImport } =
    await import("../../packages/server/src/services/import/st-bulk.importer.js");
  db = await createFileNativeDB();

  const scan = await scanSTFolder(fixtureRoot);
  assert.equal(scan.groupChats.length, 3);
  for (const groupChat of scan.groupChats.filter((item) => item.groupName === "The Laboratory")) {
    assert.equal(groupChat.groupName, "The Laboratory");
    assert.deepEqual(groupChat.members, ["Doctor_Dottore", "Professor_Mari"]);
  }

  const result = await runSTBulkImport(
    fixtureRoot,
    {
      characters: true,
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
  assert.deepEqual(result.errors, []);
  assert.equal(result.imported.chats, 3);
  assert.equal(result.imported.groupChats, 3);

  const importedCharacters = await db.select().from(characters);
  const characterIdsByName = new Map(
    importedCharacters.map((character) => [JSON.parse(character.data).name as string, character.id]),
  );
  const importedChats = await db.select().from(chats);
  const labCharacterIds = [characterIdsByName.get("Il Dottore")!, characterIdsByName.get("Professor Mari")!];
  const laboratoryChats = importedChats.filter(
    (chat) =>
      JSON.parse(chat.characterIds).length === 2 &&
      labCharacterIds.every((id) => JSON.parse(chat.characterIds).includes(id)),
  );
  assert.equal(laboratoryChats.length, 2);
  assert.equal(new Set(laboratoryChats.map((chat) => chat.groupId)).size, 1);
  for (const importedChat of laboratoryChats) {
    assert.deepEqual(new Set(JSON.parse(importedChat.characterIds)), new Set(labCharacterIds));
  }
  const importedMessages = new Map((await db.select().from(messages)).map((message) => [message.content, message]));

  const twinIds = new Set(
    importedCharacters
      .filter((character) => JSON.parse(character.data).name === "Twin")
      .map((character) => character.id),
  );
  assert.equal(twinIds.size, 2);
  const twinPrivateChats = importedChats.filter((chat) => {
    const ids: string[] = JSON.parse(chat.characterIds);
    return ids.length === 1 && twinIds.has(ids[0]!);
  });
  assert.equal(twinPrivateChats.length, 2);
  const twinIdByBranch = new Map(
    twinPrivateChats.map((chat) => [
      JSON.parse(chat.metadata).branchName as string,
      JSON.parse(chat.characterIds)[0] as string,
    ]),
  );
  assert.equal(twinIdByBranch.get("a"), importedMessages.get("Twin A speaks.")?.characterId);
  assert.equal(twinIdByBranch.get("b"), importedMessages.get("Twin B speaks.")?.characterId);
  const twinGroup = importedChats.find((chat) => chat.name === "The Twins");
  assert(twinGroup);
  assert.deepEqual(new Set(JSON.parse(twinGroup.characterIds)), twinIds);

  assert.equal(importedMessages.get("Begin the experiment.")?.role, "user");
  assert.equal(importedMessages.get("Begin the experiment.")?.characterId, null);
  assert.equal(importedMessages.get("Naturally.")?.characterId, characterIdsByName.get("Il Dottore"));
  assert.equal(importedMessages.get("I have the notes.")?.characterId, characterIdsByName.get("Professor Mari"));
  assert(twinIds.has(importedMessages.get("Twin A speaks.")?.characterId ?? ""));
  assert(twinIds.has(importedMessages.get("Twin B speaks.")?.characterId ?? ""));
  assert.notEqual(
    importedMessages.get("Twin A speaks.")?.characterId,
    importedMessages.get("Twin B speaks.")?.characterId,
  );

  const twinA = scan.characters.find((character) => character.path.endsWith("/Twin_A.json"));
  const legacy = scan.characters.find((character) => character.path.endsWith("/Legacy.json"));
  const twinAChat = scan.chats.find((item) => item.folderName === "Twin_A");
  const legacyChat = scan.chats.find((item) => item.folderName === "Legacy");
  assert(twinA && legacy && twinAChat && legacyChat);
  const legacyId = importedCharacters.find((character) => JSON.parse(character.data).name === "Legacy")!.id;
  const existingChatIds = new Set(importedChats.map((item) => item.id));
  const subsetResult = await runSTBulkImport(
    fixtureRoot,
    {
      characters: [twinA.id],
      chats: [twinAChat.id, legacyChat.id],
      groupChats: false,
      presets: false,
      lorebooks: false,
      backgrounds: false,
      personas: false,
    },
    db,
  );
  assert.equal(subsetResult.imported.characters, 1);
  assert.equal(subsetResult.imported.chats, 2);
  assert.deepEqual(subsetResult.errors, []);
  const afterSubsetCharacters = await db.select().from(characters);
  const newTwinId = afterSubsetCharacters.find(
    (character) => JSON.parse(character.data).name === "Twin" && !twinIds.has(character.id),
  )?.id;
  assert(newTwinId);
  const subsetChats = (await db.select().from(chats)).filter((item) => !existingChatIds.has(item.id));
  assert.equal(subsetChats.length, 2);
  const subsetIdByBranch = new Map(
    subsetChats.map((item) => [
      JSON.parse(item.metadata).branchName as string,
      JSON.parse(item.characterIds)[0] as string,
    ]),
  );
  assert.equal(subsetIdByBranch.get("a"), newTwinId);
  assert.equal(subsetIdByBranch.get("legacy"), legacyId);
} finally {
  await db?._fileStore.close();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("SillyTavern group import regression checks passed.");
