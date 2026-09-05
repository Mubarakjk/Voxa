import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDataSourceModeLabel } from '../src/config/env';
import {
  containsLegalPlaceholderCopy,
  PRIVACY_POLICY_SECTIONS,
  TERMS_OF_SERVICE_SECTIONS,
} from '../src/constants/legal-content';
import { getReleaseVoiceGateSnapshot } from '../src/config/release-voice';
import { isExperimentalFeaturesEnabled, isFeatureVisible } from '../src/config/feature-status';

describe('P5 ship prep', () => {
  it('uses human data storage labels instead of infrastructure names', () => {
    const label = getDataSourceModeLabel();
    assert.ok(!label.toLowerCase().includes('supabase'));
    assert.ok(label === 'Cloud sync' || label === 'On this device');
  });

  it('legal screens contain no developer placeholder copy', () => {
    const combined = [...PRIVACY_POLICY_SECTIONS, ...TERMS_OF_SERVICE_SECTIONS]
      .map((section) => `${section.title} ${section.body}`)
      .join('\n');
    assert.equal(containsLegalPlaceholderCopy(combined), false);
    assert.ok(!combined.toLowerCase().includes('before app store submission'));
  });

  it('release voice gates stay disabled without explicit env true', () => {
    const snap = getReleaseVoiceGateSnapshot();
    assert.equal(snap.realtimeVoice, false);
    assert.equal(snap.scheduledCalls, false);
    assert.equal(snap.voiceNotes, false);
    assert.equal(snap.microphoneChat, false);
  });

  it('experimental voice and hidden features stay off in production config', () => {
    assert.equal(isExperimentalFeaturesEnabled(), false);
    assert.equal(isFeatureVisible('voiceCall'), false);
    assert.equal(isFeatureVisible('safeCall'), false);
    assert.equal(isFeatureVisible('musicRecognition'), false);
    assert.equal(isFeatureVisible('voiceNote'), false);
  });
});
