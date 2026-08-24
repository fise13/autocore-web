import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** AI photo matching is disabled. The Engine intake UI no longer calls this route. */
export async function POST() {
  return NextResponse.json(
    {
      error: "AI matching is disabled",
      disabled: true,
    },
    { status: 503 },
  );
}
