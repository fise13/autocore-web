import "server-only";

import type { ActionCodeSettings } from "firebase-admin/auth";

import { buildAuthActionUrl } from "@/lib/email/action-link";

export { buildAuthActionPath, buildAuthActionUrl } from "@/lib/email/action-link";

export function buildActionCodeSettings(): ActionCodeSettings {
  return {
    url: buildAuthActionUrl(),
    handleCodeInApp: true,
  };
}
