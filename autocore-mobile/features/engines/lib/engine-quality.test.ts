import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MotorEntity } from '../../../types/motor';

import {
  ENGINE_QUALITY_GRADE_MARKS,
  engineMatchesQualityFilter,
  engineQualityGrade,
  engineQualityLabel,
  engineQualitySearchText,
  engineQualityTone,
  isExactQualityGradeQuery,
} from './engine-quality';

function motor(partial: Partial<MotorEntity> = {}): MotorEntity {
  return {
    id: '1',
    companyId: 'c1',
    serialCode: 'T-1',
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: null,
    ...partial,
  };
}

describe('engineQualityGrade', () => {
  it('reads the shop digit off the stored string', () => {
    assert.equal(engineQualityGrade(motor({ quality: '2' })), '2');
    assert.equal(engineQualityGrade(motor({ quality: '3 — poor' })), '3');
    assert.equal(engineQualityGrade(motor({ quality: ' 1 ' })), '1');
  });

  it('treats empty or junk as ungraded', () => {
    assert.equal(engineQualityGrade(motor()), null);
    assert.equal(engineQualityGrade(motor({ quality: '' })), null);
    assert.equal(engineQualityGrade(motor({ quality: 'refurbished' })), null);
  });
});

describe('engineQualityLabel', () => {
  it('uses the intake labels, not the raw digit', () => {
    assert.equal(engineQualityLabel(motor({ quality: '2' })), 'Excellent');
    assert.equal(engineQualityLabel(motor({ quality: '1' })), 'Fair');
    assert.equal(engineQualityLabel(motor({ quality: '3' })), 'Poor');
    assert.equal(engineQualityLabel(motor()), 'Ungraded');
  });
});

describe('engineQualityTone', () => {
  it('maps 2 / 1 / 3 onto success / primary / danger — same as the motors grid', () => {
    assert.equal(engineQualityTone(motor({ quality: '2' })), 'success');
    assert.equal(engineQualityTone(motor({ quality: '1' })), 'primary');
    assert.equal(engineQualityTone(motor({ quality: '3' })), 'danger');
    assert.equal(engineQualityTone(motor()), 'muted');
  });
});

describe('engineMatchesQualityFilter', () => {
  it('lets All through and pins the other chips to a grade', () => {
    const excellent = motor({ quality: '2' });
    const fair = motor({ quality: '1' });
    const ungraded = motor();

    assert.equal(engineMatchesQualityFilter(excellent, 'all'), true);
    assert.equal(engineMatchesQualityFilter(excellent, '2'), true);
    assert.equal(engineMatchesQualityFilter(fair, '2'), false);
    assert.equal(engineMatchesQualityFilter(ungraded, 'ungraded'), true);
    assert.equal(engineMatchesQualityFilter(excellent, 'ungraded'), false);
  });
});

describe('engineQualitySearchText', () => {
  it('indexes English and Russian aliases for the grade', () => {
    const haystack = engineQualitySearchText(motor({ quality: '2' })).toLowerCase();
    assert.ok(haystack.includes('excellent'));
    assert.ok(haystack.includes('отличн'));
    assert.ok(haystack.includes('quality 2'));
  });

  it('indexes ungraded so a search for that word finds holes', () => {
    const haystack = engineQualitySearchText(motor()).toLowerCase();
    assert.ok(haystack.includes('ungraded'));
    assert.ok(haystack.includes('без качества'));
  });
});

describe('isExactQualityGradeQuery', () => {
  it('only treats a bare 1 / 2 / 3 as a grade query', () => {
    assert.equal(isExactQualityGradeQuery('2'), '2');
    assert.equal(isExactQualityGradeQuery(' 3 '), '3');
    assert.equal(isExactQualityGradeQuery('excellent'), null);
    assert.equal(isExactQualityGradeQuery('12'), null);
  });
});

describe('ENGINE_QUALITY_GRADE_MARKS', () => {
  it('is 1 2 3 — the shop scale, left to right', () => {
    assert.deepEqual(ENGINE_QUALITY_GRADE_MARKS, ['1', '2', '3']);
  });
});
