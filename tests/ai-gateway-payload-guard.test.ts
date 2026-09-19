import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ABUSE_LIMITS,
  textCharsFromContent,
  validateChatPayloadSize,
  validateGatewayMessageContent,
  validateVisionImageDataUrl,
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

  it('counts only text characters for multipart user turns', () => {
    const tiny = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const result = validateChatPayloadSize([
      { role: 'system', content: 'You are Voxa.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'hello' },
          { type: 'image_url', image_url: { url: tiny } },
        ],
      },
    ]);
    assert.deepEqual(result, { allowed: true });
    assert.equal(
      textCharsFromContent([
        { type: 'text', text: 'hello' },
        { type: 'image_url', image_url: { url: tiny } },
      ]),
      5,
    );
  });

  it('rejects multipart on non-user roles during payload validation', () => {
    const tiny = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const result = validateChatPayloadSize([
      {
        role: 'system',
        content: [
          { type: 'text', text: 'nope' },
          { type: 'image_url', image_url: { url: tiny } },
        ],
      },
      { role: 'user', content: 'hi' },
    ]);
    assert.equal(result.allowed, false);
  });

  it('rejects invalid vision data URLs in message content validation', () => {
    assert.equal(validateVisionImageDataUrl('https://evil.example/a.png').allowed, false);
    assert.equal(validateGatewayMessageContent('user', 'ok').ok, true);
  });
});
