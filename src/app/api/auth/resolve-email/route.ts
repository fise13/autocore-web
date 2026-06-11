import { NextRequest, NextResponse } from "next/server";

import { getAdminAuth } from "@/infrastructure/firebase/admin";

export const runtime = "nodejs";

type ResolveEmailResponse = {
  exists: boolean;
  methods: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    try {
      const user = await getAdminAuth().getUserByEmail(email);
      const methods = [
        ...new Set(
          user.providerData
            .map((provider) => provider.providerId)
            .filter((providerId) => providerId.length > 0),
        ),
      ];

      if (methods.length === 0) {
        methods.push("password");
      }

      return NextResponse.json({
        exists: true,
        methods,
      } satisfies ResolveEmailResponse);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "auth/user-not-found") {
        return NextResponse.json({
          exists: false,
          methods: [],
        } satisfies ResolveEmailResponse);
      }
      throw error;
    }
  } catch (error) {
    console.error("[auth/resolve-email]", error);
    return NextResponse.json(
      { error: "Email lookup unavailable" },
      { status: 503 },
    );
  }
}
