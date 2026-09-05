import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ONBOARDING_REASON_OPTIONS,
  ONBOARDING_STEPS,
  MAX_ONBOARDING_REASONS,
  buildOnboardingReasonContext,
  clampOnboardingStepIndex,
  isOnboardingReasonDisabled,
  normalizeOnboardingReasons,
  resolvePrimaryOnboardingReason,
  resolvePersonalityChoice,
  toggleOnboardingReason,
  validateOnboardingBasics,
  validateOnboardingReason,
  validateOnboardingReasons,
} from '../src/config/onboarding-flow';
import {
  areAllFeaturesUnlocked,
  isFreeLaunchMode,
} from '../src/config/launch-mode';
import { getReleaseVoiceGateSnapshot } from '../src/config/release-voice';

describe('onboarding flow', () => {
  it('uses five meaningful screens', () => {
    assert.deepEqual(ONBOARDING_STEPS, [
      'welcome',
      'basics',
      'createVoxa',
      'reason',
      'meetVoxa',
    ]);
  });

  it('requires a display name on basics', () => {
    assert.equal(validateOnboardingBasics(''), 'Please enter what Voxa should call you.');
    assert.equal(validateOnboardingBasics('   '), 'Please enter what Voxa should call you.');
    assert.equal(validateOnboardingBasics('Sam'), null);
  });

  it('requires at least one reason before completion', () => {
    assert.equal(validateOnboardingReasons([]), 'Choose at least one area for Voxa to help with.');
    assert.equal(validateOnboardingReasons(['Reach my goals']), null);
    assert.equal(validateOnboardingReason('Reach my goals'), null);
  });

  it('supports selecting up to three reasons', () => {
    let selected = toggleOnboardingReason([], 'Reach my goals');
    selected = toggleOnboardingReason(selected, 'Build better habits');
    selected = toggleOnboardingReason(selected, 'Study / career');
    assert.equal(selected.length, 3);
    assert.equal(validateOnboardingReasons(selected), null);

    const blocked = toggleOnboardingReason(selected, 'Have someone to talk to');
    assert.deepEqual(blocked, selected);
    assert.equal(isOnboardingReasonDisabled(selected, 'Have someone to talk to'), true);
    assert.equal(isOnboardingReasonDisabled(selected, 'Reach my goals'), false);
  });

  it('allows deselecting a chosen reason', () => {
    const selected = toggleOnboardingReason(
      toggleOnboardingReason([], 'Reach my goals'),
      'Build better habits',
    );
    const deselected = toggleOnboardingReason(selected, 'Reach my goals');
    assert.deepEqual(deselected, ['Build better habits']);
  });

  it('keeps the first selection as the primary reason', () => {
    const selected = normalizeOnboardingReasons([
      'Build better habits',
      'Reach my goals',
      'Study / career',
    ]);
    assert.equal(resolvePrimaryOnboardingReason(selected), 'Build better habits');
  });

  it('builds prompt context from goalInterests with mainReason fallback', () => {
    assert.deepEqual(
      buildOnboardingReasonContext({
        mainReason: 'Reach my goals',
        goalInterests: ['Build better habits', 'Study / career'],
      }),
      ['Build better habits', 'Study / career'],
    );
    assert.deepEqual(
      buildOnboardingReasonContext({ mainReason: 'Reach my goals' }),
      ['Reach my goals'],
    );
  });

  it('enforces the three-reason maximum when normalizing', () => {
    const normalized = normalizeOnboardingReasons([
      'Reach my goals',
      'Build better habits',
      'Study / career',
      'Have someone to talk to',
    ]);
    assert.equal(normalized.length, MAX_ONBOARDING_REASONS);
  });

  it('maps concise personality choices to companion settings', () => {
    assert.deepEqual(resolvePersonalityChoice('warm'), {
      personalityStyle: 'warm',
      voicePersonality: 'warm_calm',
    });
    assert.deepEqual(resolvePersonalityChoice('energetic'), {
      personalityStyle: 'motivational',
      voicePersonality: 'energetic',
    });
    assert.deepEqual(resolvePersonalityChoice('calm'), {
      personalityStyle: 'reflective',
      voicePersonality: 'gentle',
    });
    assert.deepEqual(resolvePersonalityChoice('direct'), {
      personalityStyle: 'direct',
      voicePersonality: 'direct',
    });
  });

  it('offers six broad reason options', () => {
    assert.equal(ONBOARDING_REASON_OPTIONS.length, 6);
    assert.ok(ONBOARDING_REASON_OPTIONS.includes('Have someone to talk to'));
    assert.ok(ONBOARDING_REASON_OPTIONS.includes('Study / career'));
  });

  it('clamps legacy draft step indices to the shortened flow', () => {
    assert.equal(clampOnboardingStepIndex(-1), 0);
    assert.equal(clampOnboardingStepIndex(99), ONBOARDING_STEPS.length - 1);
    assert.equal(clampOnboardingStepIndex(12), 4);
  });

  it('keeps free launch mode enabled by default', () => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    assert.equal(isFreeLaunchMode(), true);
    assert.equal(areAllFeaturesUnlocked(), true);
  });

  it('keeps voice and realtime release gates disabled by default', () => {
    delete process.env.EXPO_PUBLIC_REALTIME_VOICE_ENABLED;
    delete process.env.EXPO_PUBLIC_SCHEDULED_CALLS_ENABLED;
    delete process.env.EXPO_PUBLIC_VOICE_NOTES_ENABLED;
    delete process.env.EXPO_PUBLIC_MICROPHONE_CHAT_ENABLED;

    const snap = getReleaseVoiceGateSnapshot();
    assert.equal(snap.realtimeVoice, false);
    assert.equal(snap.scheduledCalls, false);
    assert.equal(snap.voiceNotes, false);
    assert.equal(snap.microphoneChat, false);
  });
});
