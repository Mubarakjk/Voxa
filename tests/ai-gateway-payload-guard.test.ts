import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ABUSE_LIMITS,
  validateChatPayloadSize,
} from '../supabase/functions/_shared/usage-guard.ts';

describe('ai-gateway payload guard', () => {
  it('allows a small smoke-test payload', () => {
    const result = validateChatPayloadSize([
      { role: 'system', content: 'You are Voxa.' },
      { role: 'user', content: 'Reply with exactly: gateway-ok' },
    ]);
    assert.deepEqual(result, { allowed: true });
  });

  it('returns message_too_large for an oversized user turn', () => {
    const result = validateChatPayloadSize([
      { role: 'system', content: 'You are Voxa.' },
      { role: 'user', content: 'x'.repeat(ABUSE_LIMITS.maxUserMessageChars + 1) },
    ]);
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, 'message_too_large');
    }
  });

  it('returns context_too_large when history/system exceeds the context budget', () => {
    const result = validateChatPayloadSize([
      { role: 'system', content: 's'.repeat(ABUSE_LIMITS.maxContextPayloadChars + 1) },
      { role: 'user', content: 'hello' },
    ]);
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, 'context_too_large');
    }
  });
});
