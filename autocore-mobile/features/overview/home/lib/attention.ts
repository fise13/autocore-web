/**
 * Needs attention — actionable problems, not vanity counters (IA §8).
 *
 * An item earns a row only when all four appearance rules hold: the reader may
 * see the underlying entities, the count is at least one, the severity clears
 * the floor, and the problem is still unresolved in this snapshot. Everything
 * else is silence, which is why an empty Attention section disappears instead of
 * announcing that nothing is wrong.
 *
 * Severity is read off product state, never guessed:
 *   - blocking   — intake quarantine: the engine cannot move until a person rules
 *   - warning    — work or money is waiting on a human
 *   - informational — useful, not urgent
 */
import type { HomeAttentionItem, HomeAttentionSeverity } from '../types';
import type { HomeFacts } from './facts';
import { homeAttentionDestination } from './destinations';
import { round3 } from './metrics';

const SEVERITY_RANK: Record<HomeAttentionSeverity, number> = {
  blocking: 0,
  warning: 1,
  informational: 2,
};

function plural(count: number, singular: string, many = `${singular}s`): string {
  return count === 1 ? singular : many;
}

function clampUrgency(value: number): number {
  return round3(Math.min(1, Math.max(0, value)));
}

/**
 * Build the attention queue for this snapshot.
 *
 * Ordering is blocking → warning → informational, then urgency descending, then
 * `id` — a total order, so the list cannot reshuffle between two renders of the
 * same data.
 */
export function buildHomeAttention(facts: HomeFacts): HomeAttentionItem[] {
  const items: HomeAttentionItem[] = [];
  const { intake, orders, parts, engines, earnings } = facts;

  if (intake && intake.quarantineCount > 0) {
    const count = intake.quarantineCount;
    items.push({
      id: 'intake.quarantine',
      severity: 'blocking',
      title: `${count} ${plural(count, 'engine')} in quarantine`,
      explanation: 'Intake is halted until the identity mismatch is resolved.',
      count,
      action: 'Resolve',
      urgency: 1,
      destination: homeAttentionDestination('intake.quarantine'),
      dismissible: false,
    });
  }

  if (intake && intake.reworkCount > 0) {
    const count = intake.reworkCount;
    items.push({
      id: 'intake.rework',
      severity: 'warning',
      title: `${count} ${plural(count, 'intake')} sent back for rework`,
      explanation: 'Verification asked for new photos before these engines can be listed.',
      count,
      action: 'Photograph',
      urgency: clampUrgency(0.6 + count / 20),
      destination: homeAttentionDestination('intake.rework'),
      dismissible: false,
    });
  }

  if (orders && orders.waitingPartsCount > 0) {
    const count = orders.waitingPartsCount;
    items.push({
      id: 'orders.waiting_parts',
      severity: 'warning',
      title: `${count} ${plural(count, 'order')} waiting on parts`,
      explanation: 'These jobs cannot progress until the parts they need arrive.',
      count,
      action: 'Open orders',
      urgency: clampUrgency(0.6 + count / 15),
      destination: homeAttentionDestination('orders.waiting_parts'),
      dismissible: false,
    });
  }

  if (parts && parts.lowStockCount > 0) {
    const count = parts.lowStockCount;
    items.push({
      id: 'parts.low_stock',
      severity: 'warning',
      title: `${count} ${plural(count, 'part')} below reorder level`,
      explanation: 'Restock before a job stalls waiting on the shelf.',
      count,
      action: 'Review stock',
      urgency: clampUrgency(0.55 + count / 20),
      destination: homeAttentionDestination('parts.low_stock'),
      dismissible: false,
    });
  }

  if (earnings && earnings.claimableCount > 0) {
    const count = earnings.claimableCount;
    items.push({
      id: 'earnings.claimable',
      severity: 'warning',
      title: `${count} ${plural(count, 'job')} ready to claim`,
      explanation: 'Completed work is waiting to be claimed for payout.',
      count,
      action: 'Claim',
      urgency: clampUrgency(0.55 + count / 20),
      destination: homeAttentionDestination('earnings.claimable'),
      dismissible: false,
    });
  }

  if (earnings && earnings.pendingPayoutCount > 0) {
    const count = earnings.pendingPayoutCount;
    items.push({
      id: 'payroll.pending',
      severity: 'warning',
      title: `${count} ${plural(count, 'payout')} pending`,
      explanation: 'Your earnings are recorded but not yet paid out.',
      count,
      action: 'View earnings',
      urgency: clampUrgency(0.5 + count / 20),
      destination: homeAttentionDestination('payroll.pending'),
      dismissible: false,
    });
  }

  if (engines && engines.agingCount > 0) {
    const count = engines.agingCount;
    items.push({
      id: 'engines.aging',
      severity: 'warning',
      title: `${count} ${plural(count, 'engine')} idle 90+ days`,
      explanation: 'Nothing has moved on these units — review pricing or listings.',
      count,
      action: 'Review engines',
      urgency: clampUrgency(0.45 + count / 25),
      destination: homeAttentionDestination('engines.aging'),
      dismissible: true,
    });
  }

  if (intake && intake.awaitingVerificationCount > 0) {
    const count = intake.awaitingVerificationCount;
    items.push({
      id: 'intake.awaiting_verification',
      severity: 'informational',
      title: `${count} ${plural(count, 'intake')} awaiting verification`,
      explanation: 'Photography is done; these engines need a verifier to sign off.',
      count,
      action: 'Verify',
      urgency: clampUrgency(0.3 + count / 30),
      destination: homeAttentionDestination('intake.awaiting_verification'),
      dismissible: true,
    });
  }

  return items.sort((left, right) => {
    const bySeverity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (bySeverity !== 0) return bySeverity;
    if (right.urgency !== left.urgency) return right.urgency - left.urgency;
    return left.id.localeCompare(right.id);
  });
}

/**
 * Whether the queue should break the reading order and sit above Summary.
 *
 * Only a blocking condition earns that. Warnings are real but they are not
 * emergencies, and a screen that opens with a warning banner every day teaches
 * the reader to scroll past the one day it matters.
 */
export function attentionInterrupts(items: HomeAttentionItem[]): boolean {
  return items.some((item) => item.severity === 'blocking');
}
