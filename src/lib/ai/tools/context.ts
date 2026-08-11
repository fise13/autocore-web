import type { AccessScopes, UserEntity } from "@autocore/rbac";

/**
 * Everything a Core tool needs to answer safely.
 *
 * `scopes` is not redundant with `profile`: a mechanic holds `work_orders_view`
 * *and* a row-level scope of `assigned_work_orders`. Gating on the permission
 * alone would leak the whole company's orders, so tools must consult both.
 */
export type CoreToolContext = {
  uid: string;
  companyId: string;
  profile: UserEntity;
  scopes: AccessScopes;
};

/** Soft failure shape shared by every tool — surfaced as a card, never a throw. */
export type ToolFailure = { ok: false; reason: string };

export function toolFailure(reason: string): ToolFailure {
  return { ok: false, reason };
}

/**
 * Tools return failures instead of throwing so one bad step doesn't kill the
 * stream — the model can read the reason and try a different surface.
 */
export function describeToolError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 300);
  }
  return fallback;
}
