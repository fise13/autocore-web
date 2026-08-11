import { NextResponse, type NextRequest } from "next/server";

import { resolveAssistantContext } from "@/lib/ai/assistant-context";
import { buildCoreSuggestions } from "@/lib/ai/suggestions.server";
import { MobileAccessError, verifyMobileAccess } from "@/lib/auth/verify-mobile-access.server";
import { isInventoryCollectionId } from "@/lib/navigation/inventory-collections";

export const runtime = "nodejs";

/**
 * Live prompt chips for the Core empty state.
 *
 * Separate from the chat route because it runs on mount without a model call:
 * the chips are read straight from company data, RBAC-scoped, so they can name
 * real numbers ("8 parts below reorder point") instead of guessing at what the
 * user might want.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await verifyMobileAccess(request);

    const params = request.nextUrl.searchParams;
    const rawCollection = params.get("collection");
    const context = resolveAssistantContext({
      pathname: params.get("pathname")?.trim() || "/",
      collection: isInventoryCollectionId(rawCollection) ? rawCollection : undefined,
    });

    const suggestions = await buildCoreSuggestions(
      {
        uid: access.uid,
        companyId: access.companyId,
        profile: access.profile,
        scopes: access.scopes,
      },
      context,
    );

    return NextResponse.json(
      { suggestions },
      // Short private cache: the chips are per-user and change with the data,
      // but a remount inside a minute should not re-read Firestore.
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error) {
    if (error instanceof MobileAccessError) {
      // The empty state falls back to static suggestions — never surface an error.
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }
    console.error("[assistant:suggestions]", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
