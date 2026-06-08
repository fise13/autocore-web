import { NextResponse } from "next/server";

import { DEMO_ACCOUNT_EMAIL } from "@/lib/demo/demo-config";
import { createDemoCustomToken } from "@/lib/demo/demo-provision.server";

export const runtime = "nodejs";

type DemoAuthResponse =
  | { type: "customToken"; token: string }
  | { type: "password"; email: string; password: string };

export async function POST(): Promise<NextResponse<DemoAuthResponse | { error: string }>> {
  const password = process.env.DEMO_ACCOUNT_PASSWORD?.trim();

  try {
    const token = await createDemoCustomToken();
    return NextResponse.json({ type: "customToken", token });
  } catch (adminError) {
    console.error("[demo/token] Admin provisioning failed:", adminError);

    if (!password) {
      return NextResponse.json(
        {
          error:
            "Demo account is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH locally or DEMO_ACCOUNT_PASSWORD for fallback login.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ type: "password", email: DEMO_ACCOUNT_EMAIL, password });
  }
}
