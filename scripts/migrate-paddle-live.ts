import { readFile, writeFile } from "node:fs/promises";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const apiKey = process.env.PADDLE_API_KEY?.trim();
if (!apiKey) throw new Error("PADDLE_API_KEY is required");

const paddle = new Paddle(apiKey, { environment: Environment.production });
const envPath = new URL("../.env.local", import.meta.url);
const webhookUrl = "https://app.myautocore.com/api/billing/paddle/webhook";

async function listAll<T>(
  collection: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of collection) items.push(item);
  return items;
}

function customDataValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function hasRequiredFourteenDayTrial(trialPeriod: {
  interval: string;
  frequency: number;
  requiresPaymentMethod?: boolean;
} | null): boolean {
  return (
    trialPeriod?.interval === "day" &&
    trialPeriod.frequency === 14 &&
    trialPeriod.requiresPaymentMethod === true
  );
}

function upsertEnv(source: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return `${source.trimEnd()}\n${line}\n`;
}

async function main() {
  const products = await listAll(paddle.products.list({ status: ["active"] }));
  let product = products.find(
    (item) => customDataValue(item.customData, "autocore_product") === "autocore_pro",
  );

  product ??= await paddle.products.create({
    name: "AutoCore Pro",
    taxCategory: "saas",
    type: "standard",
    description:
      "Everything unlocked for one shop — cloud sync, Excel import & export, team invites, app + web access, documents, AI workflows, advanced reports, and API access.",
    customData: {
      autocore_plan_tier: "pro",
      autocore_product: "autocore_pro",
    },
  });

  const prices = await listAll(
    paddle.prices.list({ productId: [product.id], status: ["active"] }),
  );

  let monthly = prices.find(
    (item) => customDataValue(item.customData, "autocore_plan_id") === "pro_monthly",
  );
  monthly ??= await paddle.prices.create({
    productId: product.id,
    description: "AutoCore Pro monthly USD ($15)",
    name: "AutoCore Pro — Monthly",
    type: "standard",
    billingCycle: { interval: "month", frequency: 1 },
    trialPeriod: { interval: "day", frequency: 14, requiresPaymentMethod: true },
    taxMode: "location",
    unitPrice: { amount: "1500", currencyCode: "USD" },
    quantity: { minimum: 1, maximum: 100 },
    customData: { autocore_plan_id: "pro_monthly" },
  });
  if (!hasRequiredFourteenDayTrial(monthly.trialPeriod)) {
    monthly = await paddle.prices.update(monthly.id, {
      trialPeriod: { interval: "day", frequency: 14, requiresPaymentMethod: true },
    });
  }

  let yearly = prices.find(
    (item) => customDataValue(item.customData, "autocore_plan_id") === "pro_yearly",
  );
  yearly ??= await paddle.prices.create({
    productId: product.id,
    description: "AutoCore Pro yearly USD ($150)",
    name: "AutoCore Pro — Yearly",
    type: "standard",
    billingCycle: { interval: "year", frequency: 1 },
    trialPeriod: { interval: "day", frequency: 14, requiresPaymentMethod: true },
    taxMode: "location",
    unitPrice: { amount: "15000", currencyCode: "USD" },
    quantity: { minimum: 1, maximum: 100 },
    customData: { autocore_plan_id: "pro_yearly" },
  });
  if (!hasRequiredFourteenDayTrial(yearly.trialPeriod)) {
    yearly = await paddle.prices.update(yearly.id, {
      trialPeriod: { interval: "day", frequency: 14, requiresPaymentMethod: true },
    });
  }

  const tokens = await listAll(paddle.clientTokens.list());
  let token = tokens.find(
    (item) => item.name === "AutoCore web production" && item.status === "active",
  );
  token ??= await paddle.clientTokens.create({
    name: "AutoCore web production",
    description: "Paddle.js token for myautocore.com and app.myautocore.com",
  });

  const destinations = await paddle.notificationSettings.list();
  let destination = destinations.find(
    (item) => item.type === "url" && item.destination === webhookUrl && item.active,
  );
  destination ??= await paddle.notificationSettings.create({
    description: "AutoCore production billing webhook",
    type: "url",
    destination: webhookUrl,
    includeSensitiveFields: false,
    trafficSource: "platform",
    subscribedEvents: [
      "transaction.completed",
      "subscription.activated",
      "subscription.canceled",
      "subscription.created",
      "subscription.past_due",
      "subscription.paused",
      "subscription.resumed",
      "subscription.trialing",
      "subscription.updated",
    ],
  });

  let env = await readFile(envPath, "utf8");
  env = upsertEnv(env, "NEXT_PUBLIC_PADDLE_ENV", "production");
  env = upsertEnv(env, "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", token.token);
  env = upsertEnv(env, "NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY", monthly.id);
  env = upsertEnv(env, "NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY", yearly.id);
  env = upsertEnv(
    env,
    "PADDLE_NOTIFICATION_WEBHOOK_SECRET",
    destination.endpointSecretKey,
  );
  await writeFile(envPath, env, { mode: 0o600 });

  console.log(
    JSON.stringify(
      {
        productId: product.id,
        monthlyPriceId: monthly.id,
        yearlyPriceId: yearly.id,
        clientTokenId: token.id,
        notificationSettingId: destination.id,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
