import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { resolveAppEnvironment } from '../src/config/ai-routing';
import {
  getACRCloudConfig,
  getAudDApiToken,
  getOpenAIApiKey,
  hasOpenAIApiKey,
} from '../src/config/env';
import { STORAGE_KEYS } from '../src/constants/storage-keys';

describe('release client secret / session isolation guards', () => {
  const previous: Record<string, string | undefined> = {};
  const KEYS = [
    'EXPO_PUBLIC_APP_ENV',
    'EXPO_PUBLIC_OPENAI_API_KEY',
    'EXPO_PUBLIC_AUDD_API_TOKEN',
    'EXPO_PUBLIC_ACRCLOUD_HOST',
    'EXPO_PUBLIC_ACRCLOUD_ACCESS_KEY',
    'EXPO_PUBLIC_ACRCLOUD_ACCESS_SECRET',
  ] as const;

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it('strips OpenAI / AudD / ACRCloud client secrets in production APP_ENV', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-test-should-not-leak';
    process.env.EXPO_PUBLIC_AUDD_API_TOKEN = 'audd-token';
    process.env.EXPO_PUBLIC_ACRCLOUD_HOST = 'identify.example.com';
    process.env.EXPO_PUBLIC_ACRCLOUD_ACCESS_KEY = 'ak';
    process.env.EXPO_PUBLIC_ACRCLOUD_ACCESS_SECRET = 'as';

    assert.equal(resolveAppEnvironment('production', false), 'production');
    assert.equal(getOpenAIApiKey(), undefined);
    assert.equal(hasOpenAIApiKey(), false);
    assert.equal(getAudDApiToken(), undefined);
    assert.equal(getACRCloudConfig(), null);
  });

  it('still exposes OpenAI key in development for local tooling', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'sk-dev-only';
    assert.equal(getOpenAIApiKey(), 'sk-dev-only');
  });

  it('includes chat bookmarks in STORAGE_KEYS so logout clears them', () => {
    assert.equal(STORAGE_KEYS.chatBookmarks, '@voxa/chat_bookmarks');
    assert.ok(Object.values(STORAGE_KEYS).includes('@voxa/chat_bookmarks'));
  });
});
