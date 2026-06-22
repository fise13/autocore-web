import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  assertResolveEmailRateLimit,
  EmailRateLimitError,
  markResolveEmailLookup,
} from "@/lib/email/rate-limit";

export const runtime = "nodejs";

type ResolveInviteResponse = {
  email: string;
  companyName: string;
};

function readClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function readExpiresAt(raw: unknown): Date | null {
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "object" && raw !== null && "toDate" in raw) {
    const toDate = (raw as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") return toDate.call(raw);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const clientIp = readClientIp(request);
    await assertResolveEmailRateLimit(clientIp, `invite:${token}`);

    const db = getAdminFirestore();
    const snapshot = await db.collection("invites").where("token", "==", token).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const inviteDoc = snapshot.docs[0]!;
    const invite = inviteDoc.data();
    const email = typeof invite.email === "string" ? invite.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invite has no email" }, { status: 422 });
    }

    const used = invite.used === true;
    const expiresAt = readExpiresAt(invite.expiresAt);
    if (!used && (!expiresAt || expiresAt.getTime() <= Date.now())) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    const companyId = String(invite.companyId ?? "").trim();
    let companyName = "AutoCore";
    if (companyId) {
      const companySnap = await db.collection("companies").doc(companyId).get();
      companyName = String(companySnap.data()?.name ?? companyName);
    }

    await markResolveEmailLookup(clientIp, `invite:${token}`);

    return NextResponse.json({
      email,
      companyName,
    } satisfies ResolveInviteResponse);
  } catch (error) {
    if (error instanceof EmailRateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSec: error.retryAfterSec },
        { status: 429 },
      );
    }
    console.error("[invites/resolve]", error);
    return NextResponse.json({ error: "Invite lookup unavailable" }, { status: 503 });
  }
}
