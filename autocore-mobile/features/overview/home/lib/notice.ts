/**
 * The one line Home says about the state of its own data.
 *
 * There are only ever two things worth saying, and only one at a time:
 *
 *   - the device is offline, so nothing on screen can be current;
 *   - the screen is showing the brief saved from an earlier session while the
 *     live one loads.
 *
 * Offline wins, because it explains the staleness *and* tells the reader that
 * pulling to refresh will not help. When the data is live, this says nothing —
 * a permanent status line is a status line nobody reads.
 */
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

import type { HomeViewModel } from '../types';

export function resolveHomeNotice(model: HomeViewModel): string | null {
  if (model.meta.offline) return model.context.offlineBanner;
  if (!model.meta.fromCache) return null;

  const savedAt = model.meta.lastSyncedAt;
  if (savedAt === null) return 'Showing the last synced data';

  const age = formatDistanceToNow(new Date(savedAt), { addSuffix: true, locale: enUS });
  return `Last synced ${age}`;
}
