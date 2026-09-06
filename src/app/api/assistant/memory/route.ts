import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { hasPermission } from "@autocore/rbac";

import { forgetCompanyFact, rememberCompanyFact } from "@/lib/ai/company-brain.server";
import { listCompanyMemories } from "@/infrastructure/firestore/admin/company-brain-admin";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { userCopy } from "@/lib/user-copy";

export const runtime = "nodejs";

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remember"),
    text: z.string().trim().min(1).max(2000),
    tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  }),
  z.object({
    action: z.literal("forget"),
    memoryId: z.string().trim().min(1).max(120),
  }),
]);

function accessError(error: MobileAccessError) {
  if (error.status === 401) return NextResponse.json({ error: userCopy.ai.errorUnauthorized }, { status: 401 });
  if (error.status === 403) return NextResponse.json({ error: userCopy.ai.errorForbidden }, { status: 403 });
  return NextResponse.json({ error: userCopy.ai.errorGeneric }, { status: error.status });
}

export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    if (!hasPermission(access.profile, "settings_manage")) {
      return NextResponse.json({ error: userCopy.ai.errorForbidden }, { status: 403 });
    }
    const memories = await listCompanyMemories(access.companyId);
    return NextResponse.json({ memories });
  } catch (error) {
    if (error instanceof MobileAccessError) return accessError(error);
    console.error("[assistant:memory:get]", error);
    return NextResponse.json({ error: userCopy.ai.errorGeneric }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);
    if (!hasPermission(access.profile, "settings_manage")) {
      return NextResponse.json({ error: userCopy.ai.errorForbidden }, { status: 403 });
    }
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: userCopy.ai.errorBadRequest }, { status: 400 });
    }
    if (parsed.data.action === "remember") {
      const memory = await rememberCompanyFact({
        companyId: access.companyId,
        uid: access.uid,
        text: parsed.data.text,
        tags: parsed.data.tags ?? [],
      });
      return NextResponse.json({ memory });
    }
    const deleted = await forgetCompanyFact({
      companyId: access.companyId,
      memoryId: parsed.data.memoryId,
    });
    if (!deleted) {
      return NextResponse.json({ error: userCopy.ai.errorBadRequest }, { status: 404 });
    }
    return NextResponse.json({ ok: true, memoryId: parsed.data.memoryId });
  } catch (error) {
    if (error instanceof MobileAccessError) return accessError(error);
    console.error("[assistant:memory:post]", error);
    return NextResponse.json({ error: userCopy.ai.errorGeneric }, { status: 500 });
  }
}
