import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  getAiGatewayUrlFromEnv,
  isAiGatewayConfiguredFromEnv,
} from '../src/config/ai-gateway-env';
import {
  canUseDirectOpenAIClient,
  getAppEnvironment,
  isReleaseAiEnvironment,
  resolveAppEnvironment,
  resolveTalkAIProvider,
} from '../src/config/ai-routing';
import {
  areAllFeaturesUnlocked,
  isFreeLaunchMode,
} from '../src/config/launch-mode';
import { getReleaseVoiceGateSnapshot } from '../src/config/release-voice';

const ENV_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_AI_GATEWAY_URL',
  'EXPO_PUBLIC_FREE_LAUNCH_MODE',
] as const;

function resolveAppTalkAIProviderFromEnv() {
  return resolveTalkAIProvider({
    isRelease: isReleaseAiEnvironment(),
    hasOpenAIKey: Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim()),
    gatewayConfigured: isAiGatewayConfiguredFromEnv(),
  });
}

describe('AI gateway routing', () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  function configureGateway() {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  }

  it('treats preview and production as release AI environments', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    assert.equal(isReleaseAiEnvironment(), true);
    assert.equal(canUseDirectOpenAIClient(), false);

    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    assert.equal(isReleaseAiEnvironment(), true);
    assert.equal(canUseDirectOpenAIClient(), false);
  });

  it('allows direct OpenAI only in development', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    assert.equal(getAppEnvironment(), 'development');
    assert.equal(canUseDirectOpenAIClient(), true);
  });

  it('preview cannot use direct OpenAI even with a client key', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test';

    assert.equal(
      resolveTalkAIProvider({
        isRelease: true,
        hasOpenAIKey: true,
        gatewayConfigured: false,
      }),
      'fail-safe',
    );
    assert.equal(resolveAppTalkAIProviderFromEnv(), 'fail-safe');
  });

  it('production cannot use direct OpenAI even with a client key', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test';

    assert.equal(
      resolveTalkAIProvider({
        isRelease: true,
        hasOpenAIKey: true,
        gatewayConfigured: false,
      }),
      'fail-safe',
    );
    assert.equal(resolveAppTalkAIProviderFromEnv(), 'fail-safe');
  });

  it('selects gateway in preview when Supabase is configured', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    configureGateway();

    assert.equal(resolveAppTalkAIProviderFromEnv(), 'gateway');
    assert.equal(
      resolveTalkAIProvider({
        isRelease: true,
        hasOpenAIKey: false,
        gatewayConfigured: true,
      }),
      'gateway',
    );
  });

  it('derives gateway URL from Supabase when explicit URL is absent', () => {
    configureGateway();
    delete process.env.EXPO_PUBLIC_AI_GATEWAY_URL;

    assert.equal(getAiGatewayUrlFromEnv(), 'https://example.supabase.co/functions/v1/ai-gateway');
    assert.equal(isAiGatewayConfiguredFromEnv(), true);
  });

  it('development uses FakeAI when no gateway and no OpenAI key', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    assert.equal(resolveAppTalkAIProviderFromEnv(), 'fake');
  });

  it('development can use direct OpenAI when a key is configured', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test';
    assert.equal(resolveAppTalkAIProviderFromEnv(), 'openai');
  });

  it('development prefers gateway when Supabase gateway is configured', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test';
    configureGateway();
    assert.equal(resolveAppTalkAIProviderFromEnv(), 'gateway');
  });

  it('free launch mode remains unchanged', () => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    assert.equal(isFreeLaunchMode(), true);
    assert.equal(areAllFeaturesUnlocked(), true);
  });

  it('voice and realtime gates remain disabled by default', () => {
    const snap = getReleaseVoiceGateSnapshot();
    assert.equal(snap.realtimeVoice, false);
    assert.equal(snap.scheduledCalls, false);
    assert.equal(snap.voiceNotes, false);
    assert.equal(snap.microphoneChat, false);
  });

  it('missing APP_ENV on a store binary is production (fail closed)', () => {
    assert.equal(resolveAppEnvironment(undefined, false), 'production');
    assert.equal(
      resolveTalkAIProvider({ isRelease: true, hasOpenAIKey: true, gatewayConfigured: false }),
      'fail-safe',
    );
  });
});
