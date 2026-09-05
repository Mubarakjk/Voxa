import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { AuthError } from '@supabase/supabase-js';

import { resolveAppEnvironment, resolveTalkAIProvider } from '../src/config/ai-routing';
import { containsLegalPlaceholderCopy, PRIVACY_POLICY_SECTIONS, TERMS_OF_SERVICE_SECTIONS } from '../src/constants/legal-content';
import { formatAuthUserError } from '../src/utils/auth-error-copy';
import { formatTalkErrorForUser } from '../src/services/ai/talk-ai-errors';
import { friendlyErrorMessage } from '../src/utils/friendly-error';

describe('V1 stability release guards', () => {
  it('store binaries without APP_ENV fail closed to production, not development', () => {
    assert.equal(resolveAppEnvironment(undefined, false), 'production');
    assert.equal(resolveAppEnvironment('', false), 'production');
    assert.equal(resolveAppEnvironment('staging', false), 'production');
    assert.equal(resolveAppEnvironment(undefined, true), 'development');
    assert.equal(resolveAppEnvironment('production', true), 'production');
  });

  it('release Talk without a gateway never uses FakeAI or client OpenAI', () => {
    assert.equal(
      resolveTalkAIProvider({ isRelease: true, hasOpenAIKey: true, gatewayConfigured: false }),
      'fail-safe',
    );
    assert.equal(
      resolveTalkAIProvider({ isRelease: true, hasOpenAIKey: false, gatewayConfigured: false }),
      'fail-safe',
    );
  });

  it('auth errors never surface JWT, fetch, or postgres internals', () => {
    const jwt = new AuthError('Invalid JWT');
    const fetchErr = new AuthError('Failed to fetch');
    const postgres = new AuthError('relation "profiles" does not exist');
    assert.equal(formatAuthUserError(jwt, 'fallback'), 'fallback');
    assert.equal(formatAuthUserError(fetchErr, 'fallback'), 'fallback');
    assert.equal(formatAuthUserError(postgres, 'fallback'), 'fallback');
    assert.equal(
      formatAuthUserError(new AuthError('Invalid login credentials'), 'fallback'),
      'Email or password is incorrect.',
    );
  });

  it('talk errors never include gateway or function internals', () => {
    const message = formatTalkErrorForUser(new Error('Requested function was not found'));
    assert.ok(!/function|supabase|postgres|json|stack/i.test(message));
  });

  it('legal copy still has no developer placeholder instructions', () => {
    const combined = [...PRIVACY_POLICY_SECTIONS, ...TERMS_OF_SERVICE_SECTIONS]
      .map((section) => `${section.title} ${section.body}`)
      .join('\n');
    assert.equal(containsLegalPlaceholderCopy(combined), false);
  });

  it('fail-safe Talk errors stay user-facing', () => {
    const message = formatTalkErrorForUser(
      new Error(
        'AI is unavailable in this build. Sign in with Supabase and configure the server AI gateway before using Talk.',
      ),
    );
    assert.ok(!/supabase|gateway|json|stack/i.test(message));
  });

  it('preview/production EAS env does not enable mock weather or client OpenAI', () => {
    const eas = JSON.parse(readFileSync(join(process.cwd(), 'eas.json'), 'utf8')) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    for (const profile of ['preview', 'production'] as const) {
      const env = eas.build[profile]?.env ?? {};
      assert.equal(env.EXPO_PUBLIC_OPENAI_API_KEY, undefined);
      assert.notEqual(env.EXPO_PUBLIC_WEATHER_PROVIDER, 'mock');
      assert.equal(env.EXPO_PUBLIC_APP_ENV, profile);
    }
  });

  it('startup error formatter does not leak backend internals when not in Metro __DEV__', () => {
    const message = friendlyErrorMessage(new Error('JWT expired relation "profiles"'), 'Unable to start Voxa.');
    assert.equal(message, 'Unable to start Voxa.');
  });

  it('top-level error boundary is production-safe', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/ui/app-error-boundary.tsx'), 'utf8');
    assert.match(source, /Something went wrong/);
    assert.match(source, /onRetry=\{this\.handleRetry\}/);
    assert.match(source, /Intentionally empty/);
    assert.ok(!source.includes('componentStack'));
    assert.ok(!source.includes('error.stack'));
  });
});
