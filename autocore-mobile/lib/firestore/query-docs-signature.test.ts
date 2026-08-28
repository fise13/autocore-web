import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { queryDocsSignature } from './query-docs-signature';

describe('queryDocsSignature', () => {
  it('is stable for the same docs and versions', () => {
    const docs = [
      { id: 'a', version: 1 },
      { id: 'b', version: 2 },
    ];
    assert.equal(queryDocsSignature(docs), queryDocsSignature(docs));
    assert.equal(queryDocsSignature(docs), 'a:1|b:2');
  });

  it('changes when a document is updated', () => {
    assert.notEqual(
      queryDocsSignature([{ id: 'a', version: 1 }]),
      queryDocsSignature([{ id: 'a', version: 2 }]),
    );
  });

  it('treats an empty page as a blank signature', () => {
    assert.equal(queryDocsSignature([]), '');
  });
});
