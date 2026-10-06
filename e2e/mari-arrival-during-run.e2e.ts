import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

/**
 * R13 (slice 62g): opening Mari from a chat (⌘J) while she is still working in another thread must not
 * reroute the moment the run ends. Slice 62b switched threads as soon as isBusy cleared, so the finished
 * run's done marks and "Worked for" line vanished unseen. The finished run stays on screen first; only
 * then does the arrival land in that chat's own thread.
 */
test("an arrival during a run waits until the finished run has been shown", async ({ page, request }, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"), "The keyboard door is covered on desktop.");
  test.setTimeout(90_000);

  const rounds: Array<{ delayMs: number; say: string }> = [
    { delayMs: 0, say: "Hi, general thread here." },
    { delayMs: 0, say: "Noted, this thread is about that chat." },
    { delayMs: 5_000, say: "Here is the slow answer." },
  ];
  const provider = createServer((incoming, response) => {
    incoming.resume();
    // Model-list probes are not a round of her run.
    if (incoming.method !== "POST") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "fixture" }] }));
      return;
    }
    incoming.on("end", () => {
      const round = rounds.shift() ?? { delayMs: 0, say: "Done." };
      const action = { say: round.say, commands: [], stop: true };
      setTimeout(() => {
        response.writeHead(200, { "content-type": "text/event-stream", connection: "close" });
        response.end(
          [
            `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: JSON.stringify(action) }, finish_reason: null }] })}`,
            `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}`,
            "data: [DONE]",
            "",
          ].join("\n\n"),
        );
      }, round.delayMs);
    });
  });
  await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));

  let connectionId = "";
  let chatId = "";
  const mariChatIds: string[] = [];
  try {
    const address = provider.address();
    if (!address || typeof address === "string") throw new Error("Missing fixture provider address");
    const connection = await request.post("/api/connections", {
      data: {
        name: `Arrival during run ${Date.now().toString(36)}`,
        provider: "custom",
        baseUrl: `http://127.0.0.1:${address.port}/v1`,
        apiKey: "fixture",
        model: "fixture",
        maxContext: 65536,
      },
    });
    expect(connection.ok(), await connection.text()).toBeTruthy();
    connectionId = ((await connection.json()) as { id: string }).id;

    const general = await request.get(`/api/chats/internal/professor-mari?connectionId=${connectionId}`);
    const generalId = ((await general.json()) as { id: string }).id;
    mariChatIds.push(generalId);
    // A first message, so the restart below cannot reuse this thread as an empty one.
    const greeted = await request.post("/api/professor-mari/workspace/prompt", {
      data: { chatId: generalId, connectionId, message: "Hello from Home" },
    });
    expect(greeted.ok(), await greeted.text()).toBeTruthy();

    const chat = await request.post("/api/chats", {
      data: { name: "Arrival during run chat", mode: "conversation", characterIds: [] },
    });
    chatId = ((await chat.json()) as { id: string }).id;
    // That chat's own thread, with one earlier exchange in it.
    const keyed = await request.post(
      `/api/chats/internal/professor-mari/restart?connectionId=${connectionId}&contextKey=chat:${chatId}&contextLabel=Arrival%20during%20run%20chat`,
    );
    expect(keyed.ok(), await keyed.text()).toBeTruthy();
    const keyedId = ((await keyed.json()) as { id: string }).id;
    expect(keyedId).not.toBe(generalId);
    mariChatIds.push(keyedId);
    const seeded = await request.post("/api/professor-mari/workspace/prompt", {
      data: { chatId: keyedId, connectionId, message: "Remember this chat for me" },
    });
    expect(seeded.ok(), await seeded.text()).toBeTruthy();
    await seeded.text();
    await request.post(`/api/chats/internal/professor-mari/chats/${generalId}/activate`);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((v) => localStorage.setItem("marinara:whats-new:seen-version", v), APP_VERSION);
    await seedUIState(page, {
      hasCompletedOnboarding: true,
      rightPanelOpen: false,
      sidebarOpen: false,
      reduceAmbientEffects: true,
      professorMariNavigationEnabled: false,
    });
    await page.goto("/");
    await page
      .locator("main")
      .first()
      .click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    const mariPane = page.locator('[data-component="GlobalOmnibar.Mari"]');
    await expect(mariPane).toBeVisible();
    await expect(mariPane.getByText("Hello from Home")).toBeVisible();
    await mariPane.locator("textarea:visible").fill("A slow question");
    await page.keyboard.press("Control+Enter");
    await expect(mariPane.locator('.mari-work-timeline[data-active="true"]')).toBeVisible();

    // While she works: back to search (⌘J inside her pane), over to the chat that has its own thread,
    // and ⌘J from there - the chat's arrival door, with her pane still mounted.
    await page.keyboard.press("Control+j");
    await expect(page.getByPlaceholder(/Search everything/)).toBeVisible();
    await page.evaluate(async (id) => {
      const { useChatStore } = await import("/src/stores/chat.store.ts" as string);
      useChatStore.getState().setActiveChatId(id);
    }, chatId);
    await expect(page.getByText("Current chat: Arrival during run chat")).toBeVisible();
    await page.keyboard.press("Control+j");
    await expect(page.getByPlaceholder(/Search everything/)).toBeHidden();

    // The run finishes in the thread it ran in, and its done line stays on screen.
    const finished = mariPane.locator('.mari-work-timeline[data-active="false"]').filter({
      hasText: "Here is the slow answer.",
    });
    await expect(finished).toBeVisible({ timeout: 20_000 });
    await expect(finished.locator(".mari-work-timeline__done-mark")).toBeVisible();
    await page.screenshot({ path: ".tmp/omnibar-ux/62g/arrival-during-run-finished-1440.png" });
    await page.waitForTimeout(2_500);
    await expect(finished, "no reroute before the finished run has been shown").toBeVisible();

    // Then the arrival lands in that chat's own thread, with its history.
    await expect(mariPane.getByText("Remember this chat for me")).toBeVisible({ timeout: 10_000 });
    await expect(mariPane.getByText("Here is the slow answer.")).toHaveCount(0);
    await page.screenshot({ path: ".tmp/omnibar-ux/62g/arrival-during-run-rerouted-1440.png" });
  } finally {
    if (chatId) await request.delete(`/api/chats/${chatId}?force=true`).catch(() => undefined);
    for (const id of mariChatIds)
      await request.delete(`/api/chats/internal/professor-mari/chats/${id}`).catch(() => undefined);
    if (connectionId) await request.delete(`/api/connections/${connectionId}`).catch(() => undefined);
    await new Promise<void>((resolve) => provider.close(() => resolve()));
  }
});
