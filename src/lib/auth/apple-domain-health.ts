/** Returns true when Apple domain verification file is served (HTTP 200 + real content). */
export async function isAppleDomainAssociationLive(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const response = await fetch("/.well-known/apple-developer-domain-association", {
      cache: "no-store",
    });
    if (!response.ok) return false;

    const body = (await response.text()).trim();
    if (!body || body.length < 20) return false;
    if (body.includes("not configured") || body.includes("Apple domain association")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const APPLE_DOMAIN_SETUP_STEPS = [
  "Apple Developer → Identifiers → Services ID com.wise.autocore.web → Sign in with Apple → Configure",
  "Download verification file для autocore-web.vercel.app",
  "Vercel → Environment Variables → APPLE_DEVELOPER_DOMAIN_ASSOCIATION_BASE64",
  "(локально: node scripts/setup-apple-domain-association.mjs <файл> --base64)",
  "Redeploy → curl должен вернуть HTTP 200",
  "Apple Developer → Verify domain",
].join("\n");
