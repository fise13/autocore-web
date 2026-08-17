import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MotorEntity } from '../../../types/motor';
import {
  canSaveEngineDraft,
  checkEngineDraft,
  draftVariantLabel,
  emptyEngineDraft,
  exactSerialKey,
  nearSerialKey,
  toEngineCreateInput,
  type EngineDraft,
} from './engine-draft';

function motor(partial: Partial<MotorEntity> = {}): MotorEntity {
  return {
    id: '1',
    companyId: 'c1',
    serialCode: 'U398539',
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: null,
    ...partial,
  };
}

function draft(partial: Partial<EngineDraft> = {}): EngineDraft {
  return { ...emptyEngineDraft(), ...partial };
}

describe('serial keys', () => {
  it('treats case and spacing as typing noise', () => {
    assert.equal(exactSerialKey('  2az-1234  '), '2AZ-1234');
    assert.equal(exactSerialKey('2az  1234'), '2AZ 1234');
  });

  it('drops separators for the near key only', () => {
    assert.equal(nearSerialKey('2AZ-1234'), '2AZ1234');
    assert.equal(nearSerialKey('2az 1234'), '2AZ1234');
    assert.notEqual(exactSerialKey('2AZ-1234'), exactSerialKey('2AZ 1234'));
  });
});

describe('checkEngineDraft', () => {
  const catalog = [
    motor({ id: '1', serialCode: '2AZ-1234' }),
    motor({ id: '2', serialCode: 'JZ 9001' }),
  ];

  it('asks for a serial before anything else', () => {
    assert.deepEqual(checkEngineDraft(draft(), catalog), { status: 'incomplete' });
    assert.deepEqual(checkEngineDraft(draft({ serial: '   ' }), catalog), { status: 'incomplete' });
  });

  it('blocks a serial already in the catalog, whatever the case', () => {
    const result = checkEngineDraft(draft({ serial: '2az-1234' }), catalog);
    assert.equal(result.status, 'duplicate');
    assert.equal(result.status === 'duplicate' ? result.existing.id : null, '1');
    assert.equal(canSaveEngineDraft(result), false);
  });

  it('only warns when the serial differs by separators', () => {
    const result = checkEngineDraft(draft({ serial: '2AZ 1234' }), catalog);
    assert.equal(result.status, 'similar');
    assert.equal(result.status === 'similar' ? result.existing.id : null, '1');
    // A near match is the user's judgement call, not a refusal.
    assert.equal(canSaveEngineDraft(result), true);
  });

  it('prefers an exact collision over a near one anywhere in the catalog', () => {
    const mixed = [motor({ id: 'near', serialCode: 'AB 12' }), motor({ id: 'exact', serialCode: 'AB-12' })];
    const result = checkEngineDraft(draft({ serial: 'ab-12' }), mixed);
    assert.equal(result.status, 'duplicate');
    assert.equal(result.status === 'duplicate' ? result.existing.id : null, 'exact');
  });

  it('accepts a serial nobody has used', () => {
    assert.deepEqual(checkEngineDraft(draft({ serial: 'NEW-1' }), catalog), { status: 'ok' });
    assert.equal(canSaveEngineDraft({ status: 'ok' }), true);
  });

  it('ignores catalog rows with no serial', () => {
    const result = checkEngineDraft(draft({ serial: 'NEW-1' }), [motor({ serialCode: '  ' })]);
    assert.deepEqual(result, { status: 'ok' });
  });
});

describe('toEngineCreateInput', () => {
  it('trims the serial and collapses inner whitespace', () => {
    const input = toEngineCreateInput(draft({ serial: '  2AZ   1234 ' }));
    assert.equal(input.serialCode, '2AZ 1234');
  });

  it('omits blank optional fields rather than writing empty strings', () => {
    const input = toEngineCreateInput(draft({ serial: 'S1', brand: '  ', code: '', location: ' ' }));
    assert.equal(input.brandName, undefined);
    assert.equal(input.engineCode, undefined);
    assert.equal(input.warehouseLocation, undefined);
  });

  it('passes trimmed values through', () => {
    const input = toEngineCreateInput(
      draft({ serial: 'S1', brand: ' Toyota ', code: ' 2AZ-FE ', location: ' A-12 ' }),
    );
    assert.deepEqual(input, {
      serialCode: 'S1',
      brandName: 'Toyota',
      engineCode: '2AZ-FE',
      warehouseLocation: 'A-12',
    });
  });
});

describe('draftVariantLabel', () => {
  it('reads as the catalog heading the unit will land under', () => {
    assert.equal(draftVariantLabel(draft({ brand: 'Toyota', code: '2AZ-FE' })), 'Toyota 2AZ-FE');
    assert.equal(draftVariantLabel(draft({ brand: 'Toyota' })), 'Toyota');
    assert.equal(draftVariantLabel(draft()), 'Unspecified engine');
  });
});
