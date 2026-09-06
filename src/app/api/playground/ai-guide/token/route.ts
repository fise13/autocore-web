import { NextResponse } from "next/server";

import { createAiGuideCustomToken } from "@/lib/playground/ai-guide/provision.server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AuthResponse = { type: "customToken"; token: string };

export async function POST(): Promise<NextResponse<AuthResponse | { error: string }>> {
  try {
    const token = await createAiGuideCustomToken();
    return NextResponse.json({ type: "customToken", token });
  } catch (error) {
    console.error("[playground/ai-guide/token] provision failed:", error);
    return NextResponse.json({ error: "AI Guide playground is temporarily unavailable" }, { status: 503 });
  }
}
