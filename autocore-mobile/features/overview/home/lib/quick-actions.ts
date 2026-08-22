/**
 * Quick actions start work (IA §9).
 *
 * The catalog is the shell's — `resolveActionItems` has already applied modules
 * and permissions — so Home never maintains a second list of what a person may
 * create. What Home adds is judgement about which of them belong on a summary
 * screen:
 *
 *   - `search` is not an action; it lives in the header.
 *   - `photograph` only makes sense while an intake is actually open.
 *   - the dock (+) remains the global New sheet. Home shows shortcuts into
 *     specific flows rather than a second button that opens the same sheet.
 */
import type { ActionItem } from '@/lib/shell/types';

import type { HomeQuickAction } from '../types';

export const HOME_MAX_QUICK_ACTIONS = 4;

/** Not a create action — the reader reaches search from the header, not from here. */
const EXCLUDED_ACTION_IDS = new Set(['search']);

/** Actions that only make sense when there is work of that kind already open. */
const CONTINUATION_ACTION_IDS = new Set(['photograph']);

export type HomeQuickActionInput = {
  actions: ActionItem[];
  hasOpenIntake: boolean;
};

export function buildHomeQuickActions(
  input: HomeQuickActionInput,
  max = HOME_MAX_QUICK_ACTIONS,
): HomeQuickAction[] {
  const result: HomeQuickAction[] = [];

  for (const action of input.actions) {
    if (result.length >= max) break;
    if (!action.href) continue;
    if (EXCLUDED_ACTION_IDS.has(action.id)) continue;
    if (CONTINUATION_ACTION_IDS.has(action.id) && !input.hasOpenIntake) continue;

    result.push({
      id: action.id,
      title: action.title,
      subtitle: action.subtitle,
      href: action.href,
    });
  }

  return result;
}
