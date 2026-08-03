import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { getReleaseVoiceGateSnapshot } from '../src/config/release-voice';

const KEYS = [
  'EXPO_PUBLIC_REALTIME_VOICE_ENABLED',
  'EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED',
  'EXPO_PUBLIC_VOICE_NOTES_ENABLED',
  'EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED',
] as const;

describe('release voice gates', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it('defaults all calling / mic gates to false', () => {
    const snap = getReleaseVoiceGateSnapshot();
    assert.equal(snap.realtimeVoice, false);
    assert.equal(snap.scheduledCalls, false);
    assert.equal(snap.voiceNotes, false);
    assert.equal(snap.microphoneChat, false);
  });

  it('enables only when env is the string true', () => {
    process.env.EXPO_PUBLIC_REALTIME_VOICE_ENABLED = 'true';
    process.env.EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED = '1';
    assert.equal(getReleaseVoiceGateSnapshot().realtimeVoice, true);
    assert.equal(getReleaseVoiceGateSnapshot().scheduledCalls, false);
  });
});
