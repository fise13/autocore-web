/**
 * Work model — turns the resolved workspace catalog into rows that state what
 * is actually happening, not what a module is called.
 *
 * The rule: a row shows live state when live state exists, an onboarding
 * prompt when the module has never been used, a quiet empty line when the
 * queue is genuinely clear, and only falls back to the catalog description
 * when no data has arrived yet.
 *
 * Pure — no React, no Firestore. Everything here is unit tested.
 */
import type { WorkNode, WorkspaceDomainId } from '@/lib/shell/types';
import type { InventoryItem } from '@/types/inventory';

/** System leaf every warehouse keeps for stock with no assigned place. */
export const UNLOCATED_LOCATION_CODE = 'UNLOCATED';

/**
 * Stock that physically arrived but has no shelf yet — the Receiving queue.
 * Sitting in the `UNLOCATED` system leaf counts as unplaced: the item has a
 * location row, but nobody has told the warehouse where it actually is.
 */
export function isAwaitingPlacement(item: Pick<InventoryItem, 'primaryLocationCode' | 'primaryLocationId'>): boolean {
  const code = item.primaryLocationCode?.trim().toUpperCase();
  if (code === UNLOCATED_LOCATION_CODE) return true;
  return !code && !item.primaryLocationId?.trim();
}

/** Where a row subtitle came from. Drives tone, and keeps the tests honest. */
export type WorkDetailKind =
  /** Live company data. */
  | 'live'
  /** Module is in use, but the queue is clear right now. */
  | 'clear'
  /** Module has never been used — the row becomes an onboarding point. */
  | 'onboarding'
  /** No data yet (listener still bootstrapping, or scope denied). */
  | 'fallback';

export type WorkIntakeCounts = {
  /** Jobs waiting to be picked up. */
  awaiting: number;
  /** Jobs claimed and being photographed right now. */
  inProgress: number;
  /** Field work finished, waiting on a verifier. */
  awaitingVerification: number;
  /** Every job in the bay, whatever its state. */
  total: number;
};

export type WorkEngineCounts = { total: number };
export type WorkPartsCounts = { total: number; lowStock: number };
export type WorkReceivingCounts = { awaitingPlacement: number; total: number };
export type WorkLocationsCounts = { locations: number; bins: number };
export type WorkOrdersCounts = { open: number; attention: number; total: number };

/**
 * Live counts per Work node. `null` means "not known yet" — never "zero".
 * Conflating the two is what makes a dashboard lie, so callers must pass
 * `null` until a listener has delivered its first snapshot.
 */
export type WorkCounts = {
  intake: WorkIntakeCounts | null;
  engines: WorkEngineCounts | null;
  parts: WorkPartsCounts | null;
  receiving: WorkReceivingCounts | null;
  locations: WorkLocationsCounts | null;
  orders: WorkOrdersCounts | null;
};

export const EMPTY_WORK_COUNTS: WorkCounts = {
  intake: null,
  engines: null,
  parts: null,
  receiving: null,
  locations: null,
  orders: null,
};

export type WorkRow = {
  id: string;
  title: string;
  detail: string;
  detailKind: WorkDetailKind;
  href: string;
  /** Items on this row that need a person today. Feeds the Today block. */
  attention: number;
};

export type WorkSection = {
  id: WorkspaceDomainId;
  title: string;
  rows: WorkRow[];
};

export type WorkTodaySegment = {
  id: string;
  count: number;
  label: string;
  href: string;
};

export type WorkToday = {
  count: number;
  title: string;
  /** `2 orders · 1 engine intake` — null when nothing needs attention. */
  breakdown: string | null;
  /** Deep link to the largest contributor. */
  href: string | null;
};

export type WorkModel = {
  today: WorkToday;
  sections: WorkSection[];
  /** True while every row is still on its catalog fallback. */
  isBootstrapping: boolean;
};

/** Locale-independent thousands grouping — `1284` → `1,284`. */
export function groupThousands(value: number): string {
  const safe = Math.max(0, Math.trunc(value));
  return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

type ResolvedDetail = Pick<WorkRow, 'detail' | 'detailKind' | 'attention'>;

function fallback(node: WorkNode): ResolvedDetail {
  return { detail: node.subtitle ?? '', detailKind: 'fallback', attention: 0 };
}

function resolveIntake(node: WorkNode, counts: WorkIntakeCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.awaiting > 0) {
    return {
      detail: `${groupThousands(counts.awaiting)} awaiting inspection`,
      detailKind: 'live',
      attention: counts.awaiting,
    };
  }
  if (counts.inProgress > 0) {
    return {
      detail: `${groupThousands(counts.inProgress)} in progress`,
      detailKind: 'live',
      attention: 0,
    };
  }
  if (counts.awaitingVerification > 0) {
    return {
      detail: `${groupThousands(counts.awaitingVerification)} awaiting verification`,
      detailKind: 'live',
      attention: 0,
    };
  }
  if (counts.total === 0) {
    return { detail: 'Receive your first engine', detailKind: 'onboarding', attention: 0 };
  }
  return { detail: 'No engines waiting', detailKind: 'clear', attention: 0 };
}

function resolveEngines(node: WorkNode, counts: WorkEngineCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.total === 0) {
    return { detail: 'Add your first engine', detailKind: 'onboarding', attention: 0 };
  }
  return {
    detail: `${groupThousands(counts.total)} serialized ${plural(counts.total, 'motor', 'motors')}`,
    detailKind: 'live',
    attention: 0,
  };
}

