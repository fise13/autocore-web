import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DocumentationChecklistSummary } from '@autocore/engine-intake';

import type { MotorEntity } from '../../../types/motor';
import { daysOnLot, documentationLine, engineFacts, engineSpecRows } from './engine-facts';

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

function summary(partial: Partial<DocumentationChecklistSummary>): DocumentationChecklistSummary {
  return {
    completedCount: 0,
    missingCount: 0,
    uncertainCount: 0,
    notApplicableCount: 0,
    saleGateMissingCount: 0,
    ready: false,
    whisper: null,
    ...partial,
  };
}

const NOW = new Date(2026, 7, 12);

describe('daysOnLot', () => {
  it('counts whole calendar days since arrival', () => {
    assert.equal(daysOnLot(motor({ arrivalDate: new Date(2026, 7, 2) }), NOW), 10);
    assert.equal(daysOnLot(motor({ arrivalDate: new Date(2026, 7, 12) }), NOW), 0);
  });

  it('ignores the time of day', () => {
    assert.equal(daysOnLot(motor({ arrivalDate: new Date(2026, 7, 11, 23, 59) }), NOW), 1);
  });

  it('returns null with no arrival date, or a future one', () => {
    assert.equal(daysOnLot(motor(), NOW), null);
    assert.equal(daysOnLot(motor({ arrivalDate: new Date(2026, 7, 20) }), NOW), null);
  });
});

describe('engineFacts', () => {
  it('always leads with location', () => {
    const facts = engineFacts(motor({ primaryLocationCode: 'A-03-2' }), NOW);
    assert.equal(facts[0]?.id, 'location');
    assert.equal(facts[0]?.value, 'A-03-2');
    assert.equal(facts[0]?.tone, 'default');
  });

  it('flags an unplaced engine rather than showing a blank', () => {
    const [location] = engineFacts(motor(), NOW);
    assert.equal(location?.value, 'Unplaced');
    assert.equal(location?.tone, 'warning');
  });

  it('falls back to the free-text warehouse field', () => {
    const [location] = engineFacts(motor({ warehouseLocation: 'Back yard' }), NOW);
    assert.equal(location?.value, 'Back yard');
  });

  it('never returns more than three cells, so the strip cannot wrap', () => {
    const facts = engineFacts(
      motor({
        primaryLocationCode: 'A-1',
        configuration: 'V6 3.0',
        transmission: 'Automatic',
        arrivalDate: new Date(2026, 7, 2),
      }),
      NOW,
    );
    assert.equal(facts.length, 3);
    assert.deepEqual(
      facts.map((fact) => fact.id),
      ['location', 'configuration', 'transmission'],
    );
  });

  it('reports time on the lot in days', () => {
    const facts = engineFacts(
      motor({ primaryLocationCode: 'A-1', arrivalDate: new Date(2026, 7, 11) }),
      NOW,
    );
    const age = facts.find((fact) => fact.id === 'age');
    assert.equal(age?.value, '1 day');

    const today = engineFacts(
      motor({ primaryLocationCode: 'A-1', arrivalDate: NOW }),
      NOW,
    ).find((fact) => fact.id === 'age');
    assert.equal(today?.value, 'Today');
  });

  it('degrades to a single cell when nothing else is known', () => {
    assert.equal(engineFacts(motor(), NOW).length, 1);
  });
});

describe('engineSpecRows', () => {
  it('keeps every known field, not a three-cell cap', () => {
    const rows = engineSpecRows(
      motor({
        primaryLocationCode: 'A-1',
        configuration: 'V6 3.0',
        transmission: 'Automatic',
        arrivalDate: new Date(2026, 7, 2),
      }),
      NOW,
    );
    assert.deepEqual(
      rows.map((row) => row.id),
      ['location', 'configuration', 'transmission', 'age'],
    );
  });
});

describe('documentationLine', () => {
  it('is absent when there is no checklist at all', () => {
    assert.equal(documentationLine(null), null);
    assert.equal(documentationLine(summary({})), null);
  });

  it('leads with sale-gate gaps — the ones with money attached', () => {
    const line = documentationLine(
      summary({ completedCount: 14, missingCount: 4, saleGateMissingCount: 2 }),
    );
    assert.equal(line?.headline, '14 of 18');
    assert.equal(line?.detail, '2 shots block sale');
    assert.equal(line?.tone, 'danger');
  });

  it('singularizes a lone blocking shot', () => {
    const line = documentationLine(
      summary({ completedCount: 17, missingCount: 1, saleGateMissingCount: 1 }),
    );
    assert.equal(line?.detail, '1 shot blocks sale');
  });

  it('warns on non-blocking gaps', () => {
    const line = documentationLine(summary({ completedCount: 15, missingCount: 3 }));
    assert.equal(line?.detail, '3 still missing');
    assert.equal(line?.tone, 'warning');
  });

  it('distinguishes uncertain items from missing ones', () => {
    const line = documentationLine(summary({ completedCount: 16, uncertainCount: 2 }));
    assert.equal(line?.detail, '2 needs review');
    assert.equal(line?.tone, 'warning');
  });

  it('reports completion', () => {
    const line = documentationLine(summary({ completedCount: 18, ready: true }));
    assert.equal(line?.headline, '18 of 18');
    assert.equal(line?.detail, 'Documentation complete');
    assert.equal(line?.tone, 'success');
    assert.equal(line?.ratio, 1);
  });

  it('excludes not-applicable items from the denominator', () => {
    const line = documentationLine(
      summary({ completedCount: 8, missingCount: 2, notApplicableCount: 11 }),
    );
    assert.equal(line?.headline, '8 of 10');
  });
});
