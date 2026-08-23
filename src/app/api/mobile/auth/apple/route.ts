import { NextResponse } from "next/server";

import { completeMobileAppleSignIn } from "@/lib/auth/apple-mobile-sign-in.server";

type AppleSignInBody = {
  idToken?: string;
  rawNonce?: string;
  authorizationCode?: string | null;
  email?: string | null;
  fullName?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AppleSignInBody;
    const idToken = body.idToken?.trim() ?? "";
    const rawNonce = body.rawNonce?.trim() ?? "";

    if (!idToken || !rawNonce) {
      return NextResponse.json(
        { error: "idToken and rawNonce from Sign in with Apple are required" },
        { status: 400 },
      );
    }

    const result = await completeMobileAppleSignIn({
      idToken,
      rawNonce,
      authorizationCode: body.authorizationCode ?? null,
      email: body.email ?? null,
      fullName: body.fullName ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[mobile/auth/apple]", error);
    const raw =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Could not sign in with Apple";
    const message =
      /FIREBASE_SERVICE_ACCOUNT|Firebase Admin/i.test(raw)
        ? "Apple sign-in is not configured on the server (Firebase Admin). Please contact support."
        : raw;
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
