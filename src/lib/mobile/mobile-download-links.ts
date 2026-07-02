function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export type MobileDownloadLinks = {
  ios: string;
  android: string;
};

/** Public store / install links for mobile apps. Configure when URLs are ready. */
export function getMobileDownloadLinks(): MobileDownloadLinks {
  return {
    ios: readEnv("NEXT_PUBLIC_MOBILE_DOWNLOAD_IOS", "MOBILE_DOWNLOAD_IOS") ?? "",
    android: readEnv("NEXT_PUBLIC_MOBILE_DOWNLOAD_ANDROID", "MOBILE_DOWNLOAD_ANDROID") ?? "",
  };
}
