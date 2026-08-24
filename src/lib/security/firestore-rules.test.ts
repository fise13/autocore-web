import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Static guards over firestore.rules.
 *
 * These are not a substitute for emulator-backed rules tests — they cannot
 * evaluate a request. What they do is pin the specific mistakes that have
 * already been made once, so a future edit cannot quietly reintroduce them
 * while the file still compiles and deploys.
 *
 * The rule this file exists for: motors live at `users/{uid}/motors/{localId}`,
 * so a document's *author* and its *owning company* are different things.
 * Granting access on authorship alone left removed employees able to read and
 * delete company stock indefinitely, because offboarding never rewrites these
 * documents.
 */

const RULES = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");

/**
 * Extract a `match <path> { ... }` block by brace matching.
 *
 * Counting braces from the start of the header would latch onto the path
 * parameter — `{motorDocId}` in `match /motors/{motorDocId}` — and return a
 * one-token "block". Scanning begins past the header so the first brace seen is
 * the one that opens the body.
 */
function matchBlock(header: string): string {
  const start = RULES.indexOf(header);
  assert.notEqual(start, -1, `rules block not found: ${header}`);

  const bodyStart = RULES.indexOf("{", start + header.length);
  assert.notEqual(bodyStart, -1, `rules block has no body: ${header}`);

  let depth = 0;
  for (let i = bodyStart; i < RULES.length; i += 1) {
    const char = RULES[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return RULES.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated rules block: ${header}`);
}

/** Collapse whitespace so assertions are insensitive to reformatting. */
function normalize(block: string): string {
  return block.replace(/\s+/g, " ");
}

describe("firestore.rules — motor mirror tenancy", () => {
  const motors = normalize(matchBlock("match /motors/{motorDocId}"));

  it("never grants read on authorship alone", () => {
    assert.ok(
      !motors.includes("allow read: if isSignedIn() && request.auth.uid == userId;"),
      "a bare author-only read lets a removed employee keep reading company stock",
    );
  });

  it("never grants delete on authorship alone", () => {
    assert.ok(
      !motors.includes("allow delete: if isSignedIn() && request.auth.uid == userId;"),
      "a bare author-only delete lets a removed employee wipe company stock",
    );
  });

  it("gates author-scoped access behind the legacy-link escape hatch", () => {
    // Author-scoped rules are allowed only for records with no real company
    // binding. Every such rule must carry that qualifier.
    const authorScoped = motors
      .split("allow ")
      .filter((clause) => clause.includes("request.auth.uid == userId"))
      .filter((clause) => clause.startsWith("read") || clause.startsWith("delete"));

    assert.ok(authorScoped.length > 0, "expected author-scoped read/delete clauses to exist");
    for (const clause of authorScoped) {
      assert.ok(
        clause.includes("motorCompanyLinkIsLegacy(resource.data)"),
        `author-scoped clause missing legacy qualifier: ${clause.slice(0, 120)}`,
      );
    }
  });

  it("keeps companyId immutable across updates", () => {
    assert.ok(
      motors.includes("request.resource.data.companyId == resource.data.companyId"),
      "without this a member of two companies can retag stock into the other tenant",
    );
  });

  it("pins a kill-by date so the legacy hatch cannot linger unmarked", () => {
    assert.ok(
      /Kill-by 2026-09-30/.test(RULES),
      "motorCompanyLinkIsLegacy must stay dated until leftover unscoped motors are gone",
    );
  });
});

describe("firestore.rules — account deletion self-offboarding", () => {
  const employees = normalize(matchBlock("match /employees/{employeeId}"));

  /**
   * Deleting an account has to retire the person's employee record, or they stay
   * `isActive` in the company roster forever — the "associated data" App Store
   * guideline 5.1.1(v) requires deletion to remove. `canManageEmployees`
   * deliberately excludes acting on yourself, so a dedicated self-clause is the
   * only way, and its scope is what keeps it from becoming a privilege hole.
   */
  const selfClauses = employees
    .split("allow ")
    .filter((clause) => clause.startsWith("update"))
    .filter((clause) => clause.includes("request.auth.uid == employeeId"))
    .filter((clause) => clause.includes("'isActive'"));

  it("lets a member retire their own employee record", () => {
    assert.equal(
      selfClauses.length,
      1,
      "expected exactly one self-offboarding clause; more than one is a review hazard",
    );
  });

  it("restricts self-offboarding to the deactivation fields", () => {
    assert.ok(
      selfClauses[0].includes(
        "affectedKeys() .hasOnly(['isActive', 'deletedAt', 'updatedAt'])",
      ),
      "self-offboarding must not be able to touch role, permissions, or identity fields",
    );
  });

  it("only ever lets isActive move to false", () => {
    assert.ok(
      selfClauses[0].includes("request.resource.data.isActive == false"),
      "without this, a deactivated member could reactivate themselves",
    );
  });

  it("keeps the record inside its own company", () => {
    assert.ok(
      selfClauses[0].includes("resource.data.companyId == companyId") &&
        selfClauses[0].includes("request.resource.data.uid == resource.data.uid"),
      "self-offboarding must not be able to retarget the record at another tenant",
    );
  });

  it("lets a user delete their own profile document", () => {
    const users = normalize(matchBlock("match /users/{userId}"));
    assert.ok(
      users.includes("allow delete: if isSignedIn() && request.auth.uid == userId;"),
      "without this the profile survives account deletion",
    );
  });

  it("lets a user clear the personal subcollections deletion removes", () => {
    // `memberships`, `devices` (push tokens), and `notificationPreferences` are
    // the person's own data and must go with the account. `motors` is company
    // inventory and is deliberately not in this list.
    for (const header of [
      "match /memberships/{membershipCompanyId}",
      "match /devices/{deviceId}",
      "match /notificationPreferences/{docId}",
    ]) {
      const block = normalize(matchBlock(header));
      assert.ok(
        block.includes("allow read, write: if isSignedIn() && request.auth.uid == userId;"),
        `${header} must be self-writable or account deletion cannot clear it`,
      );
    }
  });
});

describe("firestore.rules — global invariants", () => {
  it("terminates with an explicit default deny", () => {
    const tail = normalize(RULES.slice(-400));
    assert.ok(
      tail.includes("match /{document=**} { allow read, write: if false; }"),
      "the ruleset must end in a catch-all deny",
    );
  });

  it("keeps inventory movements append-only", () => {
    const movements = normalize(matchBlock("match /inventoryMovements/{movementId}"));
    assert.ok(
      movements.includes("allow update: if false"),
      "stock movements are the audit trail and must never be editable",
    );
  });

  it("binds every top-level operational collection to a company", () => {
    for (const header of [
      "match /inventoryItems/{itemId}",
      "match /financialOperations/{operationId}",
      "match /inventoryMovements/{movementId}",
    ]) {
      const block = normalize(matchBlock(header));
      assert.ok(
        block.includes("companyId"),
        `${header} must scope access by companyId`,
      );
    }
  });

  it("scopes nested dismantler collections to company inventory access", () => {
    for (const header of [
      "match /donors/{donorId}",
      "match /usedParts/{partId}",
      "match /marketplaceListings/{listingId}",
      "match /stocktakeSessions/{sessionId}",
    ]) {
      const block = normalize(matchBlock(header));
      assert.ok(
        block.includes("companyId"),
        `${header} must scope writes by companyId`,
      );
      assert.ok(
        block.includes("canInventoryRead"),
        `${header} must require inventory read`,
      );
    }
  });
});
