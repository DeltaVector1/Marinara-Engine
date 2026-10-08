import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { acquireMariThreadLock, releaseMariThreadLock } from "./mari-thread-lock.js";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

/**
 * Slice 73: "on a phone her composer sometimes sits higher, with a large gap below it". The omnibar panel
 * animated its height (the desktop dialog's transition), so each time the keyboard closed the composer
 * rode up to ~200 px high until the animation ended. The keyboard is the viewport shrinking and growing
 * back, as with `interactive-widget=resizes-content`; two frames after it closes, the composer dock must
 * end at the bottom of the screen (this run has no safe-area inset).
 */
test.beforeEach(async () => {
  await acquireMariThreadLock();
});

test.afterEach(() => {
  releaseMariThreadLock();
});

test("mobile: Mari's composer sits on the bottom edge right after the keyboard closes", async ({
  page,
  request,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "The software keyboard is a phone concern.");

  let connectionId = "";
  const mariChatIds: string[] = [];
  try {
    const connection = await request.post("/api/connections", {
      data: {
        name: `Composer keyboard fixture ${Date.now().toString(36)}`,
        provider: "custom",
        baseUrl: "http://127.0.0.1:9/v1",
        apiKey: "fixture",
        model: "fixture",
        maxContext: 65536,
      },
    });
    expect(connection.ok(), await connection.text()).toBeTruthy();
    connectionId = ((await connection.json()) as { id: string }).id;
    const mariChat = await request.get(`/api/chats/internal/professor-mari?connectionId=${connectionId}`);
    mariChatIds.push(((await mariChat.json()) as { id: string }).id);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((v) => localStorage.setItem("marinara:whats-new:seen-version", v), APP_VERSION);
    await seedUIState(page, {
      hasCompletedOnboarding: true,
      rightPanelOpen: false,
      sidebarOpen: false,
      professorMariNavigationEnabled: false,
    });
    await page.goto("/");
    await page
      .locator("main")
      .first()
      .click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    const mariPane = page.locator('[data-component="GlobalOmnibar.Mari"]');
    const composer = mariPane.locator("textarea:visible");
    await expect(composer).toBeVisible();
    const dockGap = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const dock = document.querySelector(".mari-workspace-composer-dock")!.getBoundingClientRect();
                resolve(Math.round(window.innerHeight - dock.bottom));
              }),
            ),
          ),
      );
    expect(await dockGap()).toBe(0);

    for (let round = 0; round < 2; round += 1) {
      await composer.focus();
      await page.setViewportSize({ width: 390, height: 500 });
      await expect.poll(dockGap).toBe(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await composer.blur();
      expect(await dockGap(), `round ${round + 1}: no gap under the composer after the keyboard closes`).toBe(0);
    }
    await page.screenshot({ path: "test-results/mari-composer-keyboard-proof/after-keyboard-390.png" });
  } finally {
    // The door may have started a thread of its own besides the one made above.
    const threads = (await (await request.get("/api/chats/internal/professor-mari/chats")).json()) as Array<{
      id: string;
    }>;
    for (const id of new Set([...mariChatIds, ...threads.map((thread) => thread.id)]))
      await request.delete(`/api/chats/internal/professor-mari/chats/${id}`).catch(() => undefined);
    if (connectionId) await request.delete(`/api/connections/${connectionId}`).catch(() => undefined);
  }
});
