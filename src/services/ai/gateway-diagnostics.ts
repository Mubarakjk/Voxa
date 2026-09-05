import { getAiGatewayUrlFromEnv, isAiGatewayConfiguredFromEnv } from '../../config/ai-gateway-env';
import { isReleaseAiEnvironment, resolveTalkAIProvider } from '../../config/ai-routing';
import { getSupabaseAnonKey, hasOpenAIApiKey } from '../../config/env';
import { logFeature } from '../../utils/feature-logger';
import { classifyGatewayErrorMessage } from './talk-ai-errors';

export type GatewayDiagnostic = {
  provider: string;
  gatewayUrl?: string;
  hasSession: boolean;
  httpStatus?: number;
  gatewayCode?: string;
  sanitizedMessage: string;
};

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/functions/v1/ai-gateway`;
  } catch {
    return 'invalid-url';
  }
}

export function logGatewayDiagnostic(input: GatewayDiagnostic): void {
  const detail = [
    `provider=${input.provider}`,
    `gateway=${input.gatewayUrl ? maskUrl(input.gatewayUrl) : 'not-configured'}`,
    `session=${input.hasSession}`,
    input.httpStatus != null ? `status=${input.httpStatus}` : null,
    input.gatewayCode ? `code=${input.gatewayCode}` : null,
    `kind=${input.sanitizedMessage}`,
  ]
    .filter(Boolean)
    .join(' ');

  logFeature('chat.gateway', 'failure', detail);
}

export function resolveGatewayUrl(): string | undefined {
  return getAiGatewayUrlFromEnv();
}

export function getGatewayProviderLabel(): string {
  return resolveTalkAIProvider({
    isRelease: isReleaseAiEnvironment(),
    hasOpenAIKey: hasOpenAIApiKey(),
    gatewayConfigured: isAiGatewayConfiguredFromEnv(),
  });
}

export function sanitizeGatewayFailure(input: {
  httpStatus?: number;
  message?: string;
  code?: string;
}): { code: string; message: string } {
  const code = classifyGatewayErrorMessage(input.message ?? 'Gateway error', input.code);
  return {
    code,
    message: input.message ?? 'Gateway error',
  };
}

export function hasGatewayAnonKey(): boolean {
  return Boolean(getSupabaseAnonKey());
}
