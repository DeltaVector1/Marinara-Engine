import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

/**
 * D1: ⌘J / Ctrl+J ("Ask Mari about this") should still show the arrival when Mari's own chat
 * already has history, appended at the bottom of the transcript, not only on an empty chat —
 * otherwise a returning user just sees old history and the door's whole promise goes unmet.
 */

async function startFixtureProvider(reply: string): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((incoming, response) => {
    const chunks: Buffer[] = [];
    incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
    incoming.on("end", () => {
      const action = { say: reply, commands: [], stop: true };
      response.writeHead(200, { "content-type": "text/event-stream", connection: "close" });
      response.end(
        [
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: JSON.stringify(action) }, finish_reason: null }] })}`,
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}`,
          "data: [DONE]",
          "",
        ].join("\n\n"),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture provider address");
  return { server, baseUrl: `http://127.0.0.1:${address.port}/v1` };
}

async function prepareClient(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.addInitScript((v) => localStorage.setItem("marinara:whats-new:seen-version", v), APP_VERSION);
  await seedUIState(page, {
    hasCompletedOnboarding: true,
    rightPanelOpen: false,
    sidebarOpen: false,
    professorMariNavigationEnabled: false,
  });
}

async function openChatThenAskMari(page: Page, chatId: string) {
  await page.goto("/");
  await page.evaluate(async (id) => {
    const { useChatStore } = await import("/src/stores/chat.store.ts" as string);
    useChatStore.getState().setActiveChatId(id);
  }, chatId);
  await page
    .locator("main")
    .first()
    .click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+j");
}

test("Ctrl+J in a chat with existing Mari history appends the arrival instead of hiding it", async (
  { page, request },
  testInfo,
) => {
  test.skip(!testInfo.project.name.includes("desktop"), "The keyboard shortcut is covered on desktop.");

  const fixture = await startFixtureProvider("Hi there! How can I help?");
  let connectionId = "";
  let chatId = "";
  let mariChatId = "";
  try {
    const connection = await request.post("/api/connections", {
      data: {
        name: `Arrival fixture ${Date.now().toString(36)}`,
        provider: "custom",
        baseUrl: fixture.baseUrl,
        apiKey: "fixture",
        model: "fixture",
        maxContext: 65536,
      },
    });
    expect(connection.ok(), await connection.text()).toBeTruthy();
    connectionId = ((await connection.json()) as { id: string }).id;

    const mariChat = await request.get(`/api/chats/internal/professor-mari?connectionId=${connectionId}`);
    expect(mariChat.ok(), await mariChat.text()).toBeTruthy();
    mariChatId = ((await mariChat.json()) as { id: string }).id;
    // One real completed turn, so her own chat is non-empty before the arrival door opens.
    const prompted = await request.post("/api/professor-mari/workspace/prompt", {
      data: { chatId: mariChatId, connectionId, message: "Hello Mari" },
    });
    expect(prompted.ok(), await prompted.text()).toBeTruthy();

    const chat = await request.post("/api/chats", {
      data: { name: "Arrival test chat", mode: "conversation", characterIds: [] },
    });
    expect(chat.ok(), await chat.text()).toBeTruthy();
    chatId = ((await chat.json()) as { id: string }).id;

    await prepareClient(page, 1440);
    await openChatThenAskMari(page, chatId);

    const mariPane = page.locator('[data-component="GlobalOmnibar.Mari"]');
    await expect(mariPane).toBeVisible();
    // Her existing history is still there, not replaced...
    await expect(mariPane.getByText("Hello Mari")).toBeVisible();
    // ...and the arrival is appended at the bottom.
    const appended = mariPane.locator('[data-component="HomeProfessorMariChat.AppendedArrival"]');
    await expect(appended).toBeVisible();
    await expect(appended).toContainText("Arrival test chat");
    // Exactly one pull-morph target on screen: the appended arrival's sprite, not an older resting one.
    await expect(mariPane.locator('[data-mari-pull-target="mari-current"]')).toHaveCount(1);
    await expect(appended.locator('[data-mari-pull-target="mari-current"]')).toHaveCount(1);
    await page.screenshot({ path: "test-results/mari-arrival-append-1440.png" });

    // Leaving and reopening through the same door replaces the block, never stacks a second one.
    await page.evaluate(async () => {
      const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
      useUIStore.getState().setOmnibarOpen(false);
    });
    await expect(page.locator('[data-component="GlobalOmnibar"]')).toBeHidden();
    await page
      .locator("main")
      .first()
      .click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    await expect(appended).toHaveCount(1);

    // Sending a real message clears the local-only block (it never lingers once you're really typing to her).
    await mariPane.locator("textarea:visible").fill("What's new here?");
    await page.keyboard.press("Control+Enter");
    await expect(appended).toHaveCount(0);
  } finally {
    fixture.server.close();
    if (chatId) await request.delete(`/api/chats/${chatId}?force=true`).catch(() => undefined);
    if (mariChatId) await request.delete(`/api/chats/internal/professor-mari/chats/${mariChatId}`).catch(() => undefined);
    if (connectionId) await request.delete(`/api/connections/${connectionId}`).catch(() => undefined);
  }
});

test("mobile: Ctrl+J in a chat with existing Mari history appends the arrival", async ({ page, request }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile-chromium"), "One mobile capture is enough proof.");

  const fixture = await startFixtureProvider("Hi there! How can I help?");
  let connectionId = "";
  let chatId = "";
  let mariChatId = "";
  try {
    const connection = await request.post("/api/connections", {
      data: {
        name: `Arrival fixture mobile ${Date.now().toString(36)}`,
        provider: "custom",
        baseUrl: fixture.baseUrl,
        apiKey: "fixture",
        model: "fixture",
        maxContext: 65536,
      },
    });
    expect(connection.ok(), await connection.text()).toBeTruthy();
    connectionId = ((await connection.json()) as { id: string }).id;

    const mariChat = await request.get(`/api/chats/internal/professor-mari?connectionId=${connectionId}`);
    mariChatId = ((await mariChat.json()) as { id: string }).id;
    const prompted = await request.post("/api/professor-mari/workspace/prompt", {
      data: { chatId: mariChatId, connectionId, message: "Hello Mari" },
    });
    expect(prompted.ok(), await prompted.text()).toBeTruthy();

    const chat = await request.post("/api/chats", {
      data: { name: "Arrival test chat mobile", mode: "conversation", characterIds: [] },
    });
    chatId = ((await chat.json()) as { id: string }).id;

    await prepareClient(page, 390);
    await openChatThenAskMari(page, chatId);

    const mariPane = page.locator('[data-component="GlobalOmnibar.Mari"]');
    await expect(mariPane).toBeVisible();
    const appended = mariPane.locator('[data-component="HomeProfessorMariChat.AppendedArrival"]');
    await expect(appended).toBeVisible();
    await expect(appended).toContainText("Arrival test chat mobile");
    await page.screenshot({ path: "test-results/mari-arrival-append-390.png" });
  } finally {
    fixture.server.close();
    if (chatId) await request.delete(`/api/chats/${chatId}?force=true`).catch(() => undefined);
    if (mariChatId) await request.delete(`/api/chats/internal/professor-mari/chats/${mariChatId}`).catch(() => undefined);
    if (connectionId) await request.delete(`/api/connections/${connectionId}`).catch(() => undefined);
  }
});
