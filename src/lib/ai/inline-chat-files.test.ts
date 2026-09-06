import assert from "node:assert/strict";
import test from "node:test";

import { convertToModelMessages } from "ai";

import { inlineChatFileParts } from "@/lib/ai/inline-chat-files";

function dataUrl(mediaType: string, text: string): string {
  return `data:${mediaType};base64,${Buffer.from(text, "utf8").toString("base64")}`;
}

test("plain text attachments become readable text parts", async () => {
  const messages = await convertToModelMessages([
    {
      role: "user",
      parts: [
        { type: "text", text: "read this" },
        {
          type: "file",
          mediaType: "text/plain",
          filename: "note.txt",
          url: dataUrl("text/plain", "bin B4"),
        },
      ],
    },
  ]);
  const inlined = await inlineChatFileParts(messages);
  const user = inlined[0];
  assert.equal(user?.role, "user");
  assert.ok(typeof user.content !== "string");
  const texts = user.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  assert.match(texts, /read this/);
  assert.match(texts, /bin B4/);
  assert.equal(
    user.content.some((part) => part.type === "file"),
    false,
  );
});

test("image data URLs become inline bytes, after the prompt text", async () => {
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const messages = await convertToModelMessages([
    {
      role: "user",
      parts: [
        {
          type: "file",
          mediaType: "image/png",
          filename: "dot.png",
          url: `data:image/png;base64,${png}`,
        },
        { type: "text", text: "what colour" },
      ],
    },
  ]);
  const inlined = await inlineChatFileParts(messages);
  const user = inlined[0];
  assert.ok(user && typeof user.content !== "string");
  assert.equal(user.content[0]?.type, "text");
  const file = user.content.find((part) => part.type === "file");
  assert.ok(file && file.type === "file");
  assert.equal(file.data.type, "data");
  assert.ok(file.data.data instanceof Uint8Array);
  assert.ok(file.data.data.byteLength > 0);
});
