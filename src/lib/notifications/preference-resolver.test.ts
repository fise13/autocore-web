import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isInQuietHours,
  mergeNotificationPreferences,
  resolveChannelsForUser,
} from "./preference-resolver.ts";

describe("mergeNotificationPreferences", () => {
  it("fills defaults when partial is empty", () => {
    const merged = mergeNotificationPreferences(null);
    assert.equal(merged.channels.push, true);
    assert.equal(merged.quietHours.startHour, 22);
    assert.equal(merged.categories.team, true);
  });

  it("merges quiet hours patch without dropping other fields", () => {
    const merged = mergeNotificationPreferences({
      quietHours: { enabled: true, startHour: 21, endHour: 7, timezone: "Europe/Moscow" },
    });
    assert.equal(merged.quietHours.enabled, true);
    assert.equal(merged.quietHours.startHour, 21);
    assert.equal(merged.channels.inbox, true);
  });
});

describe("isInQuietHours", () => {
  it("returns false when quiet mode is disabled", () => {
    const prefs = mergeNotificationPreferences({
      quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours, enabled: false },
    });
    assert.equal(isInQuietHours(prefs, new Date("2026-07-06T23:00:00+03:00")), false);
  });

  it("detects overnight quiet window (22:00–8:00 Moscow)", () => {
    const prefs = mergeNotificationPreferences({
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: "Europe/Moscow",
      },
    });

    assert.equal(isInQuietHours(prefs, new Date("2026-07-06T23:00:00+03:00")), true);
    assert.equal(isInQuietHours(prefs, new Date("2026-07-06T12:00:00+03:00")), false);
    assert.equal(isInQuietHours(prefs, new Date("2026-07-06T07:30:00+03:00")), true);
  });
});

describe("resolveChannelsForUser", () => {
  it("suppresses push during quiet hours for non-critical events", () => {
    const prefs = mergeNotificationPreferences({
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: "Europe/Moscow",
      },
    });

    const atNight = new Date("2026-07-06T23:00:00+03:00");
    const channels = resolveChannelsForUser({
      preferences: prefs,
      priority: "medium",
      requested: ["inbox", "push", "badge"],
      at: atNight,
    });

    assert.ok(channels.includes("inbox"));
    assert.equal(channels.includes("push"), false);
    assert.equal(channels.includes("badge"), false);
    assert.equal(isInQuietHours(prefs, atNight), true);
  });

  it("keeps push for critical events during quiet hours", () => {
    const prefs = mergeNotificationPreferences({
      quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: "Europe/Moscow",
      },
    });

    const atNight = new Date("2026-07-06T23:00:00+03:00");
    const channels = resolveChannelsForUser({
      preferences: prefs,
      priority: "critical",
      requested: ["inbox", "push"],
      at: atNight,
    });

    assert.ok(channels.includes("push"));
    assert.ok(channels.includes("inbox"));
    assert.ok(channels.includes("badge"));
  });
});
