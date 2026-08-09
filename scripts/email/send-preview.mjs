/**
 * Sends one sample transactional email through Resend, so a real inbox can be checked.
 *
 *   npm run email:send -- you@example.com [template]
 *
 * `template` is one of the keys printed by `npm run email:preview` and defaults to
 * `verification-code`. Requires RESEND_API_KEY in `.env.local`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Resend } from "resend";

import { buildSamples } from "./build-samples.mjs";

const LOGO_PATH = "public/email/autocore-mark.png";
const LOGO_CID = "autocore-mark";

const [recipient, templateKey = "verification-code"] = process.argv.slice(2);

if (!recipient || !recipient.includes("@")) {
  console.error("Usage: npm run email:send -- <recipient@example.com> [template]");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY?.trim();
if (!apiKey) {
  console.error("RESEND_API_KEY is not set. Add it to .env.local.");
  process.exit(1);
}

// In production the masthead mark is fetched from the marketing origin. A preview may be
// sent before that asset is deployed, so ship it inline and point the template at the CID.
const logo = await readFile(path.resolve(process.cwd(), LOGO_PATH));
process.env.EMAIL_LOGO_URL = `cid:${LOGO_CID}`;

const samples = await buildSamples({ recipientEmail: recipient });
const sample = samples.find((entry) => entry.key === templateKey);

if (!sample) {
  console.error(
    `Unknown template "${templateKey}". Available: ${samples.map((entry) => entry.key).join(", ")}`,
  );
  process.exit(1);
}

const from = process.env.RESEND_NOREPLY_EMAIL?.trim() || "AutoCore <noreply@myautocore.com>";

const { data, error } = await new Resend(apiKey).emails.send({
  from,
  to: recipient,
  subject: sample.message.subject,
  html: sample.message.html,
  text: sample.message.text,
  attachments: [
    {
      filename: "autocore-mark.png",
      content: logo.toString("base64"),
      contentType: "image/png",
      contentId: LOGO_CID,
    },
  ],
});

if (error) {
  console.error("Resend rejected the message:", error);
  process.exit(1);
}

console.log(`Sent "${sample.label}" to ${recipient}`);
console.log(`  from    ${from}`);
console.log(`  subject ${sample.message.subject}`);
console.log(`  id      ${data?.id ?? "(none returned)"}`);
