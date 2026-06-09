#!/usr/bin/env node
/**
 * Copy Apple domain verification file into the repo or print Vercel env (base64).
 *
 * 1. Apple Developer → Services ID com.wise.autocore.web → Sign in with Apple → Configure
 * 2. Download verification file for autocore-web.vercel.app
 * 3. node scripts/setup-apple-domain-association.mjs ~/Downloads/apple-developer-domain-association.txt
 *
 * Options:
 *   --copy     Write to public/.well-known/apple-developer-domain-association (default)
 *   --base64   Print APPLE_DEVELOPER_DOMAIN_ASSOCIATION_BASE64 for Vercel
 *   --raw      Print single-line APPLE_DEVELOPER_DOMAIN_ASSOCIATION for Vercel
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));

const sourceArg = args[0];
if (!sourceArg) {
  console.error("Usage: node scripts/setup-apple-domain-association.mjs <downloaded-file> [--copy|--base64|--raw]");
  process.exit(1);
}

const source = resolve(sourceArg);
const body = readFileSync(source, "utf8").trim();

if (!body) {
  console.error("File is empty:", source);
  process.exit(1);
}

const target = resolve("public/.well-known/apple-developer-domain-association");

if (flags.has("--base64")) {
  const encoded = Buffer.from(body, "utf8").toString("base64");
  console.log("\nAdd to Vercel → Environment Variables:\n");
  console.log("Name: APPLE_DEVELOPER_DOMAIN_ASSOCIATION_BASE64");
  console.log(`Value: ${encoded}\n`);
  process.exit(0);
}

if (flags.has("--raw")) {
  const singleLine = body.replace(/\s+/g, "");
  console.log("\nAdd to Vercel → Environment Variables:\n");
  console.log("Name: APPLE_DEVELOPER_DOMAIN_ASSOCIATION");
  console.log(`Value: ${singleLine}\n`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, body, "utf8");
console.log(`✓ Wrote ${target}`);
console.log("\nNext:");
console.log("  git add public/.well-known/apple-developer-domain-association");
console.log("  git commit && git push   (Vercel redeploys automatically)");
console.log("\nVerify after deploy:");
console.log("  curl -I https://autocore-web.vercel.app/.well-known/apple-developer-domain-association");
