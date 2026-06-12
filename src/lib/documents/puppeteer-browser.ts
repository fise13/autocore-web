import "server-only";

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

import {
  resolvePuppeteerExecutablePath,
  resolvePuppeteerLaunchArgs,
  shouldUseLambdaChromium,
} from "@/lib/documents/resolve-puppeteer-executable";

type PuppeteerGlobal = typeof globalThis & {
  __autocorePuppeteerBrowser?: Browser;
  __autocorePuppeteerLaunch?: Promise<Browser>;
};

const globalStore = globalThis as PuppeteerGlobal;

async function launchBrowser(): Promise<Browser> {
  const executablePath = await resolvePuppeteerExecutablePath();
  const useLambda = shouldUseLambdaChromium(executablePath);
  if (useLambda) {
    chromium.setGraphicsMode = false;
  }

  const args = await resolvePuppeteerLaunchArgs(useLambda);

  return puppeteer.launch({
    args,
    executablePath,
    headless: useLambda ? ("shell" as const) : true,
  });
}

export async function getPuppeteerBrowser(): Promise<Browser> {
  const existing = globalStore.__autocorePuppeteerBrowser;
  if (existing?.connected) {
    return existing;
  }

  if (!globalStore.__autocorePuppeteerLaunch) {
    globalStore.__autocorePuppeteerLaunch = launchBrowser()
      .then((browser) => {
        globalStore.__autocorePuppeteerBrowser = browser;
        browser.on("disconnected", () => {
          globalStore.__autocorePuppeteerBrowser = undefined;
          globalStore.__autocorePuppeteerLaunch = undefined;
        });
        return browser;
      })
      .finally(() => {
        globalStore.__autocorePuppeteerLaunch = undefined;
      });
  }

  return globalStore.__autocorePuppeteerLaunch;
}
