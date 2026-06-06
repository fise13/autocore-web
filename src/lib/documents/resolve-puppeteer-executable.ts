import "server-only";

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import chromium from "@sparticuz/chromium";

const MAC_BROWSER_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Arc.app/Contents/MacOS/Arc",
];

const PUPPETEER_TESTING_BINARY =
  "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

function resolvePuppeteerCacheChrome(): string | null {
  const cacheRoot = join(homedir(), ".cache", "puppeteer", "chrome");
  if (!existsSync(cacheRoot)) return null;

  const builds = readdirSync(cacheRoot)
    .filter((entry) => entry.startsWith("mac_"))
    .sort()
    .reverse();

  for (const build of builds) {
    const candidate = join(
      cacheRoot,
      build,
      "chrome-mac-arm64",
      PUPPETEER_TESTING_BINARY,
    );
    if (existsSync(candidate)) return candidate;

    const intelCandidate = join(cacheRoot, build, "chrome-mac-x64", PUPPETEER_TESTING_BINARY);
    if (existsSync(intelCandidate)) return intelCandidate;
  }

  return null;
}

export async function resolvePuppeteerExecutablePath(): Promise<string> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(
        `PUPPETEER_EXECUTABLE_PATH указывает на несуществующий файл: ${fromEnv}`,
      );
    }
    return fromEnv;
  }

  for (const candidate of MAC_BROWSER_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const cached = resolvePuppeteerCacheChrome();
  if (cached) {
    return cached;
  }

  if (process.env.VERCEL) {
    return chromium.executablePath();
  }

  throw new Error(
    "Chrome не найден. Установите Google Chrome или выполните: npm run install:browser",
  );
}

export async function resolvePuppeteerLaunchArgs(useLambdaChromium: boolean): Promise<string[]> {
  if (useLambdaChromium || process.env.VERCEL) {
    return chromium.args;
  }
  return ["--no-sandbox", "--disable-setuid-sandbox"];
}

export function shouldUseLambdaChromium(executablePath: string): boolean {
  return process.env.VERCEL === "1" || executablePath.includes("/chromium");
}
