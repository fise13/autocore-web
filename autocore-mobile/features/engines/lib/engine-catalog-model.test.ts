import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MotorEntity } from '../../../types/motor';

import { buildEngineCatalog, deriveEngineCatalog, type EngineCatalogInput } from './engine-catalog-model';

function motor(id: string, brandName: string, engineCode: string, extra: Partial<MotorEntity> = {}): MotorEntity {
  return {
    id,
    companyId: 'c',
    serialCode: id,
    brandName,
    engineCode,
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: null,
    status: 'available',
    ...extra,
  } as MotorEntity;
}

const motors = [
  motor('B200', 'Subaru', 'EJ251', { quality: '1', warehouseLocation: 'A-1' }),
  motor('B100', 'Subaru', 'EJ251', { quality: '2' }),
  motor('9', 'Toyota', '2AZ-FE', { quality: '1' }),
];

function input(patch: Partial<EngineCatalogInput> = {}): EngineCatalogInput {
  return { jobs: [], motors, query: '', quality: 'all', lane: 'yard', ...patch };
}

describe('buildEngineCatalog', () => {
  it('groups the yard by model, biggest first, serials in natural order', () => {
    const model = buildEngineCatalog(input());
    const shape = model.rows.map((row) => (row.type === 'header' ? `# ${row.title}` : row.motor.id));
    assert.deepEqual(shape, ['# EJ251', 'B100', 'B200', '# 2AZ-FE', '9']);
    assert.equal(model.yardCount, 3);
    assert.equal(model.unplacedCount, 2);
  });

  it('applies search and grade together', () => {
    assert.equal(buildEngineCatalog(input({ query: 'subaru', quality: '1' })).yardCount, 1);
    assert.equal(buildEngineCatalog(input({ query: 'nothing-like-this' })).rows.length, 0);
  });
});

describe('deriveEngineCatalog', () => {
  it('returns the same model while inputs are unchanged, a new one when they change', () => {
    const jobs: EngineCatalogInput['jobs'] = [];
    const first = deriveEngineCatalog(input({ jobs }));
    assert.equal(deriveEngineCatalog(input({ jobs })), first);
    assert.notEqual(deriveEngineCatalog(input({ jobs, query: 'toyota' })), first);
  });

  it('treats a fresh but identical jobs array as unchanged (reopening the screen)', () => {
    const first = deriveEngineCatalog(input({ jobs: [] }));
    assert.equal(deriveEngineCatalog(input({ jobs: [] })), first);
  });
});
