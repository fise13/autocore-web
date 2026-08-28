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

/**
 * Mirror of `ensureHttpScheme` + `normalizeSiteOrigin` in `src/lib/site-urls.ts`.
 *
 * A bare host like `app.myautocore.com` is a value the app accepts and resolves
 * to `https://app.myautocore.com` — that normalisation exists on purpose. This
 * check must therefore validate what the app will actually use, not the raw
 * string: rejecting a value the app handles correctly is a false alarm, and a
 * build gate that cries wolf is worse than no gate. The first version of this
 * script did exactly that and failed a good production deploy.
 */
function normalizeOrigin(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withScheme);
    url.hostname = url.hostname.toLowerCase();
    url.protocol = "https:";
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function fail(lines) {
  console.error("\n✖ SEO origin check failed\n");
  for (const line of lines) console.error(`  ${line}`);
  console.error(
    "\n  These values are baked into every canonical, hreflang, og:url, sitemap",
  );
  console.error("  entry, and JSON-LD @id at build time. Set them, then rebuild.\n");
  process.exit(1);
}

function checkOrigin(name, rawValue) {
  const problems = [];
  if (!rawValue) {
    problems.push(`${name} is not set (expected ${EXPECTED[name]}).`);
    return problems;
  }

  const url = normalizeOrigin(rawValue);
  if (!url) {
    problems.push(`${name} is not a usable host or URL: ${rawValue}`);
    return problems;
  }

  // Everything below is checked against the normalised origin, because that is
  // what ends up in the canonicals — an http:// prefix or a trailing path in
  // the raw value is silently corrected by the app and is not a failure.
  if (url.hostname.startsWith("www.")) {
    problems.push(
      `${name} must be the canonical host without www, got ${url.hostname} (from "${rawValue}")`,
    );
  }
  if (url.hostname.endsWith(".vercel.app")) {
    problems.push(
      `${name} points at a Vercel preview host (${url.hostname}); production must use ${EXPECTED[name]}`,
    );
  }
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    problems.push(`${name} points at localhost (from "${rawValue}")`);
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

const resolved = Object.keys(EXPECTED)
  .map((name) => `${name.replace("NEXT_PUBLIC_", "").toLowerCase()}=${normalizeOrigin(process.env[name].trim()).origin}`)
  .join(", ");

console.log(`SEO origin check: ok (${resolved})`);
