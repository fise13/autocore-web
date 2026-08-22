import { Environment } from "@paddle/paddle-node-sdk";

export type PaddleRuntimeEnv = "sandbox" | "production";

export function paddleRuntimeEnv(): PaddleRuntimeEnv {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
}

export function paddleSdkEnvironment(): Environment {
  return paddleRuntimeEnv() === "production" ? Environment.production : Environment.sandbox;
}

export function isPaddleCheckoutConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim());
}

export function isPaddleServerConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY?.trim());
}

export function isPaddleWebhookConfigured(): boolean {
  return Boolean(process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim());
}
