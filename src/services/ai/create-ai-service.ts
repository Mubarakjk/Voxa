import {
  isAiGatewayConfiguredFromEnv,
} from '../../config/ai-gateway-env';
import { canUseDirectOpenAIClient, isReleaseAiEnvironment, resolveTalkAIProvider, TalkAIProvider } from '../../config/ai-routing';
import { hasOpenAIApiKey, getOpenAIApiKey } from '../../config/env';
import { IAIService } from '../contracts';
import { DevGatewayFallbackAIService } from './dev-gateway-fallback-ai-service';
import { FailSafeTalkAIService } from './fail-safe-talk-ai-service';
import { FakeAIService } from './fake-ai-service';
import { FallbackAIService } from './fallback-ai-service';
import { GatewayAIService } from './gateway-ai-service';
import { OpenAIService } from './openai-service';

export function resolveAppTalkAIProvider(): TalkAIProvider {
  return resolveTalkAIProvider({
    isRelease: isReleaseAiEnvironment(),
    hasOpenAIKey: hasOpenAIApiKey(),
    gatewayConfigured: isAiGatewayConfiguredFromEnv(),
  });
}

function createTalkAIService(provider: TalkAIProvider): IAIService {
  const offline = new FakeAIService();

  switch (provider) {
    case 'gateway': {
      const gateway = new GatewayAIService();
      if (canUseDirectOpenAIClient()) {
        const apiKey = getOpenAIApiKey();
        if (apiKey) {
          return new DevGatewayFallbackAIService(gateway, new OpenAIService({ apiKey }));
        }
      }
      return gateway;
    }
    case 'openai': {
      const apiKey = getOpenAIApiKey();
      if (!apiKey || !canUseDirectOpenAIClient()) {
        return new FailSafeTalkAIService();
      }
      return new FallbackAIService(new OpenAIService({ apiKey }), offline);
    }
    case 'fail-safe':
      return new FailSafeTalkAIService();
    case 'fake':
    default:
      return offline;
  }
}

/**
 * Core Talk uses the Supabase ai-gateway in preview/production.
 * Direct client OpenAI is development-only when explicitly configured.
 */
export function createAppAIService(override?: IAIService): IAIService {
  if (override) return override;
  return createTalkAIService(resolveAppTalkAIProvider());
}

export function isLiveAIEnabled(): boolean {
  const provider = resolveAppTalkAIProvider();
  return provider === 'gateway' || provider === 'openai';
}

export type AIProviderInfo = {
  label: 'Gateway' | 'OpenAI' | 'FakeAI' | 'Unavailable';
  isLive: boolean;
};

export function getAIProviderInfo(): AIProviderInfo {
  const provider = resolveAppTalkAIProvider();
  switch (provider) {
    case 'gateway':
      return { label: 'Gateway', isLive: true };
    case 'openai':
      return { label: 'OpenAI', isLive: true };
    case 'fail-safe':
      return { label: 'Unavailable', isLive: false };
    case 'fake':
    default:
      return { label: 'FakeAI', isLive: false };
  }
}
