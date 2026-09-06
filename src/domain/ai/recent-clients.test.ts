import assert from "node:assert/strict";
import test from "node:test";

import { uniqueClientsFromRecentOrders } from "@/domain/ai/recent-clients";

test("keeps the first (newest) work order per customer", () => {
  const rows = uniqueClientsFromRecentOrders([
    { id: "wo-new", number: "12", clientId: "c1", clientName: "Anna", clientPhone: "111" },
    { id: "wo-old", number: "8", clientId: "c1", clientName: "Anna", clientPhone: "111" },
    { id: "wo-b", number: "11", clientName: "Boris", clientPhone: "222" },
  ]);
  assert.deepEqual(rows, [
    {
      id: "c1",
      fullName: "Anna",
      phone: "111",
      lastWorkOrderId: "wo-new",
      lastWorkOrderNumber: "12",
    },
    {
      id: "boris",
      fullName: "Boris",
      phone: "222",
      lastWorkOrderId: "wo-b",
      lastWorkOrderNumber: "11",
    },
  ]);
});

test("skips orders with no client identity", () => {
  const rows = uniqueClientsFromRecentOrders([{ id: "wo-1", number: "1" }]);
  assert.equal(rows.length, 0);
});
