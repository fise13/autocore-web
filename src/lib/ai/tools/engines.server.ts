import "server-only";

import { searchDomain } from "@autocore/domain-search";
import { hasPermission } from "@autocore/rbac";

import { executeEngineIntakeCommand } from "@/application/use-cases/engine-intake/execute-engine-intake-command.server";
import { syncMotorCatalogUseCase } from "@/application/use-cases/motors/sync-motor-catalog";
import { isMotorAvailableForSale, type MotorEntity } from "@/domain/motor";
import {
  adminCreateFinancialOperation,
  adminMarkMotorSold,
} from "@/infrastructure/firestore/admin/core-ops-admin";
import {
  createAdminMotorImportRepositories,
  loadMotorImportServerContext,
} from "@/infrastructure/firestore/admin/motor-import-server-deps";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { toolFailure, type CoreToolContext } from "@/lib/ai/tools/context";
import { listMotorDocumentsBounded } from "@/lib/desktop/fetch-motor.server";

function engineHref(motor: Pick<MotorEntity, "id">): string {
  return `/motors?collection=engines&motor=${encodeURIComponent(motor.id)}`;
}

function summarizeEngine(motor: MotorEntity) {
  return {
    id: motor.id,
    localId: motor.localId,
    serialCode: motor.serialCode,
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    configuration: motor.configuration || undefined,
    transmission: motor.transmission || undefined,
    status: motor.status,
    quality: motor.quality,
    locationCode: motor.primaryLocationCode ?? motor.warehouseLocation ?? undefined,
    quantity: motor.quantity,
    href: engineHref(motor),
  };
}

