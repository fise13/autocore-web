import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stripUndefinedDeep } from "../../../autocore-mobile/lib/firestore/strip-undefined.ts";

type QuietHoursConfig = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
};

type NotificationPreferences = {
  channels: {
    push: boolean;
    email: boolean;
    inbox: boolean;
    inApp?: boolean;
  };
  categories: Record<string, boolean>;
  quietHours: QuietHoursConfig;
  emailDigestEnabled: boolean;
  updatedAt?: string;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: { push: true, email: false, inbox: true, inApp: true },
  categories: { team: true, work_orders: true },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: "Europe/Moscow",
  },
  emailDigestEnabled: false,
};

function hasUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true;
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUndefinedDeep);
  return Object.values(value as Record<string, unknown>).some(hasUndefinedDeep);
}

function buildSavePayload(preferences: NotificationPreferences): NotificationPreferences {
  return stripUndefinedDeep({
    ...preferences,
    updatedAt: new Date().toISOString(),
  });
}

describe("notification preferences firestore payload", () => {
  it("never contains undefined fields (mobile save contract)", () => {
    const preferences: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      channels: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
        inApp: undefined,
      },
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: "Europe/Moscow",
      },
    };

    const payload = buildSavePayload(preferences);
    assert.equal(hasUndefinedDeep(payload), false);
    assert.equal(typeof payload.updatedAt, "string");
    assert.equal(payload.quietHours.startHour, 22);
    assert.equal("inApp" in payload.channels, false);
  });
});
