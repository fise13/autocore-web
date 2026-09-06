import assert from "node:assert/strict";
import test from "node:test";

import {
  chatFileAcceptAttr,
  isAllowedChatFile,
  rejectChatFile,
  sniffChatFileType,
} from "@/lib/ai/prepare-chat-file";

function fakeFile(name: string, type: string, size = 12): File {
  return new File([new Uint8Array(size)], name, { type });
}

test("allows photos, PDFs and spreadsheets", () => {
  assert.equal(isAllowedChatFile(fakeFile("a.jpg", "image/jpeg")), true);
  assert.equal(isAllowedChatFile(fakeFile("a.png", "image/png")), true);
  assert.equal(isAllowedChatFile(fakeFile("act.pdf", "application/pdf")), true);
  assert.equal(isAllowedChatFile(fakeFile("stock.xlsx", "")), true);
  assert.equal(isAllowedChatFile(fakeFile("notes.txt", "text/plain")), true);
});

test("rejects audio and random binaries", () => {
  assert.equal(isAllowedChatFile(fakeFile("clip.mp3", "audio/mpeg")), false);
  assert.equal(isAllowedChatFile(fakeFile("app.exe", "application/x-msdownload")), false);
});

test("sniffs type from the extension when the browser leaves it empty", () => {
  assert.equal(sniffChatFileType(fakeFile("scan.PDF", "")), "application/pdf");
  assert.equal(sniffChatFileType(fakeFile("sheet.xlsx", "application/octet-stream")), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
});

test("reject reasons cover type, size and the 4-file cap", () => {
  assert.equal(rejectChatFile(fakeFile("a.zip", "application/zip"), 0), "type");
  assert.equal(rejectChatFile(fakeFile("big.pdf", "application/pdf", 9_000_000), 0), "size");
  assert.equal(rejectChatFile(fakeFile("ok.jpg", "image/jpeg"), 4), "limit");
  assert.equal(rejectChatFile(fakeFile("ok.jpg", "image/jpeg"), 1), null);
});

test("file picker accept lists images and office files", () => {
  assert.match(chatFileAcceptAttr(), /image\/\*/);
  assert.match(chatFileAcceptAttr(), /\.pdf/);
});
