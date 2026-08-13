import { Platform } from 'react-native';

import {
  drainAllIntakeOutboxes,
  hasPendingIntakeWork,
} from '@/features/engine-intake/store/intake-outbox';
import { drainMutationOutboxNow } from '@/lib/offline/drain-mutation-outbox';
import { getMutationOutboxSnapshot } from '@/lib/offline/mutation-outbox';

export const BACKGROUND_SYNC_TASK = 'autocore-background-sync';

/** iOS minimum for BGProcessingTask / Android WorkManager. */
const MINIMUM_INTERVAL_MINUTES = 15;

type TaskManagerApi = typeof import('expo-task-manager');
type BackgroundTaskApi = typeof import('expo-background-task');

function loadTaskManager(): TaskManagerApi | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-task-manager') as TaskManagerApi;
  } catch {
    return null;
  }
}

function loadBackgroundTask(): BackgroundTaskApi | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-background-task') as BackgroundTaskApi;
  } catch {
    return null;
  }
}

const TaskManager = loadTaskManager();
const BackgroundTask = loadBackgroundTask();

/**
 * Must be defined in the JS global scope (imported from root layout) so iOS
 * can launch this task after suspend, kill, or reboot. Skipped when the native
 * module is not in this binary yet (needs a Release rebuild after adding the pod).
 */
if (TaskManager && BackgroundTask) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      await drainMutationOutboxNow();
      await drainAllIntakeOutboxes();
      await syncBackgroundTaskRegistration();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

function hasQueuedWork(): boolean {
  return getMutationOutboxSnapshot().pendingCount > 0 || hasPendingIntakeWork();
}

/**
 * Keep a BGProcessingTask armed while the outbox has work. iOS/Android decide
 * when it actually runs (power, network, usage). Unregister when the queue is
 * empty. Nothing runs while the phone is powered off — after boot the system
 * may relaunch this task; opening the app always drains immediately.
 */
export async function syncBackgroundTaskRegistration(): Promise<void> {
  if (!TaskManager || !BackgroundTask) return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;

    const hasWork = hasQueuedWork();
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (hasWork) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: MINIMUM_INTERVAL_MINUTES,
      });
      return;
    }
    if (registered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } catch {
    // Scheduling is best-effort — foreground drain still owns the queue.
  }
}
