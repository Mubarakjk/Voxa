import { hasOpenAIApiKey, getOpenAIApiKey } from '../../config/env';
import { shouldPreferAiGateway, isAiGatewayConfigured } from '../billing/billing-validation';
import { IAIService } from '../contracts';
import { FakeAIService } from './fake-ai-service';
import { FallbackAIService } from './fallback-ai-service';
import { OpenAIService } from './openai-service';

/**
 * Chat and companion flows use OpenAI when a key is configured,
 * with FakeAIService as the offline default and error fallback.
 */
export function createAppAIService(override?: IAIService): IAIService {
  if (override) return override;

  const fallback = new FakeAIService();
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return fallback;
  }

  if (shouldPreferAiGateway() && !isAiGatewayConfigured()) {
    console.warn('[Voxa AI] Production prefers server gateway but EXPO_PUBLIC_AI_GATEWAY_URL is not configured.');
  }

  return new FallbackAIService(new OpenAIService({ apiKey }), fallback);
}

export function isLiveAIEnabled(): boolean {
  return hasOpenAIApiKey();
}

export type AIProviderInfo = {
  label: 'OpenAI' | 'FakeAI';
  isLive: boolean;
};

export function getAIProviderInfo(): AIProviderInfo {
  const isLive = hasOpenAIApiKey();
  return { label: isLive ? 'OpenAI' : 'FakeAI', isLive };
}
