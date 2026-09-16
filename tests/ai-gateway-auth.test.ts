import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import path from 'node:path';

import { isGatewayAuthFailure } from '../src/services/ai/ai-gateway-auth';

describe('AI gateway auth helpers', () => {
  it('treats HTTP 401 as an auth failure eligible for one refresh retry', () => {
    assert.equal(isGatewayAuthFailure(401, undefined), true);
    assert.equal(isGatewayAuthFailure(401, 'invalid_session'), true);
  });

  it('treats known auth codes as auth failures even without 401', () => {
    assert.equal(isGatewayAuthFailure(403, 'invalid_session'), true);
    assert.equal(isGatewayAuthFailure(400, 'not_authenticated'), true);
    assert.equal(isGatewayAuthFailure(400, 'unauthorized'), true);
  });

  it('does not treat provider/network failures as auth failures', () => {
    assert.equal(isGatewayAuthFailure(500, 'gateway_error'), false);
    assert.equal(isGatewayAuthFailure(429, 'rate_limited'), false);
    assert.equal(isGatewayAuthFailure(503, 'provider_error'), false);
    assert.equal(isGatewayAuthFailure(404, 'gateway_not_deployed'), false);
    assert.equal(isGatewayAuthFailure(undefined, undefined), false);
  });
});

describe('ai-gateway client auth recovery (source contract)', () => {
  const clientSource = readFileSync(
    path.join(process.cwd(), 'src/services/ai/ai-gateway-client.ts'),
    'utf8',
  );

  it('clears token cache and force-refreshes at most once on auth failure', () => {
    assert.match(clientSource, /clearGatewayAccessTokenCache/);
    assert.match(clientSource, /forceRefresh:\s*true/);
    assert.match(clientSource, /isGatewayAuthFailure/);
    assert.match(clientSource, /gateway-http-retry/);
    // Exactly one retry path — no while/for retry loops.
    assert.doesNotMatch(clientSource, /while\s*\(\s*.*isGatewayAuthFailure/);
  });

  it('sends Authorization Bearer with the user access token (not the anon key)', () => {
    assert.match(clientSource, /Authorization:\s*`Bearer \$\{token\}`/);
    assert.match(clientSource, /apikey:\s*anonKey/);
  });
});

describe('ai-gateway Edge Function auth pattern', () => {
  const gatewaySource = readFileSync(
    path.join(process.cwd(), 'supabase/functions/ai-gateway/index.ts'),
    'utf8',
  );

  it('validates the caller with anon key + Authorization header (not service-role getUser(jwt))', () => {
    assert.match(gatewaySource, /SUPABASE_ANON_KEY/);
    assert.match(
      gatewaySource,
      /createClient\(supabaseUrl,\s*anonKey,\s*\{[\s\S]*Authorization:\s*authHeader/,
    );
    assert.match(gatewaySource, /userClient\.auth\.getUser\(\)/);
    // Must not pass the user JWT into service-role getUser(token).
    assert.doesNotMatch(gatewaySource, /\.auth\.getUser\(\s*token\s*\)/);
    assert.doesNotMatch(gatewaySource, /\.auth\.getUser\(\s*[^)]*replace\(/);
  });

  it('keeps service-role for privileged DB work after auth', () => {
    assert.match(gatewaySource, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(gatewaySource, /createClient\(supabaseUrl,\s*serviceKey\)/);
  });

  it('still returns 401 invalid_session when getUser fails', () => {
    assert.match(gatewaySource, /invalid_session/);
    assert.match(gatewaySource, /jsonError\(401,\s*'invalid_session'/);
  });
});
