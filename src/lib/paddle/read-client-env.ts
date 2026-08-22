import type { Environments } from "@paddle/paddle-js";

export type PaddleClientEnv = {
  token: string;
  environment: Environments;
};

/** Fail loudly — never silently default the Paddle environment. */
export function readPaddleClientEnv(): PaddleClientEnv {
  const rawEnv = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim();
  if (rawEnv !== "sandbox" && rawEnv !== "production") {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_ENV must be set to "sandbox" or "production" (never omit or guess).',
    );
  }

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) {
    throw new Error("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set.");
  }

  return {
    token,
    environment: rawEnv,
  };
}

export function tryReadPaddleClientEnv(): PaddleClientEnv | null {
  try {
    return readPaddleClientEnv();
  } catch {
    return null;
  }
}
