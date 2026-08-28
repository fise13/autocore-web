import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildOptimisticIntakeJob } from '../../engine-intake/lib/optimistic-intake-job';

import {
  isIncomingJobState,
  isIncomingMotor,
  motorStatusFromIntakeJob,
  parseEngineListFilter,
} from './engine-lane';
import { incomingJobForMotor, splitEngineCatalog } from './motor-from-intake-job';
import type { MotorEntity } from '../../../types/motor';

function motor(partial: Partial<MotorEntity> & Pick<MotorEntity, 'id'>): MotorEntity {
  return {
    companyId: 'c',
    serialCode: partial.serialCode ?? partial.id,
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: null,
    status: 'available',
    ...partial,
  };
}

function job(id: string, state: 'in_session' | 'verified' | 'awaiting_verification', serial = 'S1') {
  const built = buildOptimisticIntakeJob({
    companyId: 'c',
    jobId: id,
    sessionId: `session-${id}`,
    uid: 'u',
    displayName: null,
    deviceId: 'd',
    identity: { serialCode: serial, brandName: 'Toyota', engineCode: '2AZ' },
  });
  return { ...built, state };
}

describe('parseEngineListFilter', () => {
  it('accepts the three lanes and maps legacy intake filters', () => {
    assert.equal(parseEngineListFilter('incoming'), 'incoming');
    assert.equal(parseEngineListFilter('yard'), 'yard');
    assert.equal(parseEngineListFilter('all'), 'all');
    assert.equal(parseEngineListFilter('active'), 'incoming');
    assert.equal(parseEngineListFilter('ready'), 'incoming');
    assert.equal(parseEngineListFilter('nope'), null);
  });
});

describe('incoming classification', () => {
  it('treats in-session jobs and draft motors as incoming', () => {
    assert.equal(isIncomingJobState('in_session'), true);
    assert.equal(isIncomingJobState('verified'), false);
    assert.equal(isIncomingMotor(motor({ id: 'm1', status: 'intake_in_progress' })), true);
    assert.equal(isIncomingMotor(motor({ id: 'm2', status: 'available' })), false);
  });

  it('maps job state onto the motor status the catalog already speaks', () => {
    assert.equal(motorStatusFromIntakeJob('awaiting_verification'), 'awaiting_verification');
    assert.equal(motorStatusFromIntakeJob('in_session'), 'intake_in_progress');
    assert.equal(motorStatusFromIntakeJob('verified'), 'available');
  });
});

describe('splitEngineCatalog', () => {
  it('keeps photographing jobs in Incoming and available motors in Yard', () => {
    const split = splitEngineCatalog(
      [job('job-1', 'in_session', 'U1')],
      [motor({ id: 'm-yard', serialCode: 'Y1', status: 'available' })],
    );
    assert.equal(split.incoming.length, 1);
    assert.equal(split.incoming[0]?.serialCode, 'U1');
    assert.equal(split.incoming[0]?.intakeJobId, 'job-1');
    assert.deepEqual(
      split.yard.map((item) => item.id),
      ['m-yard'],
    );
  });

  it('does not list a verified job as incoming', () => {
    const split = splitEngineCatalog(
      [job('job-1', 'verified')],
      [motor({ id: 'eng', intakeJobId: 'job-1', status: 'available' })],
    );
    assert.equal(split.incoming.length, 0);
    assert.equal(split.yard.length, 1);
  });
});

describe('incomingJobForMotor', () => {
  it('prefers the cached job when the bay still has it', () => {
    const cached = job('job-1', 'in_session', 'U1');
    const row = motor({
      id: 'eng-1',
      intakeJobId: 'job-1',
      status: 'intake_in_progress',
      serialCode: 'U1',
    });
    const hit = incomingJobForMotor(row, new Map([['job-1', cached]]));
    assert.equal(hit, cached);
  });

  it('rebuilds a local job so Continue still works with an empty jobs cache', () => {
    const row = motor({
      id: 'eng-1',
      companyId: 'c',
      intakeJobId: 'job-offline',
      status: 'intake_in_progress',
      serialCode: 'SN-9',
      brandName: 'Cummins',
      engineCode: 'ISX',
    });
    const stub = incomingJobForMotor(row, new Map());
    assert.ok(stub);
    assert.equal(stub?.id, 'job-offline');
    assert.equal(stub?.engineId, 'eng-1');
    assert.equal(stub?.expectedIdentity.serialCode, 'SN-9');
    assert.equal(stub?.assignment.activeSessionId, null);
    assert.equal(stub?.state, 'open');
  });

  it('does not invent a job for a yard engine', () => {
    assert.equal(
      incomingJobForMotor(motor({ id: 'm-yard', status: 'available' }), new Map()),
      null,
    );
  });
});
