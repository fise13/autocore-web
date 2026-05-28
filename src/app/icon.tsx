import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const buffer = await readFile(
    join(process.cwd(), "assets/meta/favicon.png"),
  );

  return new Response(buffer, {
    headers: { "Content-Type": contentType },
  });
}
