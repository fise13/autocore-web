import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveTransactionReplay, type ReplayInput } from './transaction-replay';
import type { PurchaseFailure } from './types';

const REFUSED: PurchaseFailure = {
  code: 'bound_to_other_company',
  message: 'This Apple subscription is already used by another workspace.',
};

function input(overrides: Partial<ReplayInput> = {}): ReplayInput {
  return { verdict: undefined, settled: false, inFlight: false, flowBusy: false, ...overrides };
}

describe('a transaction we have not seen', () => {
  it('goes through the normal path', () => {
    assert.deepEqual(resolveTransactionReplay(input()), { kind: 'settle' });
  });

  it('still goes through it when the user is waiting', () => {
    assert.deepEqual(resolveTransactionReplay(input({ flowBusy: true })), { kind: 'settle' });
  });
});

describe('a replay while the user is waiting on the button', () => {
  // The regression this module exists for: every one of these used to resolve
  // to "do nothing", with the watchdog already disarmed, so the spinner ran
  // forever on a subscription the Apple ID genuinely owned.
  it('never resolves to doing nothing', () => {
    const cases: ReplayInput[] = [
      input({ settled: true, verdict: null, flowBusy: true }),
      input({ settled: true, verdict: REFUSED, flowBusy: true }),
      input({ settled: true, verdict: null, flowBusy: true, inFlight: true }),
    ];

    for (const value of cases) {
      assert.notEqual(resolveTransactionReplay(value).kind, 'ignore');
    }
  });

  it('celebrates one the server accepted', () => {
    assert.deepEqual(
      resolveTransactionReplay(input({ settled: true, verdict: null, flowBusy: true })),
      { kind: 'celebrate' },
    );
  });

  it('repeats the refusal for one the server turned down', () => {
    assert.deepEqual(
      resolveTransactionReplay(input({ settled: true, verdict: REFUSED, flowBusy: true })),
      { kind: 'fail', failure: REFUSED },
    );
  });

  it('does not read a refusal as a success', () => {
    // Keeping only "we asked already" and not the answer is what would make a
    // refused purchase quietly report success on the next tap.
    const outcome = resolveTransactionReplay(
      input({ settled: true, verdict: REFUSED, flowBusy: true }),
    );
    assert.notEqual(outcome.kind, 'celebrate');
  });
});

describe('a replay nobody is watching', () => {
  it('paints nothing, so the boot drain cannot flash an idle paywall', () => {
    assert.deepEqual(
      resolveTransactionReplay(input({ settled: true, verdict: null, flowBusy: false })),
      { kind: 'ignore', keepWatchdog: false },
    );
    assert.deepEqual(
      resolveTransactionReplay(input({ settled: true, verdict: REFUSED, flowBusy: false })),
      { kind: 'ignore', keepWatchdog: false },
    );
  });
});

describe('a settle already running', () => {
  it('steps aside but keeps the safety net armed', () => {
    // That settle may be the boot drain's, which never touches the flow.
    assert.deepEqual(resolveTransactionReplay(input({ inFlight: true, flowBusy: true })), {
      kind: 'ignore',
      keepWatchdog: true,
    });
  });

  it('is outranked by a verdict we already hold', () => {
    assert.deepEqual(
      resolveTransactionReplay(input({ settled: true, verdict: null, inFlight: true, flowBusy: true })),
      { kind: 'celebrate' },
    );
  });
});
