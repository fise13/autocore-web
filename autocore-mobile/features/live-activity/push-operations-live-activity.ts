/**
 * Push the intake Live Activity from the outbox itself — not from a React
 * tree that unmounts on the camera route.
 *
 * iOS will not *start* an Activity from the background. Request it the
 * moment a photo is queued (still foreground). After leave, only `update` /
 * `end` work, and they only run while JS is alive — so this module is called
 * from `IntakeSyncHead` on every outbox publish, every byte tick, and from
 * the leave-app runtime on AppState.
 *
 * Apply always re-reads the stores. A queued snapshot from an earlier tick
 * must not pin the Island on `0/2` after the wave has moved.
 */
import { AppState, Platform } from 'react-native';

import { companyPhotoSyncQueue } from '@/features/engine-intake/lib/job-photo-sync-progress';
import { getCompanyIntakeOutboxSnapshot } from '@/features/engine-intake/store/intake-outbox';
import { getIntakeUploadProgress } from '@/features/engine-intake/store/intake-upload-progress';
import { beginBackgroundExecution } from '@/lib/offline/background-execution';

import { ensureLiveActivityAppIconUri } from './ensure-live-activity-icon';
import {
  liveActivityContentKey,
  resolveDesiredLiveActivity,
  shouldCelebrateSyncSuccess,
  succeededLiveActivityProps,
  type DesiredLiveActivity,
  type LiveActivityProps,
} from './lib/live-activity-model';
import { WIDGET_URL } from './lib/widget-links';
import { OperationsLiveActivity } from './operations-live-activity';

const LIVE_ACTIVITY_PRESENTATION_ENABLED = true;
/** Island keeps the Watch-style check this long, then ActivityKit dismisses. */
const SUCCESS_HOLD_MS = 4_000;

let cachedIconUri = '';
let scopedCompanyId: string | null = null;
let lastAppliedKey = '';
let failedStartKey = '';
let applyRunning = false;
let applyQueued = false;
let lastActiveProps: LiveActivityProps | null = null;
let presentingSuccess = false;
let successTimer: ReturnType<typeof setTimeout> | null = null;

export function setIntakeLiveActivityScope(companyId: string | null): void {
  scopedCompanyId = companyId;
  if (companyId) {
    void ensureLiveActivityAppIconUri().then((uri) => {
      if (uri) cachedIconUri = uri;
    });
  }
}

function listInstances() {
  try {
    return OperationsLiveActivity.getInstances();
  } catch {
    return [];
  }
}

async function endAllInstances(): Promise<void> {
  const active = listInstances();
  await Promise.all(active.map((instance) => instance.end('immediate').catch(() => undefined)));
}

function clearSuccessHold(): void {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
}

function armSuccessDismiss(): void {
  clearSuccessHold();
  // Leave-app JS would otherwise suspend before the check has been on screen.
  beginBackgroundExecution('intake-sync');
  successTimer = setTimeout(() => {
    successTimer = null;
    presentingSuccess = false;
    lastActiveProps = null;
    lastAppliedKey = 'idle';
    void endAllInstances();
  }, SUCCESS_HOLD_MS);
}

async function applyDesired(desired: DesiredLiveActivity): Promise<void> {
  const key = liveActivityContentKey(desired);
  const instances = listInstances();

  if (desired.kind === 'idle' || !LIVE_ACTIVITY_PRESENTATION_ENABLED) {
    failedStartKey = '';
    if (presentingSuccess) return;

    if (
      LIVE_ACTIVITY_PRESENTATION_ENABLED &&
      instances.length > 0 &&
      shouldCelebrateSyncSuccess(lastActiveProps) &&
      lastActiveProps
    ) {
      const success = succeededLiveActivityProps(lastActiveProps, cachedIconUri);
      presentingSuccess = true;
      const [primary, ...extras] = instances;
      await Promise.all(extras.map((instance) => instance.end('immediate').catch(() => undefined)));
      try {
        await primary.update(success);
        lastAppliedKey = liveActivityContentKey({ kind: 'active', props: success });
        lastActiveProps = success;
        armSuccessDismiss();
        return;
      } catch {
        presentingSuccess = false;
        lastActiveProps = null;
        await primary.end('immediate').catch(() => undefined);
        lastAppliedKey = 'idle';
        return;
      }
    }

    if (lastAppliedKey === 'idle' && instances.length === 0) return;
    lastAppliedKey = 'idle';
    lastActiveProps = null;
    await endAllInstances();
    return;
  }

  clearSuccessHold();
  presentingSuccess = false;
  lastActiveProps = desired.props;

  if (key === lastAppliedKey && instances.length > 0) return;
  if (key === failedStartKey && instances.length === 0) return;

  const props: LiveActivityProps = { ...desired.props, iconUri: cachedIconUri };

  if (instances.length > 0) {
    const [primary, ...extras] = instances;
    await Promise.all(extras.map((instance) => instance.end('immediate').catch(() => undefined)));
    try {
      await primary.update(props);
      lastAppliedKey = key;
      failedStartKey = '';
      return;
    } catch {
      await primary.end('immediate').catch(() => undefined);
    }
  }

  // Starting from background is rejected by ActivityKit. Do not record the
  // key on failure — a later force push (foreground) must retry. Inactive is
  // still foreground (camera / Control Center) and may start after the menu
  // window is gone.
  if (AppState.currentState === 'background') {
    failedStartKey = key;
    lastAppliedKey = '';
    return;
  }

  try {
    OperationsLiveActivity.start(props, WIDGET_URL.intake);
    lastAppliedKey = key;
    failedStartKey = '';
  } catch {
    failedStartKey = key;
    lastAppliedKey = '';
  }
}

async function flushDesired(): Promise<void> {
  if (applyRunning) return;
  applyRunning = true;
  try {
    while (applyQueued) {
      applyQueued = false;
      await applyDesired(desiredIntakeLiveActivity());
    }
  } finally {
    applyRunning = false;
    if (applyQueued) void flushDesired();
  }
}

export function desiredIntakeLiveActivity(): DesiredLiveActivity {
  if (Platform.OS !== 'ios' || !scopedCompanyId) {
    return { kind: 'idle' };
  }
  const outbox = getCompanyIntakeOutboxSnapshot(scopedCompanyId);
  const queue = companyPhotoSyncQueue({
    photos: outbox.photos,
    syncedCount: outbox.syncedCount,
    sessionTotal: outbox.sessionTotal,
    photoPendingCount: outbox.photoPendingCount,
    photoFailedCount: outbox.photoFailedCount,
    byteProgress: getIntakeUploadProgress(),
  });
  return resolveDesiredLiveActivity({ enabled: true, queue });
}

/** Read stores and push. Defer while the camera / menu is presenting. */
export function pushOperationsLiveActivity(options?: { force?: boolean }): void {
  if (Platform.OS !== 'ios') return;
  if (options?.force) {
    lastAppliedKey = '';
    failedStartKey = '';
  }
  applyQueued = true;
  if (AppState.currentState === 'background' || options?.force) {
    void flushDesired();
    return;
  }
  setTimeout(() => {
    void flushDesired();
  }, 32);
}

export function resetOperationsLiveActivityPush(): void {
  clearSuccessHold();
  presentingSuccess = false;
  lastActiveProps = null;
  lastAppliedKey = '';
  failedStartKey = '';
  applyQueued = true;
  scopedCompanyId = null;
  void flushDesired();
}
