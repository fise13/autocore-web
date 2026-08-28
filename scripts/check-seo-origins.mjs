#!/usr/bin/env node
/**
 * Fails a production build when the public origins are not explicitly set.
 *
 * Every canonical URL, hreflang, `og:url`, sitemap `<loc>`, and JSON-LD `@id`
 * on the marketing site is baked in at build time from `NEXT_PUBLIC_MARKETING_URL`
 * and `NEXT_PUBLIC_APP_URL`. When those are missing, `resolveUrlFromEnv` in
 * `src/lib/site-urls.ts` quietly falls back to `VERCEL_PROJECT_PRODUCTION_URL`,
 * then `VERCEL_URL` — so one unset variable canonicalises the entire site onto a
 * `*.vercel.app` host with no error, no warning, and no way to notice until the
 * wrong URLs are already indexed.
 *
 * This turns that silent failure into a loud one. It only enforces on real
 * production builds: previews and local builds keep their fallbacks.
 */

const PRODUCTION = process.env.VERCEL_ENV === "production";

/** Origins we expect in production. Kept in step with `src/lib/site-urls.ts`. */
const EXPECTED = {
  NEXT_PUBLIC_MARKETING_URL: "https://myautocore.com",
  NEXT_PUBLIC_APP_URL: "https://app.myautocore.com",
};

function fail(lines) {
  console.error("\n✖ SEO origin check failed\n");
  for (const line of lines) console.error(`  ${line}`);
  console.error(
    "\n  These values are baked into every canonical, hreflang, og:url, sitemap",
  );
  console.error("  entry, and JSON-LD @id at build time. Set them, then rebuild.\n");
  process.exit(1);
}

function checkOrigin(name, value) {
  const problems = [];
  if (!value) {
    problems.push(`${name} is not set (expected ${EXPECTED[name]}).`);
    return problems;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    problems.push(`${name} is not a valid absolute URL: ${value}`);
    return problems;
  }

  if (url.protocol !== "https:") {
    problems.push(`${name} must be https in production, got ${url.protocol}//`);
  }
  if (url.hostname.startsWith("www.")) {
    problems.push(`${name} must be the canonical host without www, got ${url.hostname}`);
  }
  if (url.hostname.endsWith(".vercel.app")) {
    problems.push(
      `${name} points at a Vercel preview host (${url.hostname}); production must use ${EXPECTED[name]}`,
    );
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    problems.push(`${name} must be an origin with no path, got ${url.pathname}`);
  }
  return problems;
}

if (!PRODUCTION) {
  console.log("SEO origin check: skipped (not a production build).");
  process.exit(0);
}

const problems = Object.keys(EXPECTED).flatMap((name) =>
  checkOrigin(name, process.env[name]?.trim()),
);

if (problems.length > 0) fail(problems);

console.log(
  `SEO origin check: ok (marketing=${process.env.NEXT_PUBLIC_MARKETING_URL}, app=${process.env.NEXT_PUBLIC_APP_URL})`,
);
