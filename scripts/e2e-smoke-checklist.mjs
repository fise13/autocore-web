#!/usr/bin/env node
/**
 * Lightweight smoke checklist runner (exit 0 = documented steps printed).
 * Full browser E2E belongs in Playwright once added; see docs/E2E-SMOKE.md.
 */
const steps = [
  "Marketing / - brand AutoCore visible; CTAs Попробовать демо + Скачать",
  "Demo CTA → app demo/login",
  "Subpages /product /modules /pricing /security /contact /download load",
  "Login → Overview /",
  "Navigate /motors then /warehouse then /motors (cache feel)",
  "Reduce motion: marketing + auth stay static",
];

console.log("AutoCore E2E smoke checklist\n");
for (const [i, step] of steps.entries()) {
  console.log(`${i + 1}. [ ] ${step}`);
}
console.log("\nSee docs/E2E-SMOKE.md for details.");
