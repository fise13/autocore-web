import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UserEntity } from '@autocore/rbac';

import { resolveShellModel } from './workspace-registry';

function user(role: UserEntity['role']): UserEntity {
  return {
    id: 'u1',
    email: 'a@b.com',
    displayName: 'Test',
    role,
    companyId: 'c1',
    isActive: true,
  };
}

describe('resolveShellModel', () => {
  it('hides finance work node when accounting module is off', () => {
    const model = resolveShellModel({
      modules: {
        motors: true,
        workOrders: true,
        accounting: false,
        warehouse: true,
        specifics: true,
      },
      user: user('manager'),
    });
    assert.equal(
      model.workNodes.some((n) => n.id === 'finance'),
      false,
    );
  });

  it('prioritizes intake actions when workspace context is engines', () => {
    const model = resolveShellModel({
      modules: {
        motors: true,
        workOrders: true,
        accounting: true,
        warehouse: true,
        specifics: true,
      },
      user: user('manager'),
      workspaceContext: 'engines',
    });
    assert.ok(model.actionItems.length > 0);
    const receiveIdx = model.actionItems.findIndex((a) => a.id === 'receive-engine');
    const scanIdx = model.actionItems.findIndex((a) => a.id === 'scan');
    assert.ok(receiveIdx >= 0);
    assert.ok(receiveIdx < scanIdx || scanIdx < 0);
  });

  it('gives workers continue-first home sections', () => {
    const model = resolveShellModel({
      modules: {
        motors: true,
        workOrders: true,
        accounting: false,
        warehouse: true,
        specifics: false,
      },
      user: user('mechanic'),
    });
    assert.deepEqual(model.homeSections.slice(0, 3), ['identity', 'attention', 'continue']);
  });
});
