/**
 * Present an intake job as a catalog motor so Incoming and Yard share one row.
 *
 * The job id stays on `intakeJobId` — camera / accept / cancel still talk to
 * the intake command API, not the motors repository.
 *
 * Pure — no React Native.
 */

import type { EngineIntakeJob, EngineIntakeJobState } from '@autocore/engine-intake';

import type { MotorEntity } from '../../../types/motor';

import { buildOptimisticIntakeJob } from '../../engine-intake/lib/optimistic-intake-job';
import { isIncomingJobState, isIncomingMotor, motorStatusFromIntakeJob } from './engine-lane';

function parseTime(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? undefined : next;
}

export function motorFromIntakeJob(job: EngineIntakeJob): MotorEntity {
  const createdAt = parseTime(job.createdAt);
  return {
    id: job.engineId || job.id,
    companyId: job.companyId,
    serialCode: job.expectedIdentity.serialCode,
    configuration: job.expectedIdentity.configuration || '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: createdAt ?? null,
    brandName: job.expectedIdentity.brandName || undefined,
    engineCode: job.expectedIdentity.engineCode || undefined,
    status: motorStatusFromIntakeJob(job.state),
    intakeJobId: job.id,
    intakeStatus: job.state,
    createdAt,
    updatedAt: parseTime(job.updatedAt),
  };
}

export function splitEngineCatalog(
  jobs: readonly EngineIntakeJob[],
  motors: readonly MotorEntity[],
): { incoming: MotorEntity[]; yard: MotorEntity[] } {
  const incomingJobs = jobs.filter((job) => isIncomingJobState(job.state));
  const jobIds = new Set(incomingJobs.map((job) => job.id));
  const engineIds = new Set(incomingJobs.map((job) => job.engineId).filter(Boolean));

  const catalogByJobId = new Map<string, MotorEntity>();
  for (const motor of motors) {
    if (motor.intakeJobId) catalogByJobId.set(motor.intakeJobId, motor);
  }

  const incoming = incomingJobs.map((job) => {
    const catalog = catalogByJobId.get(job.id);
    const stub = motorFromIntakeJob(job);
    if (!catalog) return stub;
    return {
      ...stub,
      photoUrls: catalog.photoUrls,
      warehouseLocation: catalog.warehouseLocation,
      primaryLocationId: catalog.primaryLocationId,
      primaryLocationCode: catalog.primaryLocationCode,
      quality: catalog.quality,
    };
  });

  for (const motor of motors) {
    if (!isIncomingMotor(motor)) continue;
    if (motor.intakeJobId && jobIds.has(motor.intakeJobId)) continue;
    if (engineIds.has(motor.id)) continue;
    incoming.push(motor);
  }

  const incomingEngineIds = new Set(incoming.map((motor) => motor.id));
  const yard = motors.filter(
    (motor) => !isIncomingMotor(motor) && !incomingEngineIds.has(motor.id),
  );

  return { incoming, yard };
}

function jobStateFromIncomingMotor(motor: MotorEntity): EngineIntakeJobState {
  if (motor.intakeStatus && isIncomingJobState(motor.intakeStatus)) {
    return motor.intakeStatus as EngineIntakeJobState;
  }
  if (motor.status === 'awaiting_verification') return 'awaiting_verification';
  if (motor.status === 'quarantine') return 'quarantine';
  return 'open';
}

/**
 * A local intake job when Firestore's jobs cache is empty (offline, first
 * load) but Incoming still has the catalog motor. Continue must not no-op.
 *
 * Unclaimed — `claimAndOpen` seeds the session from here.
 */
export function jobStubFromIncomingMotor(motor: MotorEntity): EngineIntakeJob | null {
  if (!isIncomingMotor(motor)) return null;
  const jobId = motor.intakeJobId?.trim() || motor.id;
  if (!jobId) return null;
  const now = (motor.updatedAt ?? motor.createdAt ?? new Date()).toISOString();
  const stub = buildOptimisticIntakeJob({
    companyId: motor.companyId,
    jobId,
    sessionId: '',
    uid: '',
    displayName: null,
    deviceId: '',
    identity: {
      serialCode: motor.serialCode,
      brandName: motor.brandName ?? '',
      engineCode: motor.engineCode ?? '',
    },
    now,
  });
  return {
    ...stub,
    engineId: motor.id,
    engineDocPath: `companies/${motor.companyId}/engines/${motor.id}`,
    state: jobStateFromIncomingMotor(motor),
    expectedIdentity: {
      ...stub.expectedIdentity,
      configuration: motor.configuration || '',
    },
    assignment: {
      assigneeUid: null,
      assigneeName: null,
      claimedByUid: null,
      claimedByName: null,
      activeSessionId: null,
      claimDeviceId: null,
      claimedAt: null,
      claimExpiresAt: null,
      lastHeartbeatAt: null,
    },
  };
}

export function incomingJobForMotor(
  motor: MotorEntity,
  jobsById: ReadonlyMap<string, EngineIntakeJob>,
): EngineIntakeJob | null {
  if (motor.intakeJobId) {
    const byJob = jobsById.get(motor.intakeJobId);
    if (byJob) return byJob;
  }
  const byEngine = jobsById.get(motor.id);
  if (byEngine) return byEngine;
  return jobStubFromIncomingMotor(motor);
}
