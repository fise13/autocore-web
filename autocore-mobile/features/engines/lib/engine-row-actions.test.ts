import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  engineRowActions,
  engineRowSwipeAction,
  type EngineRowCapabilities,
} from './engine-row-actions';

const NONE: EngineRowCapabilities = {
  incoming: false,
  canAccept: false,
  canContinue: false,
  canEditIncoming: false,
  canCancelIncoming: false,
  canRelocate: false,
  canAddToOrder: false,
  canSell: false,
};

const ids = (caps: EngineRowCapabilities) => engineRowActions(caps).map((a) => a.id);

describe('engineRowActions', () => {
  it('always offers open and copy, whatever the role', () => {
    assert.deepEqual(ids(NONE), ['open', 'copySerial']);
  });

  it('leads with the action a plain tap performs', () => {
    // A menu whose first item is not the default action makes people hesitate.
    assert.equal(ids({ ...NONE, canSell: true, canRelocate: true })[0], 'open');
  });

  it('calls opening a reviewable engine "Review"', () => {
    const caps = { ...NONE, incoming: true, canAccept: true };
    assert.equal(engineRowActions(caps)[0]!.label, 'Review');
    assert.equal(engineRowActions({ ...NONE, incoming: true })[0]!.label, 'Open');
  });

  it('keeps yard actions off an incoming engine and vice versa', () => {
    const incoming = ids({
      ...NONE,
      incoming: true,
      canContinue: true,
      canEditIncoming: true,
      canCancelIncoming: true,
      // Granted, but meaningless on an engine that is still being documented.
      canRelocate: false,
      canSell: false,
    });
    assert.ok(!incoming.includes('sell'));
    assert.ok(!incoming.includes('relocate'));

    const yard = ids({ ...NONE, canRelocate: true, canSell: true, canAddToOrder: true });
    assert.ok(!yard.includes('photograph'));
    assert.ok(!yard.includes('cancel'));
  });

  it('never shows an intake action when the row is not incoming', () => {
    const caps = {
      ...NONE,
      incoming: false,
      canContinue: true,
      canAccept: true,
      canEditIncoming: true,
      canCancelIncoming: true,
    };
    assert.deepEqual(ids(caps), ['open', 'copySerial']);
  });

  it('puts the destructive action last and marks it', () => {
    const actions = engineRowActions({
      ...NONE,
      incoming: true,
      canContinue: true,
      canCancelIncoming: true,
    });
    const last = actions[actions.length - 1]!;
    assert.equal(last.id, 'cancel');
    assert.equal(last.destructive, true);
    assert.equal(actions.filter((a) => a.destructive).length, 1);
  });

  it('gives every action an SF Symbol', () => {
    const all = engineRowActions({
      incoming: true,
      canAccept: true,
      canContinue: true,
      canEditIncoming: true,
      canCancelIncoming: true,
      canRelocate: true,
      canAddToOrder: true,
      canSell: true,
    });
    for (const action of all) assert.match(action.systemImage, /^[a-z0-9.]+$/);
  });
});

describe('engineRowSwipeAction', () => {
  it('offers the repeated action for the lane, not a second menu', () => {
    assert.equal(
      engineRowSwipeAction({ ...NONE, incoming: true, canContinue: true })?.id,
      'photograph',
    );
    assert.equal(engineRowSwipeAction({ ...NONE, canRelocate: true })?.id, 'relocate');
  });

  it('offers nothing when the person cannot do that action', () => {
    assert.equal(engineRowSwipeAction({ ...NONE, incoming: true }), null);
    assert.equal(engineRowSwipeAction(NONE), null);
  });

  it('never puts a destructive action on a swipe', () => {
    const caps = { ...NONE, incoming: true, canCancelIncoming: true };
    assert.notEqual(engineRowSwipeAction(caps)?.id, 'cancel');
  });
});
