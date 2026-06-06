import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const inputPath = path.join(process.cwd(), "src/styles/documents.css");
const outputPath = path.join(process.cwd(), "src/lib/documents/documents-compiled.css");

const css = await readFile(inputPath, "utf8");
const result = await postcss([tailwindcss()]).process(css, { from: inputPath });
await writeFile(outputPath, result.css, "utf8");
console.log(`Wrote ${outputPath}`);
