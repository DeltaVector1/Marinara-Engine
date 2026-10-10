import { expect, test } from "@playwright/test";

test("a failed Roleplay tracker reset keeps its data and reports the failure", async ({ page }) => {
  const chatName = `Tracker reset ${Date.now()}`;
  const createdChat = await page.request.post("/api/chats", {
    data: { name: chatName, mode: "roleplay", characterIds: [] },
  });
  expect(createdChat.ok()).toBeTruthy();
  const chat = (await createdChat.json()) as { id: string };

  try {
    const metadata = await page.request.patch(`/api/chats/${chat.id}/metadata`, {
      data: { enableAgents: true, activeAgentIds: ["world-state"], manualTrackers: true },
    });
    expect(metadata.ok()).toBeTruthy();
    const seededState = await page.request.patch(`/api/chats/${chat.id}/game-state`, {
      data: { location: "Tracker reset proof", manual: true },
    });
    expect(seededState.ok()).toBeTruthy();

    await page.route(`**/api/chats/${chat.id}/game-state`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Tracker reset unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    await page.locator(`[data-chat-id="${chat.id}"]`).click();
    await page.locator("[data-chat-settings-button]").click();
    const activity = page.locator('[data-drawer="roleplay-agent-activity"]');
    await activity.locator("[data-drawer-toggle]").click();
    await activity.getByRole("button", { name: "Clear trackers" }).click();
    await page.getByRole("button", { name: "Clear trackers" }).last().click();

    await expect(page.getByText("Tracker reset unavailable")).toBeVisible();
    await expect(activity.getByRole("button", { name: "Clear trackers" })).toBeVisible();
    const persistedState = await page.request.get(`/api/chats/${chat.id}/game-state`);
    expect((await persistedState.json()).location).toBe("Tracker reset proof");
  } finally {
    await page.request.delete(`/api/chats/${chat.id}`).catch(() => undefined);
  }
});
