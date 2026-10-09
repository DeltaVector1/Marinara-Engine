import { expect, test } from "@playwright/test";
import { createServer } from "node:http";

test("chat shell opens settings and switches between retained modes", { tag: "@smoke" }, async ({ page }) => {
  const chats = await Promise.all(
    (["conversation", "roleplay"] as const).map(async (mode) => {
      const response = await page.request.post("/api/chats", {
        data: { name: `Smoke ${mode} ${Date.now()}`, mode, characterIds: [] },
      });
      expect(response.ok()).toBeTruthy();
      return { mode, ...((await response.json()) as { id: string }) };
    }),
  );
  try {
    await page.addInitScript((chatId) => localStorage.setItem("marinara-active-chat-id", chatId), chats[0]!.id);
    await page.goto("/");
    await page.locator('[data-tour="sidebar-toggle"]').click();
    const sidebar = page.locator('[data-component="ChatSidebar"]');
    await expect(sidebar).toBeVisible();
    for (const mode of ["conversation", "roleplay"] as const) {
      await page.locator(`[data-tour="chat-mode-${mode}"]`).click();
      await expect(sidebar.locator(`[data-chat-id="${chats.find((chat) => chat.mode === mode)!.id}"]`)).toBeVisible();
    }
    await page.locator('[data-component="TopBar"]').getByTitle("Home").click();
    await page.locator('[data-tour="panel-settings"]').click();
    await expect(page.locator('[data-component="RightPanel"]')).toBeVisible();
  } finally {
    await Promise.all(chats.map(({ id }) => page.request.delete(`/api/chats/${id}?force=true`)));
  }
});

test("Conversation and Roleplay render a completed generated reply", { tag: "@smoke" }, async ({ page }) => {
  const connectionResponse = await page.request.post("/api/connections", {
    data: {
      name: `Generation smoke provider ${Date.now()}`,
      provider: "custom",
      baseUrl: "http://127.0.0.1:1/v1",
      apiKey: "smoke-key",
      model: "smoke-model",
      maxContext: 32768,
    },
  });
  expect(connectionResponse.ok()).toBeTruthy();
  const connectionId = ((await connectionResponse.json()) as { id: string }).id;
  try {
    for (const mode of ["conversation", "roleplay"] as const) {
      const response = await page.request.post("/api/chats", {
        data: {
          name: `Generation ${mode} ${Date.now()}`,
          mode,
          characterIds: [],
          connectionId,
        },
      });
      expect(response.ok()).toBeTruthy();
      const chat = (await response.json()) as { id: string };
      try {
        const reply = `A generated ${mode} reply.`;
        await page.route("**/api/generate", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: [
              { type: "token", data: reply },
              {
                type: "message_saved",
                data: {
                  id: `smoke-${mode}-reply`,
                  chatId: chat.id,
                  role: "assistant",
                  characterId: null,
                  content: reply,
                  activeSwipeIndex: 0,
                  extra: {},
                  createdAt: new Date().toISOString(),
                },
              },
              { type: "done", data: {} },
            ]
              .map((event) => `data: ${JSON.stringify(event)}\n\n`)
              .join(""),
          });
        });
        await page.addInitScript((chatId) => localStorage.setItem("marinara-active-chat-id", chatId), chat.id);
        await page.goto("/");
        await page.locator("textarea.mari-chat-input-textarea").fill(`Reply in ${mode}`);
        await page.locator("button.mari-chat-send-btn").click();
        await expect(page.locator(`[data-message-id="smoke-${mode}-reply"]`)).toContainText(reply);
        await page.unroute("**/api/generate");
      } finally {
        await page.request.delete(`/api/chats/${chat.id}?force=true`);
      }
    }
  } finally {
    await page.request.delete(`/api/connections/${connectionId}`);
  }
});

test(
  "stopped and refused Roleplay replies do not duplicate or restore sent text",
  { tag: "@smoke" },
  async ({ page, request }) => {
    const requests: unknown[] = [];
    const openResponses = new Set<import("node:http").ServerResponse>();
    const provider = createServer((incoming, response) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      incoming.on("end", () => {
        requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        if (requests.length === 2) {
          response.writeHead(403, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: { message: "Content prohibited by the provider" } }));
          return;
        }
        openResponses.add(response);
        response.on("close", () => openResponses.delete(response));
        response.writeHead(200, { "content-type": "text/event-stream", connection: "keep-alive" });
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "Partial" } }] })}\n\n`);
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
    let connectionId = "";
    let chatId = "";
    try {
      const address = provider.address();
      if (!address || typeof address === "string") throw new Error("Provider fixture did not bind");
      const connection = await request.post("/api/connections", {
        data: {
          name: `Smoke provider ${Date.now()}`,
          provider: "custom",
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          apiKey: "smoke-key",
          model: "smoke-model",
          maxContext: 32768,
        },
      });
      expect(connection.ok()).toBeTruthy();
      connectionId = ((await connection.json()) as { id: string }).id;
      const chatResponse = await request.post("/api/chats", {
        data: { name: `Stop smoke ${Date.now()}`, mode: "roleplay", characterIds: [], connectionId },
      });
      expect(chatResponse.ok()).toBeTruthy();
      chatId = ((await chatResponse.json()) as { id: string }).id;
      await request.patch(`/api/chats/${chatId}/metadata`, { data: { enableAgents: false } });
      await page.addInitScript((id) => localStorage.setItem("marinara-active-chat-id", id), chatId);
      await page.goto("/");
      const input = page.locator("textarea.mari-chat-input-textarea");
      const send = page.locator("button.mari-chat-send-btn");
      await input.fill("Stop this response");
      await send.click();
      await expect.poll(() => requests.length).toBe(1);
      await expect(send.locator("svg.lucide-circle-stop")).toBeVisible();
      await send.click();
      await expect(send.locator("svg.lucide-circle-stop")).toHaveCount(0);
      await expect(input).toHaveValue("");

      const refusedText = "Keep this refused message exactly once";
      await input.fill(refusedText);
      await send.click();
      await expect.poll(() => requests.length).toBe(2);
      await expect(input).toHaveValue("");
      await expect
        .poll(async () => {
          const messages = (await (await request.get(`/api/chats/${chatId}/messages`)).json()) as Array<{
            role: string;
            content: string;
          }>;
          return messages.filter((message) => message.role === "user" && message.content === refusedText).length;
        })
        .toBe(1);
    } finally {
      for (const response of openResponses) response.end();
      await Promise.allSettled([
        chatId ? request.delete(`/api/chats/${chatId}?force=true`) : Promise.resolve(),
        connectionId ? request.delete(`/api/connections/${connectionId}`) : Promise.resolve(),
      ]);
      await new Promise<void>((resolve, reject) => provider.close((error) => (error ? reject(error) : resolve())));
    }
  },
);

test(
  "mobile chat composer stays within the viewport with a multiline draft",
  { tag: "@smoke" },
  async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Composer viewport behavior is covered on mobile.");
    const response = await page.request.post("/api/chats", {
      data: { name: `Mobile composer ${Date.now()}`, mode: "conversation", characterIds: [] },
    });
    expect(response.ok()).toBeTruthy();
    const chat = (await response.json()) as { id: string };
    try {
      await page.addInitScript((chatId) => localStorage.setItem("marinara-active-chat-id", chatId), chat.id);
      await page.goto("/");
      const composer = page.locator("textarea.mari-chat-input-textarea");
      await expect(composer).toBeVisible();
      await composer.fill("A short message\nwith a second line");
      const box = await composer.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    } finally {
      await page.request.delete(`/api/chats/${chat.id}?force=true`);
    }
  },
);
