import assert from "node:assert/strict";
import { test } from "node:test";

import { hasPermission, resolveAccessScopes, type UserEntity, type UserRole } from "@autocore/rbac";

import { CORE_TOOL_NAMES, type CoreToolName } from "@/domain/ai/tool-schemas";
import { CORE_TOOL_PURPOSES } from "@/domain/ai/tool-purposes";
import { isAllowedHref } from "@/domain/ai/internal-href";

/**
 * The Admin SDK bypasses Firestore rules, so conditional tool registration is
 * the boundary that keeps a mechanic out of the company ledger. These tests
 * pin the matrix rather than the implementation.
 *
 * `buildCoreTools` is `server-only`, so the registration predicate is mirrored
 * here from `src/lib/ai/tools/index.ts` and asserted against the real scopes.
 */
function expectedToolsFor(user: UserEntity): CoreToolName[] {
  const scopes = resolveAccessScopes(user);
  const names: CoreToolName[] = [];

  if (scopes.inventory !== "none") {
    names.push("searchInventory", "findStockLocation", "getWarehouseLocation");
  }
  if (hasPermission(user, "inventory_edit")) {
    names.push(
      "createInventoryItem",
      "receiveStock",
      "relocateStock",
      "createEngine",
      "sellEngine",
    );
  }
  if (scopes.workOrders !== "none") names.push("listWorkOrders", "getWorkOrder");
  if (hasPermission(user, "work_orders_edit")) {
    names.push("createWorkOrder", "transitionWorkOrderStatus");
  }
  if (hasPermission(user, "work_orders_view")) names.push("ensureWorkOrderDocuments");
  if (hasPermission(user, "clients_manage")) names.push("createClient");
  if (scopes.motors !== "none") names.push("searchEngines");
  if (
    hasPermission(user, "engine_intake_verify") ||
    hasPermission(user, "engine_intake_execute")
  ) {
    names.push("createEngineIntakeJob");
  }
  if (scopes.accounting === "company") names.push("getFinanceSummary");
  if (scopes.accounting === "company" && hasPermission(user, "accounting_edit")) {
    names.push("createAccountingOperation");
  }
  names.push("navigateTo", "listCapabilities");
  return names;
}

function userWithRole(role: UserRole, overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: `uid-${role}`,
    email: `${role}@example.com`,
    displayName: role,
    role,
    companyId: "company-1",
    isActive: true,
    ...overrides,
  };
}

test("owner gets every Core tool", () => {
  const tools = expectedToolsFor(userWithRole("owner", { isCompanyOwner: true }));
  assert.deepEqual([...tools].sort(), [...CORE_TOOL_NAMES].sort());
});

test("every Core tool has a purpose string", () => {
  for (const name of CORE_TOOL_NAMES) {
    assert.ok(CORE_TOOL_PURPOSES[name], `${name} missing purpose`);
  }
});

test("mechanic cannot reach accounting, inventory or engines", () => {
  const tools = expectedToolsFor(userWithRole("mechanic"));
  assert.ok(!tools.includes("getFinanceSummary"), "mechanic must not get finance");
  assert.ok(!tools.includes("searchInventory"), "mechanic must not get inventory");
  assert.ok(!tools.includes("searchEngines"), "mechanic must not get engines");
  assert.ok(!tools.includes("createEngine"), "mechanic must not create engines");
  // Mechanics hold work_orders_edit for status/claim flows — create is gated the same way.
  assert.ok(tools.includes("createWorkOrder"));
  assert.ok(tools.includes("listCapabilities"));
  assert.ok(tools.includes("navigateTo"));
  assert.ok(tools.includes("listWorkOrders"));
});

test("manager can create engines and stock when inventory_edit is granted", () => {
  const tools = expectedToolsFor(userWithRole("manager"));
  assert.ok(tools.includes("searchEngines"));
  assert.ok(tools.includes("createEngine"));
  assert.ok(tools.includes("createInventoryItem"));
  assert.ok(tools.includes("createWorkOrder"));
});

test("mechanic work-order scope is row-limited, not company-wide", () => {
  const scopes = resolveAccessScopes(userWithRole("mechanic"));
  assert.equal(scopes.workOrders, "assigned_work_orders");
});

test("payroll_view_own never resolves to company accounting", () => {
  const scopes = resolveAccessScopes(userWithRole("mechanic"));
  assert.equal(scopes.payroll, "own_payroll");
  assert.equal(scopes.accounting, "none");
  assert.ok(!expectedToolsFor(userWithRole("mechanic")).includes("getFinanceSummary"));
});

test("diagnostician gets work-order tools plus navigation/capabilities", () => {
  const tools = new Set(expectedToolsFor(userWithRole("diagnostician")));
  assert.ok(tools.has("getWorkOrder"));
  assert.ok(tools.has("listWorkOrders"));
  assert.ok(tools.has("createWorkOrder"));
  assert.ok(tools.has("navigateTo"));
  assert.ok(tools.has("listCapabilities"));
  assert.ok(!tools.has("searchInventory"));
});

test("accountant gets finance writes but no warehouse or engines", () => {
  const tools = expectedToolsFor(userWithRole("accountant"));
  assert.ok(tools.includes("getFinanceSummary"));
  assert.ok(tools.includes("createAccountingOperation"));
  assert.ok(!tools.includes("searchInventory"));
  assert.ok(!tools.includes("searchEngines"));
});

test("deactivated user gets navigation and capabilities only", () => {
  const tools = expectedToolsFor(userWithRole("admin", { isActive: false }));
  assert.deepEqual([...tools].sort(), ["listCapabilities", "navigateTo"].sort());
});

test("every registered name is a known tool", () => {
  for (const role of [
    "owner",
    "admin",
    "manager",
    "accountant",
    "mechanic",
    "diagnostician",
    "employee",
  ] as const) {
    for (const name of expectedToolsFor(userWithRole(role))) {
      assert.ok(CORE_TOOL_NAMES.includes(name), `${name} is not in CORE_TOOL_NAMES`);
    }
  }
});

test("navigateTo rejects paths that leave the origin", () => {
  for (const href of [
    "//evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/\\evil.com",
    "evil.com",
    "/not-a-real-route",
    "",
  ]) {
    assert.equal(isAllowedHref(href), false, `${JSON.stringify(href)} must be rejected`);
  }
});

test("navigateTo accepts real app routes", () => {
  for (const href of [
    "/",
    "/work-orders",
    "/motors?collection=engines",
    "/warehouse?location=abc",
    "/accounting",
  ]) {
    assert.equal(isAllowedHref(href), true, `${href} must be allowed`);
  }
});
