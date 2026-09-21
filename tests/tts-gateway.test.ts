import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { resolveAppEnvironment } from '../src/config/ai-routing';
import { getOpenAIApiKey, hasOpenAIApiKey } from '../src/config/env';
import { isTtsGatewayConfiguredFromEnv } from '../src/config/tts-gateway-env';
import { VOICE_OPTIONS, getVoiceOption } from '../src/constants/voice-options';
import {
  ALLOWED_OPENAI_TTS_VOICES,
  TTS_ABUSE_LIMITS,
  allCatalogueOpenAiVoicesAreAllowlisted,
  clipTextForTtsGateway,
  openAiVoiceIdForOption,
  resolveAllowedTtsVoice,
  validateTtsText,
} from '../src/services/voice/tts-contract';

describe('server TTS contract + VoiceOption mapping', () => {
  it('every VoiceOptionId maps to an allowlisted OpenAI voice', () => {
    assert.equal(allCatalogueOpenAiVoicesAreAllowlisted(), true);
    for (const option of VOICE_OPTIONS) {
      assert.equal(resolveAllowedTtsVoice(option.openAiVoiceId), option.openAiVoiceId);
      assert.equal(openAiVoiceIdForOption(option.id), option.openAiVoiceId);
    }
  });

  it('matches known product → OpenAI mappings', () => {
    assert.equal(getVoiceOption('aurora').openAiVoiceId, 'nova');
    assert.equal(getVoiceOption('nova').openAiVoiceId, 'shimmer');
    assert.equal(getVoiceOption('atlas').openAiVoiceId, 'onyx');
    assert.equal(getVoiceOption('sage').openAiVoiceId, 'alloy');
  });

  it('Talk speech config helper maps selectedVoiceOptionId to openAiVoiceId', () => {
    const optionsSource = readFileSync(
      path.join(process.cwd(), 'src/services/voice/voice-options-service.ts'),
      'utf8',
    );
    const companionSource = readFileSync(
      path.join(process.cwd(), 'src/services/voice/companion-speech-service.ts'),
      'utf8',
    );
    assert.match(optionsSource, /resolveSpeechConfigForProfile/);
    assert.match(optionsSource, /getVoiceOption\(profile\.preferences\.selectedVoiceOptionId\)/);
    assert.match(optionsSource, /voiceOptionToSpeechConfig/);
    assert.match(companionSource, /resolveSpeechConfigForProfile\(profile\)/);
    assert.match(companionSource, /speakExclusive/);
  });

  it('rejects invalid / oversized TTS text and voices', () => {
    assert.equal(validateTtsText('').ok, false);
    assert.equal(validateTtsText('   ').ok, false);
    assert.equal(validateTtsText('Hello').ok, true);
    assert.equal(validateTtsText('x'.repeat(TTS_ABUSE_LIMITS.maxTextChars + 1)).ok, false);
    assert.equal(resolveAllowedTtsVoice('not-a-voice'), null);
    assert.equal(resolveAllowedTtsVoice('NOVA'), 'nova');
    assert.equal(clipTextForTtsGateway('x'.repeat(5000)).length, TTS_ABUSE_LIMITS.maxTextChars);
  });
});

describe('tts-gateway Edge Function security contracts', () => {
  const gatewaySource = readFileSync(
    path.join(process.cwd(), 'supabase/functions/tts-gateway/index.ts'),
    'utf8',
  );
  const guardSource = readFileSync(
    path.join(process.cwd(), 'supabase/functions/_shared/tts-guard.ts'),
    'utf8',
  );
  const clientSource = readFileSync(
    path.join(process.cwd(), 'src/services/voice/tts-gateway-client.ts'),
    'utf8',
  );
  const ttsServiceSource = readFileSync(
    path.join(process.cwd(), 'src/services/voice/text-to-speech-service.ts'),
    'utf8',
  );

  it('validates caller with anon + Authorization getUser (not service-role getUser jwt)', () => {
    assert.match(gatewaySource, /SUPABASE_ANON_KEY/);
    assert.match(gatewaySource, /userClient\.auth\.getUser\(\)/);
    assert.match(gatewaySource, /jsonError\(401,\s*'unauthorized'/);
    assert.match(gatewaySource, /jsonError\(401,\s*'invalid_session'/);
    assert.doesNotMatch(gatewaySource, /\.auth\.getUser\(\s*token\s*\)/);
  });

  it('keeps OPENAI_API_KEY server-side and never logs audio/base64', () => {
    assert.match(gatewaySource, /Deno\.env\.get\('OPENAI_API_KEY'\)/);
    assert.doesNotMatch(gatewaySource, /EXPO_PUBLIC_OPENAI/);
    assert.doesNotMatch(gatewaySource, /console\.(log|error|warn).*base64/i);
    assert.doesNotMatch(gatewaySource, /console\.(log|error|warn).*audioBytes/);
  });

  it('allowlists voices, caps text, rate-limits, and requires idempotency', () => {
    for (const voice of ALLOWED_OPENAI_TTS_VOICES) {
      assert.match(guardSource, new RegExp(`'${voice}'`));
    }
    assert.match(gatewaySource, /invalid_voice/);
    assert.match(gatewaySource, /validateTtsText/);
    assert.match(gatewaySource, /daily_limit/);
    assert.match(gatewaySource, /TTS_USAGE_METRIC/);
    assert.match(guardSource, /tts_requests/);
    assert.match(gatewaySource, /missing_idempotency_key/);
    assert.match(gatewaySource, /model:\s*TTS_OPENAI_MODEL/);
  });

  it('client sends Bearer user token + apikey anon; refreshes once on auth failure', () => {
    assert.match(clientSource, /Authorization:\s*`Bearer \$\{token\}`/);
    assert.match(clientSource, /apikey:\s*anonKey/);
    assert.match(clientSource, /forceRefresh:\s*true/);
    assert.match(clientSource, /isGatewayAuthFailure/);
  });

  it('production Hybrid TTS prefers tts-gateway over client OpenAI / silent expo substitution', () => {
    assert.match(ttsServiceSource, /isTtsGatewayConfiguredFromEnv/);
    assert.match(ttsServiceSource, /speakGateway/);
    assert.match(ttsServiceSource, /canUseDirectOpenAIClient/);
    assert.match(ttsServiceSource, /preferCloudTts/);
    assert.match(ttsServiceSource, /path === 'gateway'/);
    assert.match(ttsServiceSource, /await this\.speakGateway/);
  });

  it('edge allowlist stays in sync with client contract', () => {
    for (const voice of ALLOWED_OPENAI_TTS_VOICES) {
      assert.match(guardSource, new RegExp(`'${voice}'`));
    }
    assert.match(guardSource, /maxTextChars:\s*2_000/);
    assert.match(guardSource, /dailyRequestLimit:\s*60/);
  });
});

describe('production client must not use OpenAI TTS secrets', () => {
  it('strips client OpenAI key in production APP_ENV', () => {
    const prevEnv = process.env.EXPO_PUBLIC_APP_ENV;
    const prevKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    try {
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-must-not-be-used';
      assert.equal(resolveAppEnvironment('production', false), 'production');
      assert.equal(getOpenAIApiKey(), undefined);
      assert.equal(hasOpenAIApiKey(), false);
    } finally {
      if (prevEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
      else process.env.EXPO_PUBLIC_APP_ENV = prevEnv;
      if (prevKey === undefined) delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      else process.env.EXPO_PUBLIC_OPENAI_API_KEY = prevKey;
    }
  });

  it('tts gateway URL helper is defined', () => {
    assert.equal(typeof isTtsGatewayConfiguredFromEnv(), 'boolean');
  });
});
