import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** AI photo matching is temporarily disabled for engine intake. */
export async function POST() {
  return NextResponse.json(
    { error: "AI matching is temporarily disabled" },
    { status: 503 },
  );
}
