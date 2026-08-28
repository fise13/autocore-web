import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ActionItem } from '@/lib/shell/types';

import { buildHomeQuickActions, HOME_MAX_QUICK_ACTIONS } from './quick-actions';
import type { HomeIntakeFacts } from './facts';

/** The full catalog a permitted owner would be handed by the shell. */
const ACTIONS: ActionItem[] = [
  { id: 'scan', title: 'Scan', href: '/(tabs)/scan', sf: '' },
  { id: 'receive-engine', title: 'Receive engine', href: '/objects/new', sf: '' },
  { id: 'photograph', title: 'Photograph engine', href: '/objects/engines', sf: '' },
  { id: 'new-order', title: 'New order', href: '/orders/new', sf: '' },
  { id: 'add-item', title: 'Add part', href: '/orders/create-item', sf: '' },
  { id: 'new-transaction', title: 'New transaction', href: '/finance/new', sf: '' },
  { id: 'import-document', title: 'Import document', href: '/import', sf: '' },
  { id: 'search', title: 'Search', href: '/search', sf: '' },
];

function intake(overrides: Partial<HomeIntakeFacts> = {}): HomeIntakeFacts {
  return {
    inProgressCount: 0,
    reworkCount: 0,
    quarantineCount: 0,
    awaitingVerificationCount: 0,
    resumable: null,
    stuckPhotoCount: 0,
    ...overrides,
  };
}

const RESUMABLE = { jobId: 'j1', sessionId: 's1', label: 'U398539' };

describe('buildHomeQuickActions', () => {
  it('maps the catalog onto commands and drops what is not an action', () => {
    const actions = buildHomeQuickActions({ actions: ACTIONS, intake: intake() }, 99);

    assert.deepEqual(
      actions.map((action) => action.id),
      ['scan', 'engine.receive', 'order.new', 'part.new', 'transaction.new', 'document.capture'],
    );
    // Search is not an action; photograph pointed at a list, and is answered by
    // `intake.resume` from live state instead.
    assert.ok(!actions.some((action) => action.id === 'scan' && action.detail));
  });

  it('holds the catalog order the shell handed it', () => {
    const reordered = [...ACTIONS].reverse();
    const actions = buildHomeQuickActions({ actions: reordered, intake: intake() }, 99);

    assert.equal(actions[0].id, 'document.capture');
    assert.equal(actions[actions.length - 1].id, 'scan');
  });

  it('caps the strip so the section stays one line of the brief', () => {
    const actions = buildHomeQuickActions({ actions: ACTIONS, intake: intake() });

    assert.equal(actions.length, HOME_MAX_QUICK_ACTIONS);
  });

  it('puts work already underway ahead of work not yet begun', () => {
    const actions = buildHomeQuickActions({
      actions: ACTIONS,
      intake: intake({ resumable: RESUMABLE, stuckPhotoCount: 2 }),
    });

    assert.deepEqual(
      actions.map((action) => action.id),
      ['intake.retry-photos', 'intake.resume', 'scan', 'engine.receive'],
    );
  });

  it('names the engine Continue would reopen', () => {
    const [resume] = buildHomeQuickActions({
      actions: ACTIONS,
      intake: intake({ resumable: RESUMABLE }),
    });

    assert.equal(resume.title, 'Continue');
    assert.equal(resume.detail, 'U398539');
    assert.deepEqual(resume.command, { kind: 'resume-intake', jobId: 'j1', sessionId: 's1' });
  });

  it('falls back to the verb alone when the engine has no serial yet', () => {
    const [resume] = buildHomeQuickActions({
      actions: ACTIONS,
      intake: intake({ resumable: { ...RESUMABLE, label: '' } }),
    });

    assert.equal(resume.id, 'intake.resume');
    assert.equal(resume.detail, null);
  });

  it('counts the stuck photos in the hint as well as the pill', () => {
    const [retry] = buildHomeQuickActions({
      actions: ACTIONS,
      intake: intake({ stuckPhotoCount: 1 }),
    });

    assert.equal(retry.detail, '1');
    assert.match(retry.hint, /1 photo /);
    assert.ok(!retry.hint.includes('1 photos'));
  });

  it('offers nothing intake-shaped to a reader the shell gives no intake action', () => {
    const actions = buildHomeQuickActions({
      actions: ACTIONS.filter(
        (action) => action.id !== 'receive-engine' && action.id !== 'photograph',
      ),
      intake: intake({ resumable: RESUMABLE, stuckPhotoCount: 4 }),
    });

    assert.ok(!actions.some((action) => action.id.startsWith('intake.')));
  });

  it('says nothing at all when the reader cannot see intake or it has not loaded', () => {
    const actions = buildHomeQuickActions({ actions: ACTIONS, intake: null }, 99);

    assert.ok(!actions.some((action) => action.id.startsWith('intake.')));
    assert.ok(actions.length > 0);
  });

  it('is empty when the shell hands over nothing runnable', () => {
    const actions = buildHomeQuickActions({
      actions: [{ id: 'search', title: 'Search', href: '/search', sf: '' }],
      intake: intake(),
    });

    assert.deepEqual(actions, []);
  });
});
