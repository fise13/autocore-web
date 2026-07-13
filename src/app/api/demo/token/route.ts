import { NextResponse } from "next/server";

import { createDemoCustomToken } from "@/lib/demo/demo-provision.server";

export const runtime = "nodejs";

type DemoAuthResponse = { type: "customToken"; token: string };

export async function POST(): Promise<NextResponse<DemoAuthResponse | { error: string }>> {
  try {
    const token = await createDemoCustomToken();
    return NextResponse.json({ type: "customToken", token });
  } catch (adminError) {
    console.error("[demo/token] Admin provisioning failed:", adminError);
    return NextResponse.json({ error: "Demo account is temporarily unavailable" }, { status: 503 });
  }
}
