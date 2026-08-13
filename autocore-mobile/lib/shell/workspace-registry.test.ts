import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { UserEntity } from '@autocore/rbac';

import { resolveShellModel, workDomainTitle } from './workspace-registry';

const ALL_MODULES = {
  motors: true,
  workOrders: true,
  accounting: true,
  warehouse: true,
  specifics: true,
} as const;

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
  it('never exposes finance in Work — it is its own surface', () => {
    for (const role of ['owner', 'manager', 'accountant', 'mechanic'] as const) {
      const model = resolveShellModel({ modules: ALL_MODULES, user: user(role) });
      assert.equal(
        model.workNodes.some((n) => n.id === 'finance'),
        false,
        `finance leaked into Work for ${role}`,
      );
      assert.equal(
        model.workGrouped.some((group) => group.domain === 'finance'),
        false,
        `finance section leaked into Work for ${role}`,
      );
    }
  });

  it('puts receiving before locations — physical work before structure', () => {
    const model = resolveShellModel({ modules: ALL_MODULES, user: user('owner') });
    const warehouse = model.workGrouped.find((group) => group.domain === 'warehouse');
    assert.deepEqual(warehouse?.nodes.map((n) => n.id), ['receiving', 'locations']);
  });

  it('orders Work sections by role', () => {
    const mechanic = resolveShellModel({ modules: ALL_MODULES, user: user('mechanic') });
    assert.equal(mechanic.workGrouped[0]?.domain, 'intake');

    const manager = resolveShellModel({ modules: ALL_MODULES, user: user('manager') });
    assert.deepEqual(
      manager.workGrouped.slice(0, 2).map((group) => group.domain),
      ['sales', 'intake'],
    );

    const owner = resolveShellModel({ modules: ALL_MODULES, user: user('owner') });
    assert.deepEqual(
      owner.workGrouped.slice(0, 3).map((group) => group.domain),
      ['sales', 'inventory', 'warehouse'],
    );
  });

  it('reorders sections by role without changing which ones exist', () => {
    // `employee` and `owner` both hold inventory + work-order + intake view,
    // so any difference between them is ordering, not membership.
    const domains = (role: Parameters<typeof user>[0]) =>
      resolveShellModel({ modules: ALL_MODULES, user: user(role) }).workGrouped.map(
        (group) => group.domain,
      );

    const employee = domains('employee');
    const owner = domains('owner');

    assert.deepEqual([...employee].sort(), [...owner].sort());
    assert.notDeepEqual(employee, owner);
    assert.equal(employee[0], 'intake');
    assert.equal(owner[0], 'sales');
  });

  it('shows only what the seat can reach — a mechanic gets no inventory sections', () => {
    const model = resolveShellModel({ modules: ALL_MODULES, user: user('mechanic') });
    assert.deepEqual(
      model.workGrouped.map((group) => group.domain),
      ['intake', 'sales', 'operations'],
    );
  });

  it('calls a single-module Operations section Tools', () => {
    assert.equal(workDomainTitle('operations', 1), 'Tools');
    assert.equal(workDomainTitle('operations', 2), 'Operations');
    assert.equal(workDomainTitle('inventory', 1), 'Inventory');

    const model = resolveShellModel({ modules: ALL_MODULES, user: user('owner') });
    const operations = model.workGrouped.find((group) => group.domain === 'operations');
    assert.equal(operations?.title, 'Tools');
  });

  it('drops sections whose modules are off', () => {
    const model = resolveShellModel({
      modules: { ...ALL_MODULES, workOrders: false },
      user: user('owner'),
    });
    assert.equal(
      model.workGrouped.some((group) => group.domain === 'sales'),
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
