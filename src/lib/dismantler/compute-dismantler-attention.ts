import type { DonorPnl } from "@/lib/dismantler/compute-donor-pnl";
import type { UsedPart } from "@/domain/used-part";

export type DismantlerAttentionItem = {
  id: string;
  count: number;
  text: string;
  href: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeDismantlerAttention(input: {
  now?: Date;
  pnls: Array<DonorPnl & { purchasedAt?: Date; createdAt: Date }>;
  parts: UsedPart[];
  staleDonorText: (count: number) => string;
  slowPartText: (count: number) => string;
}): DismantlerAttentionItem[] {
  const now = input.now ?? new Date();
  const staleDonors = input.pnls.filter((pnl) => {
    if (pnl.grossSoFar >= 0) return false;
    const start = pnl.purchasedAt ?? pnl.createdAt;
    return now.getTime() - start.getTime() >= 30 * DAY_MS;
  });
  const slowParts = input.parts.filter((part) => {
    if (part.status !== "available") return false;
    return now.getTime() - part.createdAt.getTime() >= 45 * DAY_MS;
  });

  const items: DismantlerAttentionItem[] = [];
  if (staleDonors.length > 0) {
    items.push({
      id: "stale-donors",
      count: staleDonors.length,
      text: input.staleDonorText(staleDonors.length),
      href: "/donors",
    });
  }
  if (slowParts.length > 0) {
    items.push({
      id: "slow-parts",
      count: slowParts.length,
      text: input.slowPartText(slowParts.length),
      href: "/used-parts",
    });
  }
  return items;
}
