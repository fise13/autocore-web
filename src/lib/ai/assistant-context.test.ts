import assert from "node:assert/strict";
import test from "node:test";

import { describeAssistantContext, resolveAssistantContext } from "@/lib/ai/assistant-context";

test("resolves the area from the route the AI was opened on", () => {
  assert.equal(resolveAssistantContext({ pathname: "/" }).areaId, "dashboard");
  assert.equal(resolveAssistantContext({ pathname: "/motors" }).areaId, "engines");
  assert.equal(resolveAssistantContext({ pathname: "/sold" }).areaId, "sales");
  assert.equal(resolveAssistantContext({ pathname: "/work-orders/abc" }).areaId, "work_orders");
  assert.equal(resolveAssistantContext({ pathname: "/accounting" }).areaId, "finance");
  assert.equal(resolveAssistantContext({ pathname: "/engine-intake/new" }).areaId, "engines");
  assert.equal(resolveAssistantContext({ pathname: "/roles" }).areaId, "team");
});

test("unknown routes still resolve to a usable workspace context", () => {
  const context = resolveAssistantContext({ pathname: "/something-else" });
  assert.equal(context.areaId, "workspace");
  assert.ok(context.suggestions.length > 0);
});

test("every area offers contextual suggestions", () => {
  for (const pathname of [
    "/",
    "/motors",
    "/sold",
    "/engine-intake",
    "/work-orders",
    "/documents",
    "/accounting",
    "/my-earnings",
    "/warehouse",
    "/specific",
    "/imports",
    "/quotes",
    "/donors",
    "/used-parts",
    "/stocktake",
    "/team",
    "/settings",
  ]) {
    const context = resolveAssistantContext({ pathname });
    assert.ok(context.suggestions.length >= 3, `${pathname} has too few suggestions`);
    assert.ok(context.areaLabel.trim().length > 0);
  }
});

test("focus carries the inventory collection and selection into the prompt", () => {
  const context = resolveAssistantContext({
    pathname: "/motors",
    collection: "transmissions",
    brandName: "Subaru",
  });
  assert.deepEqual(context.focus, ["Transmissions", "Subaru"]);
  assert.match(describeAssistantContext(context), /\/motors.*Transmissions, Subaru/);
});

test("collection focus is dropped where it means nothing", () => {
  const context = resolveAssistantContext({ pathname: "/work-orders", collection: "engines" });
  assert.deepEqual(context.focus, []);
});

test("customers override keeps the work-order path but a customer area", () => {
  const context = resolveAssistantContext({
    pathname: "/work-orders",
    areaOverride: "customers",
  });
  assert.equal(context.areaId, "customers");
  assert.equal(context.areaLabel, "Customers");
  assert.ok(context.suggestions.some((item) => /customer/i.test(item)));
});
