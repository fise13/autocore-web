export type RecentClientSourceOrder = {
  id: string;
  number: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
};

export type RecentClientRow = {
  id: string;
  fullName: string;
  phone: string;
  lastWorkOrderId: string;
  lastWorkOrderNumber: string;
};

/**
 * First occurrence wins. Callers should pass orders newest-first so the
 * surviving row is that customer's latest job.
 */
export function uniqueClientsFromRecentOrders(
  orders: RecentClientSourceOrder[],
): RecentClientRow[] {
  const seen = new Map<string, RecentClientRow>();
  for (const order of orders) {
    const name = order.clientName?.trim() ?? "";
    const clientId = order.clientId?.trim() ?? "";
    if (!name && !clientId) continue;
    const key = (clientId || name).toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      id: clientId || key,
      fullName: name || "Client",
      phone: order.clientPhone?.trim() || "",
      lastWorkOrderId: order.id,
      lastWorkOrderNumber: order.number,
    });
  }
  return [...seen.values()];
}