function resolveParts(node: WorkNode, counts: WorkPartsCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.total === 0) {
    return { detail: 'Add your first part', detailKind: 'onboarding', attention: 0 };
  }
  const base = `${groupThousands(counts.total)} inventory ${plural(counts.total, 'item', 'items')}`;
  if (counts.lowStock > 0) {
    return {
      detail: `${base} · ${groupThousands(counts.lowStock)} running low`,
      detailKind: 'live',
      attention: counts.lowStock,
    };
  }
  return { detail: base, detailKind: 'live', attention: 0 };
}

function resolveReceiving(node: WorkNode, counts: WorkReceivingCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.awaitingPlacement > 0) {
    return {
      detail: `${groupThousands(counts.awaitingPlacement)} ${plural(
        counts.awaitingPlacement,
        'item',
        'items',
      )} awaiting placement`,
      detailKind: 'live',
      attention: counts.awaitingPlacement,
    };
  }
  if (counts.total === 0) {
    return { detail: 'Scan your first item in', detailKind: 'onboarding', attention: 0 };
  }
  return { detail: 'All stock is placed', detailKind: 'clear', attention: 0 };
}

function resolveLocations(node: WorkNode, counts: WorkLocationsCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.locations === 0 && counts.bins === 0) {
    return { detail: 'Create your first location', detailKind: 'onboarding', attention: 0 };
  }
  const locations = `${groupThousands(counts.locations)} ${plural(
    counts.locations,
    'location',
    'locations',
  )}`;
  if (counts.bins > 0) {
    return {
      detail: `${locations} · ${groupThousands(counts.bins)} ${plural(counts.bins, 'bin', 'bins')}`,
      detailKind: 'live',
      attention: 0,
    };
  }
  return { detail: locations, detailKind: 'live', attention: 0 };
}

function resolveOrders(node: WorkNode, counts: WorkOrdersCounts | null): ResolvedDetail {
  if (!counts) return fallback(node);
  if (counts.total === 0) {
    return { detail: 'Create your first work order', detailKind: 'onboarding', attention: 0 };
  }
  if (counts.open === 0) {
    return { detail: 'No open orders', detailKind: 'clear', attention: 0 };
  }
  const open = `${groupThousands(counts.open)} open`;
  if (counts.attention > 0) {
    return {
      detail: `${open} · ${groupThousands(counts.attention)} requiring attention`,
      detailKind: 'live',
      attention: counts.attention,
    };
  }
  return { detail: open, detailKind: 'live', attention: 0 };
}

export function resolveWorkRowDetail(node: WorkNode, counts: WorkCounts): ResolvedDetail {
  switch (node.id) {
    case 'intake':
      return resolveIntake(node, counts.intake);
    case 'engines':
      return resolveEngines(node, counts.engines);
    case 'parts':
      return resolveParts(node, counts.parts);
    case 'receiving':
      return resolveReceiving(node, counts.receiving);
    case 'locations':
      return resolveLocations(node, counts.locations);
    case 'orders':
      return resolveOrders(node, counts.orders);
    default:
      return fallback(node);
  }
}

/** Row id → how that row's attention count reads in the Today breakdown. */
const TODAY_LABELS: Record<string, (count: number) => string> = {
  orders: (n) => `${groupThousands(n)} ${plural(n, 'order', 'orders')}`,
  intake: (n) => `${groupThousands(n)} engine ${plural(n, 'intake', 'intakes')}`,
  receiving: (n) => `${groupThousands(n)} to place`,
  parts: (n) => `${groupThousands(n)} running low`,
};

/** Breakdown stays short — Work is a catalog, not a second Home. */
const TODAY_MAX_SEGMENTS = 3;

export function buildWorkToday(sections: WorkSection[]): WorkToday {
  const segments: WorkTodaySegment[] = [];

  for (const section of sections) {
    for (const row of section.rows) {
      const label = TODAY_LABELS[row.id];
      if (!label || row.attention <= 0) continue;
      segments.push({
        id: row.id,
        count: row.attention,
        label: label(row.attention),
        href: row.href,
      });
    }
  }

  if (segments.length === 0) {
    return {
      count: 0,
      title: 'Everything is up to date',
      breakdown: null,
      href: null,
    };
  }

  // Largest queue first; row order breaks ties so the block never flickers
  // between two equal counts.
  const ranked = segments
    .map((segment, index) => ({ segment, index }))
    .sort((a, b) => b.segment.count - a.segment.count || a.index - b.index)
    .map((entry) => entry.segment);

  const count = ranked.reduce((sum, segment) => sum + segment.count, 0);
  const shown = ranked.slice(0, TODAY_MAX_SEGMENTS);

  return {
    count,
    title: count === 1 ? 'Item needs attention' : 'Items need attention',
    breakdown: shown.map((segment) => segment.label).join(' · '),
    href: ranked[0]?.href ?? null,
  };
}

export function buildWorkModel(
  grouped: Array<{ domain: WorkspaceDomainId; title: string; nodes: WorkNode[] }>,
  counts: WorkCounts,
): WorkModel {
  const sections: WorkSection[] = grouped.map((group) => ({
    id: group.domain,
    title: group.title,
    rows: group.nodes.map((node) => {
      const resolved = resolveWorkRowDetail(node, counts);
      return {
        id: node.id,
        title: node.title,
        href: node.href,
        detail: resolved.detail,
        detailKind: resolved.detailKind,
        attention: resolved.attention,
      };
    }),
  }));

  const rows = sections.flatMap((section) => section.rows);

  return {
    today: buildWorkToday(sections),
    sections,
    isBootstrapping: rows.length > 0 && rows.every((row) => row.detailKind === 'fallback'),
  };
}
