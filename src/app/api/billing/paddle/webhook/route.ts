import { NextRequest, NextResponse } from "next/server";

import {
  isPaddleServerConfigured,
  isPaddleWebhookConfigured,
  paddleRuntimeEnv,
} from "@/lib/paddle/config";
import { getPaddleInstance } from "@/lib/paddle/get-paddle-instance";
import { processPaddleEvent } from "@/lib/paddle/process-webhook";
import { isAllowedPaddleWebhookRequest } from "@/lib/paddle/webhook-ip-allowlist";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isPaddleServerConfigured() || !isPaddleWebhookConfigured()) {
    return NextResponse.json({ error: "Paddle webhook is not configured" }, { status: 503 });
  }

  if (paddleRuntimeEnv() === "production") {
    try {
      if (!(await isAllowedPaddleWebhookRequest(request))) {
        return NextResponse.json({ error: "Webhook source is not allowed" }, { status: 403 });
      }
    } catch (error) {
      console.error("[api/billing/paddle/webhook] IP allowlist unavailable", error);
      return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 503 });
    }
  }

  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET!.trim();

  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body" }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    const eventData = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    if (eventData) {
      await processPaddleEvent(eventData);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[api/billing/paddle/webhook]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