function haystack(motor: MotorEntity): string {
  return [
    motor.serialCode,
    motor.brandName,
    motor.engineCode,
    motor.configuration,
    motor.transmission,
    motor.quality,
    motor.primaryLocationCode ?? motor.warehouseLocation,
    motor.notes,
    motor.localId != null ? String(motor.localId) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Resolve a loose query ("bmw n54", "бмв") to a canonical brand/engine label.
 *
 * `searchDomain` is pure in-memory fuzzy matching over the shipped brand and
 * engine dictionaries — it handles Cyrillic/Latin transliteration and typos,
 * which a raw `includes` over Firestore fields cannot.
 */
function canonicalTerms(query: string): { terms: string[]; resolved?: string } {
  const raw = query.toLowerCase().split(/\s+/).filter(Boolean);

  for (const category of ["engines", "brands"] as const) {
    const hit = searchDomain(category, query, null, { limit: 1 })[0];
    if (hit && (hit.match === "exact" || hit.match === "prefix" || hit.match === "typo")) {
      return { terms: raw, resolved: hit.entry.name };
    }
  }

  return { terms: raw };
}

export async function searchEngines(
  ctx: CoreToolContext,
  input: { query: string; status?: string; limit: number },
) {
  if (ctx.scopes.motors === "none") {
    return toolFailure("You do not have access to engines in this company.");
  }

  const { terms, resolved } = canonicalTerms(input.query);
  const { items, truncated } = await listMotorDocumentsBounded(ctx.companyId, {
    status: input.status?.trim() || undefined,
  });

  // A canonical hit widens the search rather than replacing it — the user's own
  // wording still has to match something, or "bmw" would return every engine.
  const needles = resolved ? [...terms, resolved.toLowerCase()] : terms;

  const matched = items.filter((doc) => {
    const text = haystack(doc.motor);
    return terms.every((term) => text.includes(term)) || needles.some((term) => text.includes(term));
  });

  return {
    ok: true as const,
    engines: matched.slice(0, input.limit).map(({ motor }) => summarizeEngine(motor)),
    totalMatched: matched.length,
    truncated,
    resolvedTerm: resolved,
    href: "/motors?collection=engines",
  };
}

/**
 * Add one available engine to inventory (same write path as the motors grid).
 *
 * Intake (`create_job`) is a different workflow with photos/checklist — this
 * tool is the direct inventory create operators expect from chat.
 */
export async function createEngine(
  ctx: CoreToolContext,
  input: { brandName: string; engineCode: string; serialCode: string; notes?: string },
) {
  if (!hasPermission(ctx.profile, "inventory_edit")) {
    return toolFailure(
      "Your role can view engines but cannot add them. Ask an owner/admin, or open Engines inventory.",
    );
  }
  if (ctx.scopes.motors === "none") {
    return toolFailure("You do not have access to engines in this company.");
  }

  const serialCode = input.serialCode.trim();
  const brandName = input.brandName.trim();
  const engineCode = input.engineCode.trim();
  const notes = input.notes?.trim() || "";

  const catalog = await loadMotorImportServerContext(ctx.companyId, ctx.uid);
  const duplicate = catalog.existingMotors.find(
    (motor) =>
      !motor.deletedAt &&
      motor.serialCode.trim().localeCompare(serialCode, undefined, { sensitivity: "accent" }) === 0,
  );
  if (duplicate) {
    return toolFailure(
      `Serial ${duplicate.serialCode} is already in inventory` +
        (duplicate.brandName || duplicate.engineCode
          ? ` (${[duplicate.brandName, duplicate.engineCode].filter(Boolean).join(" ")})`
          : "") +
        `. Open ${engineHref(duplicate)}.`,
    );
  }

  const repos = createAdminMotorImportRepositories(ctx.uid, ctx.companyId);
  await syncMotorCatalogUseCase(
    repos.catalogRepository as Parameters<typeof syncMotorCatalogUseCase>[0],
    {
      companyId: ctx.companyId,
      brandName,
      engineCode,
      existingBrands: catalog.existingBrands,
      existingEngines: catalog.existingEngines,
    },
  );

  const id = await repos.motorRepository.create(
    ctx.uid,
    {
      companyId: ctx.companyId,
      serialCode,
      brandName,
      engineCode,
      notes,
      quantity: 1,
      status: "available",
    },
    catalog.existingMotors,
  );

  const engine = summarizeEngine({
    id,
    companyId: ctx.companyId,
    localId: Number(id) || undefined,
    serialCode,
    brandName,
    engineCode,
    configuration: "",
    notes,
    quantity: 1,
    transmission: "",
    status: "available",
    arrivalDate: null,
    soldDate: null,
    deletedAt: null,
    reservedForWorkOrderId: null,
    installedOnVehicleId: null,
  });

  return {
    ok: true as const,
    created: true as const,
    engine,
    href: engine.href,
  };
}

export async function sellEngine(
  ctx: CoreToolContext,
  input: {
    motorId: string;
    amount: number;
    account: "cashbox" | "kaspi";
    paymentMethod: "cash" | "transfer" | "mixed";
    comment?: string;
  },
) {
  if (!hasPermission(ctx.profile, "inventory_edit")) {
    return toolFailure("Your role cannot sell engines.");
  }
  if (input.amount > 0 && !hasPermission(ctx.profile, "accounting_edit")) {
    return toolFailure("Selling with an amount requires accounting edit access.");
  }

  const { items } = await listMotorDocumentsBounded(ctx.companyId, { limit: 400 });
  const found = items.find(
    ({ motor }) => motor.id === input.motorId.trim() || String(motor.localId) === input.motorId.trim(),
  );
  if (!found) {
    return toolFailure(`Engine "${input.motorId}" was not found.`);
  }
  const motor = found.motor;
  if (!isMotorAvailableForSale(motor)) {
    return toolFailure("Engine intake must be verified before this motor can be sold.");
  }

  await adminMarkMotorSold({
    uid: found.ownerUid || ctx.uid,
    motorId: motor.id,
    companyId: ctx.companyId,
    serialCode: motor.serialCode,
    brandName: motor.brandName,
    engineCode: motor.engineCode,
    configuration: motor.configuration,
    notes: motor.notes,
    quantity: motor.quantity,
    transmission: motor.transmission,
    engineId: motor.engineId,
    localId: motor.localId,
    arrivalDate: motor.arrivalDate,
    warrantyId: motor.warrantyId ?? undefined,
  });

  let operationId: string | null = null;
  if (input.amount > 0) {
    const relatedMotorID = motor.localId ?? Number(motor.id);
    operationId = await adminCreateFinancialOperation({
      companyId: ctx.companyId,
      type: "sale",
      amount: input.amount,
      account: input.account,
      paymentMethod: input.paymentMethod,
      relatedMotorID: Number.isFinite(relatedMotorID) ? relatedMotorID : null,
      relatedMotorId: motor.id,
      category: MOTOR_SALE_CATEGORY,
      description: [motor.brandName, motor.engineCode, motor.serialCode].filter(Boolean).join(" "),
      comment: input.comment?.trim() || "Продажа мотора",
      createdByUserId: ctx.uid,
    });
  }

  const sold = summarizeEngine({
    ...motor,
    status: "sold",
    soldDate: new Date(),
  });

  return {
    ok: true as const,
    engine: sold,
    operationId,
    href: sold.href,
  };
}

export async function createEngineIntakeJob(
  ctx: CoreToolContext,
  input: {
    serialCode: string;
    brandName?: string;
    engineCode?: string;
    source: "dismantle" | "purchase" | "transfer" | "ad_hoc";
  },
) {
  const canVerify = hasPermission(ctx.profile, "engine_intake_verify");
  const canExecute = hasPermission(ctx.profile, "engine_intake_execute");
  if (!canVerify && !canExecute) {
    return toolFailure("Your role cannot start engine intake.");
  }

  const result = await executeEngineIntakeCommand(
    {
      uid: ctx.uid,
      companyId: ctx.companyId,
      profile: ctx.profile,
      actorName: ctx.profile.displayName ?? null,
      actorRole: ctx.profile.role,
    },
    {
      type: "create_job",
      idempotencyKey: `core:intake:${input.serialCode.trim()}:${ctx.uid}`,
      client: "ai",
      payload: {
        source: input.source,
        expectedIdentity: {
          serialCode: input.serialCode.trim(),
          brandName: input.brandName?.trim() || undefined,
          engineCode: input.engineCode?.trim() || undefined,
        },
      },
    },
  );

  return {
    ok: true as const,
    jobId: result.jobId,
    engineId: result.engineId,
    href: `/motors?collection=engines`,
  };
}
