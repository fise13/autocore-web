import { NextRequest, NextResponse } from "next/server";

import { getAdminAuth, getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";

export const runtime = "nodejs";

type ProfilePayload = {
  name?: unknown;
  phone?: unknown;
};

function normalizeOptionalString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error("Invalid profile payload");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const body = (await request.json()) as ProfilePayload;

    const name = body.name !== undefined ? normalizeOptionalString(body.name, 120) : undefined;
    const phone = body.phone !== undefined ? normalizeOptionalString(body.phone, 32) : undefined;

    if (name === undefined && phone === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const payload: Record<string, string> = {};
    if (name !== undefined) payload.name = name ?? "";
    if (phone !== undefined) payload.phone = phone ?? "";

    await getAdminFirestore().collection("users").doc(access.uid).set(payload, { merge: true });

    if (name !== undefined && name) {
      try {
        await getAdminAuth().updateUser(access.uid, { displayName: name });
      } catch {
        // Firestore profile is the source of truth for the app UI.
      }

      const userSnap = await getAdminFirestore().collection("users").doc(access.uid).get();
      const companyId = String(userSnap.data()?.companyId ?? "").trim();
      if (companyId) {
        await getAdminFirestore()
          .collection("companies")
          .doc(companyId)
          .collection("employees")
          .doc(access.uid)
          .set({ fullName: name }, { merge: true });
      }
    }

    return NextResponse.json({
      name: name ?? undefined,
      phone: phone ?? undefined,
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/profile]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
