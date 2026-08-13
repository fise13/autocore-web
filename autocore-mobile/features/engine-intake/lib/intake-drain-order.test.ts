import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { commandFailureAbortsDrainWave, orderIntakeDrainWork } from './intake-drain-order';

describe('orderIntakeDrainWork', () => {
  it('uploads photos before Finish so the server can see them', () => {
    const ordered = orderIntakeDrainWork([
      { kind: 'command', commandType: 'field_complete', createdAt: '2', jobId: 'job' },
      { kind: 'photo', createdAt: '1', jobId: 'job' },
      { kind: 'command', commandType: 'create_job', createdAt: '0', jobId: 'job' },
    ]);
    assert.deepEqual(
      ordered.map((item) => item.commandType ?? item.kind),
      ['create_job', 'photo', 'field_complete'],
    );
  });

  it('drops pause when Finish is already queued for the same engine', () => {
    const ordered = orderIntakeDrainWork([
      { kind: 'command', commandType: 'pause_session', createdAt: '1', jobId: 'job' },
      { kind: 'command', commandType: 'field_complete', createdAt: '2', jobId: 'job' },
      { kind: 'photo', createdAt: '1.5', jobId: 'job' },
    ]);
    assert.deepEqual(
      ordered.map((item) => item.commandType ?? item.kind),
      ['photo', 'field_complete'],
    );
  });

  it('does not pause a session that still has photos to upload', () => {
    const ordered = orderIntakeDrainWork([
      { kind: 'command', commandType: 'pause_session', createdAt: '1', jobId: 'job' },
      { kind: 'photo', createdAt: '1.5', jobId: 'job' },
    ]);
    assert.deepEqual(
      ordered.map((item) => item.commandType ?? item.kind),
      ['photo'],
    );
  });

  it('keeps heartbeats first', () => {
    const ordered = orderIntakeDrainWork([
      { kind: 'photo', createdAt: '0', jobId: 'job' },
      { kind: 'command', commandType: 'heartbeat_session', createdAt: '9', jobId: 'job' },
    ]);
    assert.equal(ordered[0]?.commandType, 'heartbeat_session');
  });
});

describe('commandFailureAbortsDrainWave', () => {
  it('lets Finish and pause fail without blocking photo uploads', () => {
    assert.equal(commandFailureAbortsDrainWave('field_complete'), false);
    assert.equal(commandFailureAbortsDrainWave('pause_session'), false);
    assert.equal(commandFailureAbortsDrainWave('create_job'), true);
  });
});
