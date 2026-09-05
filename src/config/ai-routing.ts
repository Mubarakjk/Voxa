export type AppEnvironment = 'development' | 'preview' | 'production';

export type TalkAIProvider = 'gateway' | 'openai' | 'fake' | 'fail-safe';

/**
 * Missing/unknown APP_ENV must not treat a store binary as development
 * (that would allow FakeAI / direct OpenAI). Metro/tests keep development.
 */
export function resolveAppEnvironment(
  envValue: string | undefined,
  isDevClient: boolean,
): AppEnvironment {
  const env = envValue?.trim();
  if (env === 'preview' || env === 'production' || env === 'development') return env;
  return isDevClient ? 'development' : 'production';
}

export function getAppEnvironment(): AppEnvironment {
  const isDevClient = typeof __DEV__ === 'undefined' ? true : __DEV__;
  return resolveAppEnvironment(process.env.EXPO_PUBLIC_APP_ENV, isDevClient);
}

export function isReleaseAiEnvironment(): boolean {
  const env = getAppEnvironment();
  return env === 'preview' || env === 'production';
}

/** Direct client OpenAI is allowed only outside preview/production builds. */
export function canUseDirectOpenAIClient(): boolean {
  return !isReleaseAiEnvironment();
}

export function resolveTalkAIProvider(input: {
  isRelease: boolean;
  hasOpenAIKey: boolean;
  gatewayConfigured: boolean;
}): TalkAIProvider {
  if (input.isRelease) {
    return input.gatewayConfigured ? 'gateway' : 'fail-safe';
  }

  if (input.gatewayConfigured) {
    return 'gateway';
  }

  if (input.hasOpenAIKey) {
    return 'openai';
  }

  return 'fake';
}
