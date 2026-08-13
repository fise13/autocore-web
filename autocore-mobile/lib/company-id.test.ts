import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_COMPANY_ID,
  isDefaultCompanyId,
  preferCompanyId,
} from './company-id';

describe('preferCompanyId', () => {
  it('keeps a real profile company over memberships', () => {
    assert.equal(preferCompanyId('acme', [DEFAULT_COMPANY_ID, 'other']), 'acme');
  });

  it('keeps assigned default — does not steal to another membership', () => {
    assert.equal(
      preferCompanyId(DEFAULT_COMPANY_ID, [DEFAULT_COMPANY_ID, 'acme']),
      DEFAULT_COMPANY_ID,
    );
    assert.equal(isDefaultCompanyId(DEFAULT_COMPANY_ID), true);
  });

  it('uses memberships only when profile is unassigned', () => {
    assert.equal(preferCompanyId('', ['acme', 'beta']), 'acme');
    assert.equal(preferCompanyId(null, [DEFAULT_COMPANY_ID, 'acme']), 'acme');
    assert.equal(preferCompanyId(null, [DEFAULT_COMPANY_ID]), DEFAULT_COMPANY_ID);
    assert.equal(preferCompanyId(null, []), null);
  });
});
