/**
 * Renders every transactional email to `.email-preview/` for visual QA.
 *
 *   npm run email:preview
 *
 * Open `.email-preview/index.html`; switch your OS or browser to dark mode to check the
 * dark variant. The directory is generated output and is git-ignored.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildSamples } from "./build-samples.mjs";

const outDir = path.resolve(process.cwd(), process.argv[2] ?? ".email-preview");

function buildIndex(samples) {
  const cards = samples
    .map(
      (sample) => `
      <section class="card">
        <header>
          <h2>${sample.label}</h2>
          <p class="subject"><span>Subject</span> ${sample.message.subject}</p>
          <p class="links">
            <a href="./${sample.key}.html" target="_blank">open HTML</a>
            <a href="./${sample.key}.txt" target="_blank">plain text</a>
          </p>
        </header>
        <iframe src="./${sample.key}.html" title="${sample.label}" loading="lazy"></iframe>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AutoCore email preview</title>
<style>
  :root { color-scheme: light dark; --bg:#f1f4fa; --fg:#11131a; --muted:#5a606c; --card:#fff; --line:rgba(17,19,26,.12); }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d0e12; --fg:#f5f5f7; --muted:#a8acb8; --card:#1a1c24; --line:rgba(255,255,255,.1); } }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 24px 64px; background:var(--bg); color:var(--fg);
         font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  h1 { font-size:22px; letter-spacing:-.02em; margin:0 0 4px; }
  .hint { color:var(--muted); margin:0 0 28px; font-size:13px; }
  .grid { display:grid; gap:24px; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  header { padding:14px 16px; border-bottom:1px solid var(--line); }
  h2 { font-size:15px; margin:0 0 6px; }
  .subject { margin:0 0 6px; font-size:13px; color:var(--fg); }
  .subject span { display:inline-block; font-size:10px; text-transform:uppercase; letter-spacing:.08em;
                  color:var(--muted); margin-right:6px; }
  .links { margin:0; font-size:12px; }
  .links a { color:#0a73f2; margin-right:12px; }
  iframe { display:block; width:100%; height:760px; border:0; background:#fff; }
  @media (prefers-color-scheme: dark) { iframe { background:#0d0e12; } }
</style>
</head>
<body>
  <h1>AutoCore transactional emails</h1>
  <p class="hint">Toggle your system appearance to check the dark variant — the templates follow <code>prefers-color-scheme</code>.</p>
  <div class="grid">${cards}</div>
</body>
</html>`;
}

// Point the masthead at the local file so the preview shows the real mark without a deploy.
process.env.EMAIL_LOGO_URL = pathToFileURL(
  path.resolve(process.cwd(), "public/email/autocore-mark.png"),
).href;

const samples = await buildSamples({ recipientEmail: "victor@example.com" });

await mkdir(outDir, { recursive: true });
await Promise.all(
  samples.flatMap((sample) => [
    writeFile(path.join(outDir, `${sample.key}.html`), sample.message.html, "utf8"),
    writeFile(path.join(outDir, `${sample.key}.txt`), sample.message.text, "utf8"),
  ]),
);
await writeFile(path.join(outDir, "index.html"), buildIndex(samples), "utf8");

console.log(`Rendered ${samples.length} templates to ${path.relative(process.cwd(), outDir)}/`);
for (const sample of samples) {
  console.log(`  ${sample.key.padEnd(20)} ${sample.message.subject}`);
}
