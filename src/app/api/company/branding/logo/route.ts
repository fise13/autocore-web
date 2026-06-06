import { NextRequest, NextResponse } from "next/server";

import {
  assertLogoUpload,
  persistCompanyLogo,
  saveCompanyLogoReference,
} from "@/lib/company/upload-company-logo.server";
import {
  CompanySettingsAccessError,
  verifyCompanySettingsAccess,
} from "@/lib/company/verify-company-settings-access";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const access = await verifyCompanySettingsAccess(request);
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
    const result = await persistCompanyLogo(access.companyId, buffer, contentType, extension);

    if (result.storage === "cloud") {
      await saveCompanyLogoReference(access.companyId, result.logoUrl, "cloud");
    }

    return NextResponse.json({
      logoUrl: result.logoUrl,
      storage: result.storage,
    });
  } catch (error) {
    if (error instanceof CompanySettingsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[company/branding/logo]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload logo" },
      { status: 500 },
    );
  }
}
