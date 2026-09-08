import type { FilePart, ModelMessage, TextPart } from "ai";

const TEXT_FILE_TYPES = new Set(["text/plain", "text/csv", "text/tab-separated-values"]);
const SPREADSHEET_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_TEXT_CHARS = 60_000;

function dataUrlFromFilePart(part: FilePart): string | null {
  const data = part.data;
  if (data instanceof URL) return data.toString();
  if (typeof data === "string") return data.startsWith("data:") ? data : null;
  if (data && typeof data === "object" && "type" in data) {
    if (data.type === "url") return data.url.toString();
    if (data.type === "data" && typeof data.data === "string" && data.data.startsWith("data:")) {
      return data.data;
    }
  }
  return null;
}

function decodeDataUrl(url: string): { mediaType: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(url);
  if (!match) return null;
  const mediaType = match[1]?.trim() || "application/octet-stream";
  const payload = match[3] ?? "";
  try {
    const bytes = match[2]
      ? new Uint8Array(Buffer.from(payload, "base64"))
      : new TextEncoder().encode(decodeURIComponent(payload));
    return { mediaType, bytes };
  } catch {
    return null;
  }
}

function clipText(text: string, filename: string): string {
  if (text.length <= MAX_TEXT_CHARS) return `Attached file ${filename}:\n${text}`;
  return `Attached file ${filename} (truncated):\n${text.slice(0, MAX_TEXT_CHARS)}`;
}

async function spreadsheetText(bytes: Uint8Array, filename: string): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name] ?? {});
    return workbook.SheetNames.length > 1 ? `# ${name}\n${csv}` : csv;
  });
  return clipText(sheets.join("\n\n"), filename);
}

async function expandFilePart(part: FilePart): Promise<Array<FilePart | TextPart>> {
  const dataUrl = dataUrlFromFilePart(part);
  const decoded = dataUrl ? decodeDataUrl(dataUrl) : null;
  const mediaType = (decoded?.mediaType || part.mediaType || "").toLowerCase();
  const filename = part.filename || "attachment";

  if (decoded && (TEXT_FILE_TYPES.has(mediaType) || filename.toLowerCase().endsWith(".csv"))) {
    return [{ type: "text", text: clipText(new TextDecoder().decode(decoded.bytes), filename) }];
  }

  if (
    decoded &&
    (SPREADSHEET_TYPES.has(mediaType) ||
      filename.toLowerCase().endsWith(".xlsx") ||
      filename.toLowerCase().endsWith(".xls"))
  ) {
    try {
      return [{ type: "text", text: await spreadsheetText(decoded.bytes, filename) }];
    } catch {
      return [{ type: "text", text: `Could not read spreadsheet ${filename}. Ask them to attach CSV or PDF.` }];
    }
  }

  if (decoded) {
    return [
      {
        type: "file",
        mediaType: decoded.mediaType || part.mediaType,
        filename,
        data: { type: "data", data: decoded.bytes },
      },
    ];
  }

  return [part];
}

/**
 * Turns chat `data:` file parts into inline bytes (or text for sheets).
 *
 * `convertToModelMessages` wraps every attachment as `{ type: "url" }`. The
 * OpenAI-compatible encoder then rejects PDF URLs and office files, and some
 * Gemini/tool lanes ignore image URLs. Bytes in `{ type: "data" }` survive.
 */
export async function inlineChatFileParts(messages: ModelMessage[]): Promise<ModelMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user" || typeof message.content === "string") return message;
      const expanded: Array<FilePart | TextPart | (typeof message.content)[number]> = [];
      for (const part of message.content) {
        if (part.type !== "file") {
          expanded.push(part);
          continue;
        }
        expanded.push(...(await expandFilePart(part)));
      }
      expanded.sort((left, right) => Number(left.type === "file") - Number(right.type === "file"));
      return { ...message, content: expanded };
    }),
  );
}
