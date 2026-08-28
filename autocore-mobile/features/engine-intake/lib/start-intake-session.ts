import type { EngineIntakeCommand, EngineIntakeJob } from '@autocore/engine-intake';

import { engineIntakeId, getEngineIntakeDeviceId, getEngineIntakeDeviceName } from './device';
import type { OptimisticIntakeIdentity } from './optimistic-intake-job';
import {
  seedOptimisticIntakeClaim,
  seedOptimisticIntakeCreate,
} from '../store/intake-local-overlay';
import { drainIntakeOutbox, enqueueIntakeCommand } from '../store/intake-outbox';

function createJobCommand(
  jobId: string,
  uid: string,
  displayName: string | null,
  identity: OptimisticIntakeIdentity,
): EngineIntakeCommand {
  return {
    type: 'create_job',
    idempotencyKey: engineIntakeId('create'),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: getEngineIntakeDeviceId(),
    payload: {
      jobId,
      source: 'ad_hoc',
      priority: 'normal',
      expectedIdentity: {
        serialCode: identity.serialCode,
        brandName: identity.brandName,
        engineCode: identity.engineCode,
      },
      assigneeUid: uid,
      assigneeName: displayName,
    },
  };
}

function claimJobCommand(jobId: string, sessionId: string): EngineIntakeCommand {
  return {
    type: 'claim_job',
    idempotencyKey: engineIntakeId('claim'),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: getEngineIntakeDeviceId(),
    payload: {
      jobId,
      sessionId,
      deviceName: getEngineIntakeDeviceName(),
    },
  };
}

/**
 * Seed the bay + camera, queue create then claim, and return immediately.
 * The drain sends them in order; the UI must not wait on either round-trip.
 */
export function queueOptimisticIntakeCreate(input: {
  companyId: string;
  uid: string;
  displayName: string | null;
  identity: OptimisticIntakeIdentity;
}): { jobId: string; sessionId: string } {
  const jobId = engineIntakeId('job');
  const sessionId = engineIntakeId('session');
  const deviceId = getEngineIntakeDeviceId();
  seedOptimisticIntakeCreate({
    companyId: input.companyId,
    jobId,
    sessionId,
    uid: input.uid,
    displayName: input.displayName,
    deviceId,
    deviceName: getEngineIntakeDeviceName(),
    identity: input.identity,
  });
  enqueueIntakeCommand(
    input.companyId,
    createJobCommand(jobId, input.uid, input.displayName, input.identity),
  );
  enqueueIntakeCommand(input.companyId, claimJobCommand(jobId, sessionId));
  void drainIntakeOutbox(input.companyId);
  return { jobId, sessionId };
}

/**
 * Seed the camera, queue claim_job, and return immediately.
 *
 * Continue used to live-send the claim and only enqueue after that POST died.
 * On a hung radio the claim was missing from the outbox while photos already
 * sat on disk, so the server answered "Resume the session before taking photos".
 */
export function queueOptimisticIntakeClaim(input: {
  companyId: string;
  job: EngineIntakeJob;
  uid: string;
  displayName: string | null;
  deviceId: string;
}): { sessionId: string } {
  const sessionId = engineIntakeId('session');
  seedOptimisticIntakeClaim({
    companyId: input.companyId,
    job: input.job,
    sessionId,
    uid: input.uid,
    displayName: input.displayName,
    deviceId: input.deviceId,
    deviceName: getEngineIntakeDeviceName(),
  });
  enqueueIntakeCommand(input.companyId, claimJobCommand(input.job.id, sessionId));
  void drainIntakeOutbox(input.companyId);
  return { sessionId };
}
