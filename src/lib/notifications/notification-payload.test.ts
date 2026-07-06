import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stripUndefinedDeep } from "@/lib/firestore/strip-undefined";

describe("notification inbox payload", () => {
  it("removes undefined optional fields before Firestore write", () => {
    const payload = stripUndefinedDeep({
      id: "n1",
      userId: "u1",
      companyId: "c1",
      eventType: "employee.invited",
      category: "team",
      priority: "medium",
      title: "Приглашение в команду",
      body: "Создан код приглашения ABC123",
      state: "unread",
      deepLink: "autocoremobile://profile/team",
      actorUserId: "u1",
      actorName: undefined,
      aggregateType: "invite",
      aggregateId: "inv1",
      eventId: undefined,
      channelsDelivered: ["inbox", "push"],
      createdAt: new Date().toISOString(),
    });

    assert.equal("actorName" in payload, false);
    assert.equal("eventId" in payload, false);
    assert.equal(JSON.stringify(payload).includes("undefined"), false);
  });
});
