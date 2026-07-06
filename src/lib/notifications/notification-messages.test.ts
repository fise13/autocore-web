import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NotificationEventContext } from "@/domain/notifications";
import { getNotificationEventDefinition } from "@/domain/notifications/event-registry";

function ctx(overrides: Partial<NotificationEventContext>): NotificationEventContext {
  return {
    companyId: "company-1",
    eventType: "employee.joined_welcome",
    ...overrides,
  };
}

describe("notification message copy", () => {
  it("builds welcome message after invite join", () => {
    const def = getNotificationEventDefinition("employee.joined_welcome");
    const copy = def.buildCopy(
      ctx({
        eventType: "employee.joined_welcome",
        payload: {
          companyName: "AutoService Pro",
          summary: "Вы присоединились к «AutoService Pro»",
        },
      }),
    );

    assert.equal(copy.title, "Добро пожаловать в команду");
    assert.match(copy.body, /AutoService Pro/);
  });

  it("builds admin message when employee joins by invite", () => {
    const def = getNotificationEventDefinition("employee.joined_by_invite");
    const copy = def.buildCopy(
      ctx({
        eventType: "employee.joined_by_invite",
        actorName: "Иван Петров",
        payload: { summary: "Иван Петров присоединился к команде", role: "Механик" },
      }),
    );

    assert.equal(copy.title, "Новый сотрудник");
    assert.match(copy.body, /Иван Петров присоединился/);
  });

  it("builds removal message for suspended employee", () => {
    const def = getNotificationEventDefinition("employee.removed_from_company");
    const copy = def.buildCopy(
      ctx({
        eventType: "employee.removed_from_company",
        payload: {
          companyName: "AutoService Pro",
          summary: "Вас удалили из «AutoService Pro»",
        },
      }),
    );

    assert.equal(copy.title, "Доступ к компании закрыт");
    assert.match(copy.body, /удалили/);
    assert.match(copy.body, /AutoService Pro/);
  });

  it("builds suspension message", () => {
    const def = getNotificationEventDefinition("employee.access_suspended");
    const copy = def.buildCopy(
      ctx({
        eventType: "employee.access_suspended",
        payload: {
          companyName: "AutoService Pro",
        },
      }),
    );

    assert.equal(copy.title, "Доступ приостановлен");
    assert.match(copy.body, /приостановил/);
  });

  it("builds work order assignment message with order number", () => {
    const def = getNotificationEventDefinition("work_order.assigned");
    const copy = def.buildCopy(
      ctx({
        eventType: "work_order.assigned",
        aggregateId: "wo-42",
        payload: { orderNumber: "1042" },
      }),
    );

    assert.equal(copy.title, "Назначение на наряд");
    assert.match(copy.body, /1042/);
    assert.equal(def.buildDeepLink(ctx({ aggregateId: "wo-42" })), "autocoremobile://orders/wo-42");
  });
});
