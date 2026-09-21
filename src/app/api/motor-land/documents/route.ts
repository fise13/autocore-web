import { NextResponse } from "next/server";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { HISTORY_LIMIT, coerceSaleDocument, documentIdFor } from "@/lib/motor-land/history";

/**
 * Shared history for the Motor Land document desk (docs.myautocore.com).
 *
 * The desk is deliberately open — counter staff do not sign in — so this route
 * is unauthenticated and every computer sees the same list. That makes the body
 * untrusted input: it is rebuilt field by field through `coerceSaleDocument`
 * and capped, so nothing but a well-formed waybill of bounded size is ever
 * stored.
 *
 * ponytail: open endpoint, scoped to one small collection. Put it behind a
 * shared secret or sign-in if the URL ever leaks beyond the shop.
 */
const COLLECTION = "motorLandDocuments";
const MAX_ITEMS = 50;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .orderBy("savedAt", "desc")
    .limit(HISTORY_LIMIT)
    .get();

  return NextResponse.json(
    snapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  const data = coerceSaleDocument(body?.data);

  if (!data) {
    return NextResponse.json({ error: "Документ не распознан" }, { status: 400 });
  }
  if (data.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Не больше ${MAX_ITEMS} позиций` }, { status: 400 });
  }

  const id = documentIdFor(data.documentNumber);
  const savedAt = new Date().toISOString();
  await getAdminFirestore().collection(COLLECTION).doc(id).set({ savedAt, data });

  return NextResponse.json({ id, savedAt, data });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Нужен id" }, { status: 400 });

  await getAdminFirestore().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}
