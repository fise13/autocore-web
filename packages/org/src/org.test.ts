import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildInviteUrl, parseInviteTokenFromPath } from './invite-url';
import { emailsMatch, inviteCanBeAccepted, inviteRequiresEmailMatch, normalizeInviteStatus } from './invite-state';
import { OrgError } from './errors';

describe('buildInviteUrl', () => {
  it('builds canonical invite path', () => {
    assert.equal(buildInviteUrl('abc123', 'https://app.example.com'), 'https://app.example.com/invite/abc123');
  });
});

describe('parseInviteTokenFromPath', () => {
  it('parses /invite/{token}', () => {
    assert.equal(parseInviteTokenFromPath('/invite/abc123'), 'abc123');
  });

  it('parses legacy join query', () => {
    assert.equal(parseInviteTokenFromPath('/join?token=legacy'), 'legacy');
  });
});

describe('normalizeInviteStatus', () => {
  it('maps used to accepted', () => {
    assert.equal(
      normalizeInviteStatus({ used: true, expiresAt: new Date(Date.now() + 3600_000).toISOString() }),
      'accepted',
    );
  });

  it('detects expired pending', () => {
    assert.equal(
      normalizeInviteStatus({ used: false, expiresAt: new Date(Date.now() - 3600_000).toISOString() }),
      'expired',
    );
  });
});

describe('inviteCanBeAccepted', () => {
  it('allows only pending', () => {
    assert.equal(inviteCanBeAccepted('pending'), true);
    assert.equal(inviteCanBeAccepted('accepted'), false);
    assert.equal(inviteCanBeAccepted('expired'), false);
  });
});

describe('inviteRequiresEmailMatch', () => {
  it('flags mismatch when invite email differs', () => {
    assert.equal(inviteRequiresEmailMatch('a@b.com', 'c@d.com'), true);
    assert.equal(inviteRequiresEmailMatch('a@b.com', 'a@b.com'), false);
    assert.equal(inviteRequiresEmailMatch('', 'a@b.com'), false);
  });
});

describe('emailsMatch', () => {
  it('is case insensitive', () => {
    assert.equal(emailsMatch('A@B.com', 'a@b.com'), true);
  });
});

describe('OrgError', () => {
  it('exposes copy', () => {
    const err = new OrgError('invite_expired', 410);
    assert.equal(err.copy.title, 'Invite expired');
  });
});
