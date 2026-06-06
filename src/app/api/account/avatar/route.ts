import { NextRequest, NextResponse } from "next/server";

import { assertLogoUpload } from "@/lib/company/upload-company-logo.server";
import { AccountAccessError, verifyAccountAccess } from "@/lib/auth/verify-account-access";
import { persistUserAvatar, saveUserAvatarReference } from "@/lib/user/upload-user-avatar.server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyAccountAccess(request);
    const formData = await request.formData();
    const entry = formData.get("file");

    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const { extension, contentType } = assertLogoUpload({
      size: entry.size,
      type: entry.type,
      name: entry.name,
    });
    const buffer = Buffer.from(await entry.arrayBuffer());
    const result = await persistUserAvatar(access.uid, buffer, contentType, extension);

    if (result.storage === "cloud") {
      await saveUserAvatarReference(access.uid, result.photoURL, "cloud");
    }

    return NextResponse.json({
      photoURL: result.photoURL,
      storage: result.storage,
    });
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/avatar]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 },
    );
  }
}
