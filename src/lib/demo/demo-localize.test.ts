import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { DEMO_COMPANY_ID } from "./demo-config";
import { DEMO_CLIENT_IDS, DEMO_ITEM_IDS, DEMO_WORK_ORDER_IDS } from "./demo-ids";
import {
  localizeDemoClientName,
  localizeDemoCompanyName,
  localizeDemoItemName,
  localizeDemoOwnerName,
  localizeDemoWorkOrderFields,
} from "./demo-localize";
import { setActiveUserCopyLocale } from "@/lib/user-copy";

describe("demo-localize", () => {
  afterEach(() => {
    setActiveUserCopyLocale("en");
  });

  it("localizes the shared demo company name", () => {
    setActiveUserCopyLocale("en");
    assert.equal(localizeDemoCompanyName(DEMO_COMPANY_ID, "Демо — AutoCore Разборка"), "Demo — AutoCore Dismantling");
    setActiveUserCopyLocale("ru");
    assert.equal(localizeDemoCompanyName(DEMO_COMPANY_ID, "Demo — AutoCore Dismantling"), "Демо — AutoCore Разборка");
    assert.equal(localizeDemoCompanyName("other", "Acme"), "Acme");
  });

  it("localizes the demo owner and catalog strings", () => {
    setActiveUserCopyLocale("en");
    assert.equal(localizeDemoOwnerName("Демо AutoCore"), "Demo AutoCore");
    assert.equal(localizeDemoClientName(DEMO_CLIENT_IDS.alexey, "Алексей Ким"), "Alexey Kim");
    assert.equal(localizeDemoItemName(DEMO_ITEM_IDS.oilFilter, "Масляный фильтр"), "Oil filter");
  });

  it("localizes seeded work-order copy", () => {
    setActiveUserCopyLocale("en");
    const localized = localizeDemoWorkOrderFields({
      id: DEMO_WORK_ORDER_IDS.completed,
      companyId: DEMO_COMPANY_ID,
      number: "НЗ-2026-0142",
      clientId: DEMO_CLIENT_IDS.alexey,
      clientName: "Алексей Ким",
      comment: "Замена двигателя G4KC",
      laborLines: [{ id: "l1", title: "Снятие и установка двигателя" }],
      partLines: [{ itemId: DEMO_ITEM_IDS.oilFilter, name: "Масляный фильтр" }],
    });
    assert.equal(localized.number, "WO-2026-0142");
    assert.equal(localized.clientName, "Alexey Kim");
    assert.equal(localized.comment, "G4KC engine replacement, post-install diagnostics");
    assert.equal(localized.laborLines[0]?.title, "Engine removal and installation");
    assert.equal(localized.partLines[0]?.name, "Oil filter");
  });
});
