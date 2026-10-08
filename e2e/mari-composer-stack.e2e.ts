import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { acquireMariThreadLock, releaseMariThreadLock } from "./mari-thread-lock.js";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

/**
 * Slice 83 (item 3): the transcript's last content must end above the composer stack, in every state
 * that changes the stack's height. Each case scrolls the transcript to its end and compares the lowest
 * transcript content with the top of the stack. A positive gap means content sits under the composer.
 */
test.beforeEach(async () => {
  await acquireMariThreadLock();
});

test.afterEach(() => {
  releaseMariThreadLock();
});

const LONG_ANSWER = Array.from(
  { length: 6 },
  (_, line) => `Line ${line + 1}: a paragraph long enough to wrap on a phone screen and take real height.`,
).join("\n\n");

async function openMariFixture(page: Page, request: APIRequestContext) {
  const connection = await request.post("/api/connections", {
    data: {
      name: `Composer stack fixture ${Date.now().toString(36)}`,
      provider: "custom",
      baseUrl: "http://127.0.0.1:9/v1",
      apiKey: "fixture",
      model: "fixture",
      maxContext: 65536,
    },
  });
  expect(connection.ok(), await connection.text()).toBeTruthy();
  const connectionId = ((await connection.json()) as { id: string }).id;
  const mariChat = (await (
    await request.get(`/api/chats/internal/professor-mari?connectionId=${connectionId}`)
  ).json()) as { id: string };
  await page.addInitScript((v) => localStorage.setItem("marinara:whats-new:seen-version", v), APP_VERSION);
  await seedUIState(page, {
    hasCompletedOnboarding: true,
    rightPanelOpen: false,
    sidebarOpen: false,
    professorMariNavigationEnabled: false,
  });
  return { connectionId, chatId: mariChat.id };
}

async function seedAnswers(request: APIRequestContext, chatId: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const response = await request.post(`/api/chats/${chatId}/messages`, {
      data: { role: "assistant", content: `Answer ${index + 1}.\n\n${LONG_ANSWER}` },
    });
    expect(response.ok()).toBeTruthy();
  }
}

async function cleanup(request: APIRequestContext, connectionId: string) {
  const threads = (await (await request.get("/api/chats/internal/professor-mari/chats")).json()) as Array<{
    id: string;
  }>;
  for (const thread of threads)
    await request.delete(`/api/chats/internal/professor-mari/chats/${thread.id}`).catch(() => undefined);
  if (connectionId) await request.delete(`/api/connections/${connectionId}`).catch(() => undefined);
}

/** Scroll the transcript to its end, then return how far its lowest content sits under the stack top. */
function contentUnderStack(page: Page) {
  return page.evaluate(() => {
    const pane = document.querySelector('[data-component="GlobalOmnibar.Mari"]:not([aria-hidden="true"])');
    const transcript = pane?.querySelector<HTMLElement>('[data-component="HomeProfessorMariChat.Transcript"]');
    const stack = transcript?.querySelector<HTMLElement>(".mari-transcript-stack");
    const dock = pane?.querySelector<HTMLElement>(".mari-workspace-composer-dock");
    if (!transcript || !stack || !dock) return null;
    transcript.scrollTop = transcript.scrollHeight;
    const dockTop = dock.getBoundingClientRect().top;
    let lowest = 0;
    for (const element of Array.from(stack.querySelectorAll<HTMLElement>("*"))) {
      const rect = element.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) lowest = Math.max(lowest, rect.bottom);
    }
    return Math.round(lowest - dockTop);
  });
}

test("the last answer ends above the composer, and stays so while the composer grows and shrinks", async ({
  page,
  request,
}) => {
  const { connectionId, chatId } = await openMariFixture(page, request);
  try {
    await seedAnswers(request, chatId, 2);
    await page.goto("/");
    await page.locator("main").first().click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    const pane = page.locator('[data-component="GlobalOmnibar.Mari"]:not([aria-hidden="true"])');
    const composer = pane.locator("textarea:visible");
    await expect(composer).toBeVisible();
    await expect.poll(() => contentUnderStack(page), { message: "answers at rest" }).toBeLessThanOrEqual(1);

    await composer.fill(Array.from({ length: 12 }, (_, line) => `draft line ${line + 1}`).join("\n"));
    await expect.poll(() => contentUnderStack(page), { message: "composer at its cap" }).toBeLessThanOrEqual(1);
    await composer.fill("");
    await expect.poll(() => contentUnderStack(page), { message: "composer shrunk back" }).toBeLessThanOrEqual(1);
  } finally {
    await cleanup(request, connectionId);
  }
});

test("the empty state ends above the composer after Mari, Search, Mari", async ({ page, request }) => {
  const { connectionId } = await openMariFixture(page, request);
  try {
    await page.goto("/");
    await page.locator("main").first().click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+k");
    await page.locator('[data-component="GlobalOmnibar.ProfessorMariButton"]').click();
    const pane = page.locator('[data-component="GlobalOmnibar.Mari"]:not([aria-hidden="true"])');
    await expect(pane.locator("textarea:visible")).toBeVisible();
    await expect.poll(() => contentUnderStack(page), { message: "first open" }).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(pane).toHaveCount(0);
    await page.keyboard.press("Control+j");
    await expect(pane.locator("textarea:visible")).toBeVisible();
    await expect.poll(() => contentUnderStack(page), { message: "back to Mari" }).toBeLessThanOrEqual(1);
  } finally {
    await cleanup(request, connectionId);
  }
});

test("answers end above the composer after Mari, Search, Mari", async ({ page, request }) => {
  const { connectionId, chatId } = await openMariFixture(page, request);
  try {
    await seedAnswers(request, chatId, 2);
    await page.goto("/");
    await page.locator("main").first().click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    const pane = page.locator('[data-component="GlobalOmnibar.Mari"]:not([aria-hidden="true"])');
    await expect(pane.locator("textarea:visible")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(pane).toHaveCount(0);
    await page.keyboard.press("Control+j");
    await expect(pane.locator("textarea:visible")).toBeVisible();
    await expect.poll(() => contentUnderStack(page), { message: "answers after Mari, Search, Mari" }).toBeLessThanOrEqual(1);
  } finally {
    await cleanup(request, connectionId);
  }
});

test("mobile: answers end above the composer when the keyboard opens and closes", async ({ page, request }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "The software keyboard is a phone concern.");
  const { connectionId, chatId } = await openMariFixture(page, request);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAnswers(request, chatId, 2);
    await page.goto("/");
    await page.locator("main").first().click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+j");
    const pane = page.locator('[data-component="GlobalOmnibar.Mari"]:not([aria-hidden="true"])');
    const composer = pane.locator("textarea:visible");
    await expect(composer).toBeVisible();
    for (const round of [1, 2]) {
      await composer.focus();
      await page.setViewportSize({ width: 390, height: 500 });
      await expect.poll(() => contentUnderStack(page), { message: `keyboard open ${round}` }).toBeLessThanOrEqual(1);
      await page.setViewportSize({ width: 390, height: 844 });
      await composer.blur();
      await expect.poll(() => contentUnderStack(page), { message: `keyboard closed ${round}` }).toBeLessThanOrEqual(1);
    }
  } finally {
    await cleanup(request, connectionId);
  }
});
