/** ISO 3166-1 alpha-2 from CDN geo headers, or null to let Paddle infer from IP. */
export function detectCountryFromHeaders(headers: Headers): string | null {
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  if (country.length !== 2) return null;
  return country;
}
