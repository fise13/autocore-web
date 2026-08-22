import "server-only";

import { LogLevel, Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";

import { isPaddleServerConfigured, paddleSdkEnvironment } from "@/lib/paddle/config";

let paddleInstance: Paddle | null = null;

export function getPaddleInstance(): Paddle {
  if (!isPaddleServerConfigured()) {
    throw new Error("PADDLE_API_KEY is not set");
  }

  if (!paddleInstance) {
    const options: PaddleOptions = {
      environment: paddleSdkEnvironment(),
      logLevel: LogLevel.error,
    };
    paddleInstance = new Paddle(process.env.PADDLE_API_KEY!.trim(), options);
  }

  return paddleInstance;
}
