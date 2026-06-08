/**
 * Forensic OAuth flow capture for Apple Sign-In via Firebase.
 * Captures runtime Firebase config, handler URL, Apple authorize URL, and error responses.
 */
import puppeteer from "puppeteer-core";

const LOGIN_URL = process.env.LOGIN_URL ?? "http://localhost:3000/login?authDebug=1";
const CHROME =
  process.env.CHROME_PATH ??
  "/Users/victor/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

function parseUrl(url) {
  try {
    const u = new URL(url);
    const params = Object.fromEntries(u.searchParams.entries());
    return { url, host: u.host, pathname: u.pathname, params };
  } catch {
    return { url, error: "invalid url" };
  }
}

function findInvalidClient(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("invalid_client")) {
    return text.slice(0, 500);
  }
  return null;
}

const events = {
  requests: [],
  responses: [],
  navigations: [],
  console: [],
  dialogs: [],
  invalidClientHits: [],
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

function attachPageListeners(page, label) {
  page.on("console", (msg) => {
    events.console.push({ label, type: msg.type(), text: msg.text() });
  });
  page.on("dialog", async (dialog) => {
    events.dialogs.push({ label, type: dialog.type(), message: dialog.message() });
    await dialog.dismiss().catch(() => {});
  });
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("appleid.apple.com") ||
      url.includes("/__/auth/") ||
      url.includes("identitytoolkit.googleapis.com") ||
      url.includes("securetoken.googleapis.com") ||
      url.includes("accounts.google.com/o/oauth")
    ) {
      events.requests.push({
        label,
        method: req.method(),
        url,
        parsed: parseUrl(url),
      });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (
      !url.includes("appleid.apple.com") &&
      !url.includes("/__/auth/") &&
      !url.includes("identitytoolkit.googleapis.com") &&
      !url.includes("securetoken.googleapis.com")
    ) {
      return;
    }
    let bodySnippet = null;
    try {
      const ct = res.headers()["content-type"] ?? "";
      if (ct.includes("text") || ct.includes("json") || ct.includes("html")) {
        const text = await res.text();
        bodySnippet = text.slice(0, 800);
        const hit = findInvalidClient(text);
        if (hit) {
          events.invalidClientHits.push({ label, url, status: res.status(), snippet: hit });
        }
      }
    } catch {
      /* ignore */
    }
    events.responses.push({
      label,
      status: res.status(),
      url,
      parsed: parseUrl(url),
      bodySnippet,
    });
  });
  page.on("framenavigated", (frame) => {
    const url = frame.url();
    if (
      url.includes("appleid.apple.com") ||
      url.includes("/__/auth/") ||
      url.includes("identitytoolkit.googleapis.com")
    ) {
      events.navigations.push({ label, url, parsed: parseUrl(url) });
    }
  });
}

const page = await browser.newPage();
attachPageListeners(page, "main");

browser.on("targetcreated", async (target) => {
  if (target.type() !== "page") return;
  const popup = await target.page();
  if (!popup) return;
  attachPageListeners(popup, "popup");
});

await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 60000 });

const runtimeFirebase = await page.evaluate(() => {
  const apps = window.firebase?.apps ?? [];
  // Next.js bundles firebase — read from auth instance if exposed via window, else parse from script tags / __NEXT_DATA__
  const nextData = window.__NEXT_DATA__;
  const envFromBuild = nextData?.runtimeConfig ?? null;

  // Try to access firebase through common patterns
  let authConfig = null;
  try {
    const w = window;
    if (w.__FIREBASE_DEFAULTS__) {
      authConfig = w.__FIREBASE_DEFAULTS__;
    }
  } catch {
    /* ignore */
  }

  return {
    href: window.location.href,
    nextDataEnv: envFromBuild,
    firebaseDefaults: authConfig,
    userAgent: navigator.userAgent,
  };
});

// Inject script to read firebase config after modules load — use page.evaluate after clicking to get auth.app.options
await page.waitForFunction(() => document.querySelectorAll("button").length > 0, { timeout: 30000 });

const clicked = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const apple = buttons.find((b) => /apple|Apple/i.test(b.textContent ?? ""));
  if (!apple) return false;
  apple.click();
  return true;
});

await new Promise((r) => setTimeout(r, 10000));

// Read Firebase auth runtime config from the page's bundled firebase
const authRuntime = await page.evaluate(async () => {
  // Dynamic import won't work in evaluate — search global webpack chunks is unreliable.
  // Instead read from localStorage/sessionStorage keys Firebase uses.
  const storage = {
    localStorage: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)?.slice(0, 200)])),
    sessionStorage: Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)?.slice(0, 200)])),
  };
  return { storage };
});

const handlerUrls = events.navigations
  .filter((e) => e.url.includes("/__/auth/handler"))
  .map((e) => e.parsed);
const appleAuthorize = events.navigations
  .filter((e) => e.url.includes("appleid.apple.com/auth/authorize"))
  .map((e) => e.parsed);

const appleTokenRequests = events.requests.filter(
  (r) => r.url.includes("appleid.apple.com/auth/token") || r.url.includes("/token"),
);

console.log(
  JSON.stringify(
    {
      runtimeFirebase,
      authRuntime,
      clickedAppleButton: clicked,
      handlerUrls,
      appleAuthorize: appleAuthorize.map((a) => ({
        client_id: a.params?.client_id,
        redirect_uri: a.params?.redirect_uri,
        state: a.params?.state?.slice(0, 80) + (a.params?.state?.length > 80 ? "…" : ""),
        scope: a.params?.scope,
        response_type: a.params?.response_type,
        response_mode: a.params?.response_mode,
        locale: a.params?.locale,
        full: a,
      })),
      appleTokenRequests,
      invalidClientHits: events.invalidClientHits,
      appleResponses: events.responses.filter((r) => r.url.includes("appleid.apple.com")),
      handlerResponses: events.responses.filter((r) => r.url.includes("/__/auth/")),
      identityToolkitResponses: events.responses.filter((r) => r.url.includes("identitytoolkit")),
      relevantConsole: events.console.filter(
        (c) =>
          c.text.includes("APPLE") ||
          c.text.includes("Firebase") ||
          c.text.includes("invalid") ||
          c.text.includes("auth"),
      ),
      allOAuthNavigations: events.navigations,
    },
    null,
    2,
  ),
);

await browser.close();
