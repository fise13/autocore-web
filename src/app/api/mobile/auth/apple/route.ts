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
        { error: "Требуются idToken и rawNonce от Sign in with Apple" },
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
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Не удалось выполнить вход через Apple";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
