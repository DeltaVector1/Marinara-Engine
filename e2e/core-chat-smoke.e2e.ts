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
    const sidebar = page.locator('[data-component="ChatSidebar"]');
    if (!(await sidebar.isVisible())) await page.locator('[data-tour="sidebar-toggle"]').click();
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
  const replies = ["A generated Conversation reply.", "A generated Roleplay reply."];
  let providerRequestCount = 0;
  const provider = createServer((incoming, outgoing) => {
    if (incoming.method !== "POST" || incoming.url !== "/v1/chat/completions") {
      outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ data: [{ id: "smoke-model" }] }));
      return;
    }
    const chunks: Buffer[] = [];
    incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    incoming.on("end", () => {
      const request = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      expect(request.messages).toBeTruthy();
      const reply = replies[providerRequestCount++];
      if (!reply) {
        outgoing.writeHead(500, { "content-type": "application/json" });
        outgoing.end(JSON.stringify({ error: { message: "Unexpected extra generation request" } }));
        return;
      }
      const events = [
        { choices: [{ index: 0, delta: { content: reply }, finish_reason: null }] },
        { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
      ];
      outgoing.writeHead(200, { "content-type": "text/event-stream", connection: "keep-alive" });
      outgoing.end(`${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`);
    });
  });
  await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", resolve));
  let connectionId = "";
  let characterId = "";
  try {
    const address = provider.address();
    if (!address || typeof address === "string") throw new Error("Generation smoke provider did not bind");
    const connectionResponse = await page.request.post("/api/connections", {
      data: {
        name: `Generation smoke provider ${Date.now()}`,
        provider: "custom",
        baseUrl: `http://127.0.0.1:${address.port}/v1`,
        apiKey: "smoke-key",
        model: "smoke-model",
        maxContext: 32768,
      },
    });
    expect(connectionResponse.ok()).toBeTruthy();
    connectionId = ((await connectionResponse.json()) as { id: string }).id;
    const characterResponse = await page.request.post("/api/characters", {
      data: { data: { name: `Generation smoke character ${Date.now()}`, first_mes: "" } },
    });
    expect(characterResponse.ok()).toBeTruthy();
    characterId = ((await characterResponse.json()) as { id: string }).id;
    for (const mode of ["conversation", "roleplay"] as const) {
      const response = await page.request.post("/api/chats", {
        data: {
          name: `Generation ${mode} ${Date.now()}`,
          mode,
          characterIds: [characterId],
          connectionId,
        },
      });
      expect(response.ok()).toBeTruthy();
      const chat = (await response.json()) as { id: string };
      try {
        const reply = replies[providerRequestCount];
        expect(reply).toBeTruthy();
        await page.request.patch(`/api/chats/${chat.id}/metadata`, {
          data: { enableAgents: false, enableTools: false, enableMemoryRecall: false, conversationSetupComplete: true },
        });
        await page.addInitScript((chatId) => localStorage.setItem("marinara-active-chat-id", chatId), chat.id);
        await page.goto("/");
        await page.locator("textarea.mari-chat-input-textarea").fill(`Reply in ${mode}`);
        await page.locator("button.mari-chat-send-btn").click();
        await expect(page.getByText(reply!, { exact: true })).toBeVisible();
        await expect.poll(() => providerRequestCount).toBe(mode === "conversation" ? 1 : 2);
      } finally {
        await page.request.delete(`/api/chats/${chat.id}?force=true`);
      }
    }
  } finally {
    if (characterId) await page.request.delete(`/api/characters/${characterId}`);
    if (connectionId) await page.request.delete(`/api/connections/${connectionId}`);
    await new Promise<void>((resolve, reject) => provider.close((error) => (error ? reject(error) : resolve())));
  }
});

test(
  "stopped and refused Roleplay replies do not duplicate or restore sent text",
  { tag: "@smoke" },
  async ({ page, request }) => {
    const requests: unknown[] = [];
    const openResponses = new Set<import("node:http").ServerResponse>();
    const provider = createServer((incoming, response) => {
      if (incoming.method !== "POST" || incoming.url !== "/v1/chat/completions") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ data: [{ id: "smoke-model" }] }));
        return;
      }
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
