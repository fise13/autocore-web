import type { EngineIntakeCommand, EngineIntakeJob } from '@autocore/engine-intake';

import { engineIntakeId, getEngineIntakeDeviceId } from './device';
import {
  markIntakeJobCancelled,
  restoreIntakeJobCancelled,
} from '../store/intake-local-overlay';
import {
  discardIntakeWorkForCancelledJob,
  drainIntakeOutbox,
  sendOrQueueIntakeCommand,
} from '../store/intake-outbox';
import { isBenignCancelError } from './sync-errors';

export async function cancelIntakeJob(companyId: string, job: EngineIntakeJob): Promise<void> {
  markIntakeJobCancelled(companyId, job.id);
  discardIntakeWorkForCancelledJob(companyId, job.id);
  const command: EngineIntakeCommand = {
    type: 'cancel_job',
    idempotencyKey: engineIntakeId('cancel'),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: getEngineIntakeDeviceId(),
    payload: {
      jobId: job.id,
      reason: 'Cancelled from Engine intake',
    },
  };
  try {
    await sendOrQueueIntakeCommand(companyId, command);
    void drainIntakeOutbox(companyId);
  } catch (error) {
    if (isBenignCancelError(error)) {
      void drainIntakeOutbox(companyId);
      return;
    }
    restoreIntakeJobCancelled(companyId, job.id);
    throw error;
  }
}
