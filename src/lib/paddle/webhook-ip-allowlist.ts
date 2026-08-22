import "server-only";

import { ipAddress } from "@vercel/functions";

const PADDLE_IPS_URL = "https://api.paddle.com/ips";
const CACHE_TTL_MS = 60 * 60 * 1000;

type PaddleIpsResponse = {
  data?: {
    ipv4_cidrs?: unknown;
  };
};

let cachedCidrs: string[] | null = null;
let cacheExpiresAt = 0;

function normalizeIpv4(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^::ffff:/, "");
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) ? normalized : null;
}

function ipv4ToNumber(value: string): number | null {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) {
    return null;
  }

  return (
    ((octets[0] << 24) >>> 0) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0;
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixValue] = cidr.split("/");
  const prefix = Number(prefixValue);
  const ipNumber = ipv4ToNumber(ip);
  const networkNumber = ipv4ToNumber(network);

  if (
    ipNumber === null ||
    networkNumber === null ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

async function getPaddleLiveCidrs(): Promise<string[]> {
  const now = Date.now();
  if (cachedCidrs && now < cacheExpiresAt) return cachedCidrs;

  const response = await fetch(PADDLE_IPS_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Paddle IP endpoint returned ${response.status}`);
  }

  const payload = (await response.json()) as PaddleIpsResponse;
  const cidrs = Array.isArray(payload.data?.ipv4_cidrs)
    ? payload.data.ipv4_cidrs.filter(
        (value): value is string => typeof value === "string" && value.includes("/"),
      )
    : [];

  if (cidrs.length === 0) {
    throw new Error("Paddle IP endpoint returned no IPv4 CIDRs");
  }

  cachedCidrs = cidrs;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cidrs;
}

export async function isAllowedPaddleWebhookRequest(request: Request): Promise<boolean> {
  const sourceIp = normalizeIpv4(ipAddress(request));
  if (!sourceIp) return false;

  const cidrs = await getPaddleLiveCidrs();
  return cidrs.some((cidr) => isIpv4InCidr(sourceIp, cidr));
}
