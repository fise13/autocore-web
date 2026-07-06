import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDataScope,
  resolveAccessScopes,
  isAssignedToWorkOrder,
  filterWorkOrdersByScope,
  canAccessMissionControl,
  canAccessMyEarnings,
  isMobileTabAllowed,
  hasPermission,
  ROLE_PERMISSIONS,
  type UserEntity,
} from './index';

function user(role: UserEntity['role'], overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'uid-1',
    email: 'user@test.com',
    displayName: 'Test User',
    role,
    companyId: 'company-1',
    isActive: true,
    ...overrides,
  };
}

describe('ROLE_PERMISSIONS parity', () => {
  it('manager does not include settings_manage', () => {
    assert.equal(ROLE_PERMISSIONS.manager.includes('settings_manage'), false);
  });

  it('mechanic includes payroll_view_own', () => {
    assert.equal(ROLE_PERMISSIONS.mechanic.includes('payroll_view_own'), true);
  });
});

describe('hasPermission', () => {
  it('owner flag grants all permissions', () => {
    const profile = user('employee', { isCompanyOwner: true });
    assert.equal(hasPermission(profile, 'settings_manage'), true);
  });

  it('inactive users are denied', () => {
    const profile = user('admin', { isActive: false });
    assert.equal(hasPermission(profile, 'inventory_view'), false);
  });
});

describe('data scopes', () => {
  it('mechanic work orders are assignee scoped', () => {
    assert.equal(getDataScope(user('mechanic'), 'work_orders'), 'assigned_work_orders');
  });

  it('manager sees company-wide work orders', () => {
    assert.equal(getDataScope(user('manager'), 'work_orders'), 'company');
  });

  it('mechanic payroll is own only', () => {
    assert.equal(getDataScope(user('mechanic'), 'payroll'), 'own_payroll');
  });

  it('accountant has company payroll scope', () => {
    assert.equal(resolveAccessScopes(user('accountant')).payroll, 'company');
  });
});

describe('work order assignee filter', () => {
  const orders = [
    { id: 'a', laborLines: [{ assigneeIds: ['uid-1'] }] },
    { id: 'b', laborLines: [{ assigneeIds: ['uid-2'] }] },
  ];

  it('filters assigned orders for mechanic scope', () => {
    const filtered = filterWorkOrdersByScope(orders, 'uid-1', 'assigned_work_orders');
    assert.deepEqual(
      filtered.map((order) => order.id),
      ['a'],
    );
  });

  it('detects assignee membership', () => {
    assert.equal(isAssignedToWorkOrder(orders[0], 'uid-1'), true);
    assert.equal(isAssignedToWorkOrder(orders[1], 'uid-1'), false);
  });
});

describe('navigation policy', () => {
  it('mechanic cannot access mission control tab', () => {
    assert.equal(canAccessMissionControl(user('mechanic')), false);
    assert.equal(isMobileTabAllowed(user('mechanic'), 'index'), false);
    assert.equal(isMobileTabAllowed(user('mechanic'), 'orders'), true);
  });

  it('admin can access mission control', () => {
    assert.equal(canAccessMissionControl(user('admin')), true);
    assert.equal(isMobileTabAllowed(user('admin'), 'index'), true);
  });

  it('my earnings follows payroll_view_own permission', () => {
    assert.equal(canAccessMyEarnings(user('mechanic')), true);
    assert.equal(isMobileTabAllowed(user('mechanic'), 'my-earnings'), true);
    assert.equal(canAccessMyEarnings(user('diagnostician')), false);
    assert.equal(canAccessMyEarnings(user('manager')), false);
  });
});
