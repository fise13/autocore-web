import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isLeaveAppRuntime,
  leaveAppPhotoRank,
  MAX_LEAVE_APP_DRAIN_PASSES,
  orderLeaveAppPhotoWork,
  photoIsLeaveDrainWork,
  photoNeedsLiveRuntime,
  shouldContinueLeaveAppDrain,
  shouldRunLeaveAppDrain,
  shouldWaitForLeaveInflightPrepares,
} from './leave-app-drain';

describe('shouldContinueLeaveAppDrain', () => {
  it('stops after the first pass in the foreground when nobody asked again', () => {
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: false,
        appState: 'active',
        hasRunnableWork: true,
        passes: 1,
      }),
      false,
    );
  });

  it('runs one more pass when a drain was requested mid-wave', () => {
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: true,
        appState: 'active',
        hasRunnableWork: false,
        passes: 1,
      }),
      true,
    );
  });

  it('keeps draining after leave so torn-down fetches retry immediately', () => {
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: false,
        appState: 'background',
        hasRunnableWork: true,
        passes: 1,
      }),
      true,
    );
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: false,
        appState: 'inactive',
        hasRunnableWork: true,
        passes: 3,
      }),
      true,
    );
  });

  it('stops once the queue has nothing runnable, even in the background', () => {
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: false,
        appState: 'background',
        hasRunnableWork: false,
        passes: 1,
      }),
      false,
    );
  });

  it('caps the leave-app loop', () => {
    assert.equal(
      shouldContinueLeaveAppDrain({
        drainAgain: true,
        appState: 'background',
        hasRunnableWork: true,
        passes: MAX_LEAVE_APP_DRAIN_PASSES,
      }),
      false,
    );
  });
});

function photo(
  id: string,
  createdAt: string,
  state: { hasUsablePreparedUpload?: boolean; putStarted?: boolean } = {},
) {
  return {
    id,
    createdAt,
    hasUsablePreparedUpload: state.hasUsablePreparedUpload ?? false,
    putStarted: state.putStarted ?? false,
  };
}

describe('leaveAppPhotoRank', () => {
  it('puts a primed photo first — its PUT needs no round-trip', () => {
    assert.equal(leaveAppPhotoRank(photo('a', '1', { hasUsablePreparedUpload: true })), 0);
  });

  it('puts an unprimed photo second — one prepare, then the daemon has it', () => {
    assert.equal(leaveAppPhotoRank(photo('b', '1')), 1);
  });

  it('puts an already-sent photo last, primed or not', () => {
    assert.equal(leaveAppPhotoRank(photo('c', '1', { putStarted: true })), 2);
    assert.equal(
      leaveAppPhotoRank(
        photo('d', '1', { putStarted: true, hasUsablePreparedUpload: true }),
      ),
      2,
    );
  });
});

describe('orderLeaveAppPhotoWork', () => {
  it('spends the window on photos that can still reach the daemon', () => {
    const ordered = orderLeaveAppPhotoWork([
      photo('sent', '2026-08-27T10:00:00.000Z', { putStarted: true }),
      photo('fresh', '2026-08-27T10:00:03.000Z'),
      photo('primed', '2026-08-27T10:00:02.000Z', { hasUsablePreparedUpload: true }),
    ]);
    assert.deepEqual(
      ordered.map((item) => item.id),
      ['primed', 'fresh', 'sent'],
    );
  });

  it('keeps capture order inside a rank', () => {
    const ordered = orderLeaveAppPhotoWork([
      photo('second', '2026-08-27T10:00:05.000Z'),
      photo('first', '2026-08-27T10:00:01.000Z'),
      photo('third', '2026-08-27T10:00:09.000Z'),
    ]);
    assert.deepEqual(
      ordered.map((item) => item.id),
      ['first', 'second', 'third'],
    );
  });

  it('does not mutate the queue it was handed', () => {
    const input = [
      photo('sent', '2026-08-27T10:00:00.000Z', { putStarted: true }),
      photo('primed', '2026-08-27T10:00:02.000Z', { hasUsablePreparedUpload: true }),
    ];
    orderLeaveAppPhotoWork(input);
    assert.deepEqual(
      input.map((item) => item.id),
      ['sent', 'primed'],
    );
  });
});

describe('photoNeedsLiveRuntime', () => {
  it('is true until the bytes have been handed to the daemon', () => {
    assert.equal(photoNeedsLiveRuntime({ putStarted: false, status: 'queued' }), true);
    assert.equal(photoNeedsLiveRuntime({ putStarted: false, status: 'uploading' }), true);
    assert.equal(photoNeedsLiveRuntime({ putStarted: true, status: 'uploading' }), false);
  });

  it('is false for a row that is already done or needs a person', () => {
    assert.equal(photoNeedsLiveRuntime({ putStarted: false, status: 'completed' }), false);
    assert.equal(photoNeedsLiveRuntime({ putStarted: false, status: 'failed' }), false);
  });
});

describe('isLeaveAppRuntime', () => {
  it('treats anything but active as a leave', () => {
    assert.equal(isLeaveAppRuntime('active'), false);
    assert.equal(isLeaveAppRuntime('background'), true);
    assert.equal(isLeaveAppRuntime('inactive'), true);
  });
});

describe('shouldRunLeaveAppDrain', () => {
  it('runs the JS drain only once the app is actually backgrounded', () => {
    assert.equal(shouldRunLeaveAppDrain('background'), true);
    assert.equal(shouldRunLeaveAppDrain('inactive'), false);
    assert.equal(shouldRunLeaveAppDrain('active'), false);
  });
});

describe('shouldWaitForLeaveInflightPrepares', () => {
  it('waits on leave while a shutter prime is still in prepare', () => {
    assert.equal(
      shouldWaitForLeaveInflightPrepares({
        appState: 'background',
        inflightPrepareCount: 2,
      }),
      true,
    );
    assert.equal(
      shouldWaitForLeaveInflightPrepares({
        appState: 'inactive',
        inflightPrepareCount: 1,
      }),
      true,
    );
  });

  it('does not wait in the foreground or once every PUT is the daemon\'s', () => {
    assert.equal(
      shouldWaitForLeaveInflightPrepares({
        appState: 'active',
        inflightPrepareCount: 3,
      }),
      false,
    );
    assert.equal(
      shouldWaitForLeaveInflightPrepares({
        appState: 'background',
        inflightPrepareCount: 0,
      }),
      false,
    );
  });
});

describe('photoIsLeaveDrainWork', () => {
  it('keeps JS alive for an in-flight prepare that the drain cannot start again', () => {
    assert.equal(
      photoIsLeaveDrainWork({
        heldByDaemon: false,
        putStarted: false,
        inflightPrepare: true,
        jobRunnable: false,
      }),
      true,
    );
  });

  it('does not spend the window on a PUT the daemon already owns', () => {
    assert.equal(
      photoIsLeaveDrainWork({
        heldByDaemon: true,
        putStarted: false,
        inflightPrepare: true,
        jobRunnable: true,
      }),
      false,
    );
    assert.equal(
      photoIsLeaveDrainWork({
        heldByDaemon: false,
        putStarted: true,
        inflightPrepare: false,
        jobRunnable: true,
      }),
      false,
    );
  });

  it('still picks up a queued photo that nobody owns yet', () => {
    assert.equal(
      photoIsLeaveDrainWork({
        heldByDaemon: false,
        putStarted: false,
        inflightPrepare: false,
        jobRunnable: true,
      }),
      true,
    );
  });
});
