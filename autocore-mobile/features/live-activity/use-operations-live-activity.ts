import { useEffect } from 'react';

import { reconcileIntakeAttentionNotification } from '@/features/engine-intake/lib/intake-sync-notifications';
import {
  drainIntakeOutbox,
  getIntakeOutboxSnapshot,
  photoNeedsPersonRow,
  requeueTransientTransportFailures,
  useEngineIntakeOutbox,
} from '@/features/engine-intake/store/intake-outbox';
import { useSession } from '@/hooks/use-session';

/**
 * Attention notification for photos that need a person.
 *
 * The Dynamic Island is driven by `IntakeSyncHead` via
 * `pushOperationsLiveActivity`. This host unmounts on the camera route, which
 * is exactly when photos start leaving — so the Island cannot live here.
 */
export function useOperationsLiveActivity() {
  const { companyId, can } = useSession();
  const intakeEnabled = Boolean(companyId) && can('engine_intake_view');
  const outbox = useEngineIntakeOutbox(intakeEnabled ? companyId : null);

  useEffect(() => {
    if (!intakeEnabled || !companyId) {
      reconcileIntakeAttentionNotification(0);
      return;
    }
    const revived = requeueTransientTransportFailures();
    const photos = getIntakeOutboxSnapshot().photos.filter(
      (photo) => photo.companyId === companyId,
    );
    reconcileIntakeAttentionNotification(photos.filter(photoNeedsPersonRow).length);
    if (revived) void drainIntakeOutbox(companyId);
  }, [companyId, intakeEnabled, outbox.failedCount]);
}
