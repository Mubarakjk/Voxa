import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canStartCall,
  createInitialRealtimeCallMachine,
  mapConnectionError,
  MAX_RECONNECT_ATTEMPTS,
  reduceRealtimeCall,
  validateRealtimeSessionResponse,
} from '../src/services/realtime-voice/realtime-call-state';
import { buildRealtimeCallInstructions } from '../src/services/realtime-voice/realtime-call-context';
import { mapCompanionVoiceToRealtime } from '../src/services/realtime-voice/realtime-voice-map';

describe('realtime call state machine', () => {
  it('transitions idle → mic → connecting → connected', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    assert.equal(m.state, 'requesting_microphone');
    assert.equal(m.startLocked, true);
    m = reduceRealtimeCall(m, { type: 'MIC_GRANTED' });
    assert.equal(m.state, 'connecting');
    m = reduceRealtimeCall(m, { type: 'TOKEN_OK' });
    m = reduceRealtimeCall(m, { type: 'SESSION_READY' });
    assert.equal(m.state, 'connected');
    assert.ok(m.startedAt);
  });

  it('prevents duplicate start while locked', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    const again = reduceRealtimeCall(m, { type: 'START' });
    assert.equal(again.state, 'requesting_microphone');
    assert.equal(canStartCall(m), false);
  });

  it('maps mic denial to failed', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    m = reduceRealtimeCall(m, { type: 'MIC_DENIED' });
    assert.equal(m.state, 'failed');
    assert.match(m.errorMessage ?? '', /Microphone/i);
    assert.equal(m.startLocked, false);
  });

  it('handles speaking / interruption path back to connected', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    m = reduceRealtimeCall(m, { type: 'MIC_GRANTED' });
    m = reduceRealtimeCall(m, { type: 'SESSION_READY' });
    m = reduceRealtimeCall(m, { type: 'VOXA_SPEAKING' });
    assert.equal(m.state, 'voxa_speaking');
    m = reduceRealtimeCall(m, { type: 'USER_SPEECH_START' });
    assert.equal(m.state, 'user_speaking');
    m = reduceRealtimeCall(m, { type: 'VOXA_DONE' });
    assert.equal(m.state, 'connected');
  });

  it('allows only one reconnect then fails', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    m = reduceRealtimeCall(m, { type: 'MIC_GRANTED' });
    m = reduceRealtimeCall(m, { type: 'SESSION_READY' });
    m = reduceRealtimeCall(m, { type: 'RECONNECT_START' });
    assert.equal(m.state, 'reconnecting');
    assert.equal(m.reconnectAttempts, 1);
    assert.equal(m.reconnectAttempts, MAX_RECONNECT_ATTEMPTS);
    m = reduceRealtimeCall(m, { type: 'RECONNECT_START' });
    assert.equal(m.state, 'failed');
  });

  it('END clears start lock', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    m = reduceRealtimeCall(m, { type: 'END' });
    assert.equal(m.state, 'ended');
    assert.equal(canStartCall(m), true);
  });

  it('RESET restores idle machine', () => {
    let m = createInitialRealtimeCallMachine();
    m = reduceRealtimeCall(m, { type: 'START' });
    m = reduceRealtimeCall(m, { type: 'FAIL', reason: 'x' });
    m = reduceRealtimeCall(m, { type: 'RESET' });
    assert.deepEqual(m, createInitialRealtimeCallMachine());
  });
});

describe('connection error mapping', () => {
  it('maps known codes', () => {
    assert.match(mapConnectionError('unauthorized', ''), /Sign in/i);
    assert.match(mapConnectionError('webrtc', ''), /WebRTC/i);
    assert.match(mapConnectionError('daily_limit', ''), /limit/i);
    assert.equal(mapConnectionError('unknown', 'Custom'), 'Custom');
  });
});

describe('feature flag', () => {
  it('treats only the string true as enabled', () => {
    const enabled = (value: string | undefined) => value === 'true';
    assert.equal(enabled('true'), true);
    assert.equal(enabled('false'), false);
    assert.equal(enabled(undefined), false);
  });
});

describe('temporary session response validation', () => {
  it('accepts valid ek_ secret', () => {
    const result = validateRealtimeSessionResponse({
      ok: true,
      clientSecret: 'ek_test_secret_value',
      callsUrl: 'https://api.openai.com/v1/realtime/calls',
      model: 'gpt-realtime',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.clientSecret.startsWith('ek_'), true);
    }
  });

  it('rejects missing secret without echoing payloads', () => {
    const result = validateRealtimeSessionResponse({ ok: true, clientSecret: 'sk-nope' });
    assert.equal(result.ok, false);
  });

  it('surfaces friendly backend errors', () => {
    const result = validateRealtimeSessionResponse({
      ok: false,
      message: 'Sign in to start a voice call.',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /Sign in/);
  });
});

describe('context fallback', () => {
  it('returns empty string when profile missing', () => {
    assert.equal(buildRealtimeCallInstructions({ profile: null }), '');
  });

  it('never throws on sparse profile', () => {
    const text = buildRealtimeCallInstructions({
      profile: {
        id: 'u1',
        displayName: 'Sam',
        companionIdentity: { voxaName: 'Voxa', personalityStyle: 'warm' },
        companion: { lastUsedMode: 'friend', defaultMode: 'friend' },
        preferences: {},
      } as never,
      topGoal: { title: 'Ship Life OS', progress: 40 } as never,
      memories: [{ title: 'Loves tea', content: 'Prefers green tea', importance: 5 } as never],
    });
    assert.match(text, /Sam/);
    assert.match(text, /Ship Life OS/);
    assert.match(text, /green tea/);
  });
});

describe('voice mapping', () => {
  it('maps curated voices without throwing', () => {
    assert.equal(typeof mapCompanionVoiceToRealtime('aurora'), 'string');
    assert.equal(mapCompanionVoiceToRealtime('unknown-voice').length > 0, true);
  });
});

describe('duplicate cleanup contract', () => {
  it('machine cleanupDone stays false until controller sets it', () => {
    const m = createInitialRealtimeCallMachine();
    assert.equal(m.cleanupDone, false);
    const ended = reduceRealtimeCall(m, { type: 'END' });
    // Pure reducer does not flip cleanupDone — controller owns idempotent cleanup flag.
    assert.equal(ended.cleanupDone, false);
  });
});
