/**
 * Quick actions start work (IA §9).
 *
 * The section used to be a strip of links. Every entry carried an `href` and
 * Home pushed it, so "Photograph engine" meant *open the engines list filtered
 * to incoming* and "Import document" meant *open the import screen* — two taps
 * short of doing anything, and indistinguishable from the Work tab.
 *
 * What is built here instead is a small set of **commands**. Two of them come
 * from live state rather than from a catalog, and they are the reason the
 * section exists at all:
 *
 *   - *Continue* reopens the capture session this phone already holds. It is
 *     offered only when the claim is genuinely local, so the tap goes straight
 *     to the camera with no round-trip and cannot take a bay from a colleague.
 *   - *Retry photos* pushes the pictures stuck on this phone. It runs where the
 *     reader is standing; nothing navigates.
 *
 * The rest are creation and capture commands read off the shell catalog —
 * `resolveActionItems` has already applied modules and permissions, so Home
 * never keeps a second list of what a person may do. What Home adds is
 * judgement about which of them belong on a summary screen, and the fact that
 * work already underway is always offered before work not yet begun.
 */
import type { ActionItem } from '@/lib/shell/types';

import type {
  HomeQuickAction,
  HomeQuickActionCommand,
  HomeQuickActionId,
} from '../types';
import type { HomeIntakeFacts } from './facts';

export const HOME_MAX_QUICK_ACTIONS = 4;

type CatalogCommand = {
  id: HomeQuickActionId;
  title: string;
  hint: string;
  command: HomeQuickActionCommand;
};

/**
 * Shell catalog id → what Home actually runs.
 *
 * Two catalog entries have no mapping on purpose:
 *   - `search` is not an action; the reader reaches it from the header.
 *   - `photograph` pointed at a filtered list. Continuation is answered from
 *     live state below, by an entry that knows *which* engine.
 */
const CATALOG_COMMANDS: Record<string, CatalogCommand> = {
  scan: {
    id: 'scan',
    title: 'Scan',
    hint: 'Opens the camera to read a barcode, VIN, or serial',
    command: { kind: 'capture', surface: 'scan' },
  },
  'receive-engine': {
    id: 'engine.receive',
    title: 'Receive engine',
    hint: 'Starts an intake from a serial',
    command: { kind: 'compose', entity: 'engine' },
  },
  'new-order': {
    id: 'order.new',
    title: 'New order',
    hint: 'Opens the work order composer',
    command: { kind: 'compose', entity: 'order' },
  },
  'add-item': {
    id: 'part.new',
    title: 'Add part',
    hint: 'Opens the warehouse item composer',
    command: { kind: 'compose', entity: 'part' },
  },
  'new-transaction': {
    id: 'transaction.new',
    title: 'New transaction',
    hint: 'Opens the ledger composer',
    command: { kind: 'compose', entity: 'transaction' },
  },
  'import-document': {
    id: 'document.capture',
    title: 'Shoot document',
    hint: 'Opens the camera to photograph a document',
    command: { kind: 'capture', surface: 'document' },
  },
};

/**
 * Continuation is gated on the same catalog as creation.
 *
 * A reader who may not run an intake never sees Continue or Retry, and the
 * check is the shell's answer rather than a second permission test written
 * here — one authority for what a person may do.
 */
const INTAKE_EXECUTE_ACTION_IDS = ['receive-engine', 'photograph'];

export type HomeQuickActionInput = {
  /** Already filtered by module + permission by the shell. */
  actions: ActionItem[];
  /** null when the reader cannot see intake, or it has not loaded. */
  intake: HomeIntakeFacts | null;
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Work already begun, and work this phone is holding up. Both outrank a create. */
function continuationActions(input: HomeQuickActionInput): HomeQuickAction[] {
  const intake = input.intake;
  if (!intake) return [];
  if (!input.actions.some((action) => INTAKE_EXECUTE_ACTION_IDS.includes(action.id))) return [];

  const result: HomeQuickAction[] = [];

  /**
   * A stuck upload is a fault, and the only person who can clear it is the one
   * holding the phone the files are on. It leads.
   */
  if (intake.stuckPhotoCount > 0) {
    result.push({
      id: 'intake.retry-photos',
      title: 'Retry photos',
      detail: String(intake.stuckPhotoCount),
      hint: `Sends ${intake.stuckPhotoCount} ${plural(
        intake.stuckPhotoCount,
        'photo',
        'photos',
      )} still waiting on this phone`,
      command: { kind: 'retry-intake-photos' },
      tone: 'blocked',
    });
  }

  if (intake.resumable) {
    result.push({
      id: 'intake.resume',
      title: 'Continue',
      detail: intake.resumable.label || null,
      hint: 'Reopens the camera on the engine you are already capturing',
      command: {
        kind: 'resume-intake',
        jobId: intake.resumable.jobId,
        sessionId: intake.resumable.sessionId,
      },
      tone: 'continue',
    });
  }

  return result;
}

export function buildHomeQuickActions(
  input: HomeQuickActionInput,
  max = HOME_MAX_QUICK_ACTIONS,
): HomeQuickAction[] {
  const result = continuationActions(input).slice(0, max);

  for (const action of input.actions) {
    if (result.length >= max) break;
    const entry = CATALOG_COMMANDS[action.id];
    if (!entry) continue;
    if (result.some((existing) => existing.id === entry.id)) continue;

    result.push({
      id: entry.id,
      title: entry.title,
      detail: null,
      hint: entry.hint,
      command: entry.command,
      tone: 'default',
    });
  }

  return result;
}
