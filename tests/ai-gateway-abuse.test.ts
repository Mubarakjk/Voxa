import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkUsageAllowance,
  resolveAiGatewayMetric,
} from '../supabase/functions/_shared/usage-guard.ts';

describe('AI gateway usage / abuse guards', () => {
  it('allowlists only ai_messages for the chat gateway', () => {
    assert.equal(resolveAiGatewayMetric(undefined), 'ai_messages');
    assert.equal(resolveAiGatewayMetric('ai_messages'), 'ai_messages');
    assert.equal(resolveAiGatewayMetric('voice_notes'), null);
    assert.equal(resolveAiGatewayMetric('totally_fake_metric'), null);
    assert.equal(resolveAiGatewayMetric(''), null);
  });

  it('fails closed when entitlement limits are missing (no unlimited OpenAI)', () => {
    const result = checkUsageAllowance({
      plan: 'free',
      metric: 'ai_messages',
      amount: 1,
      dailyUsed: 0,
      monthlyUsed: 0,
      limits: {
        plan: 'free',
        metric: 'ai_messages',
        dailyLimit: null,
        monthlyLimit: null,
        fairUseLimit: null,
      },
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, 'limits_unavailable');
    }
  });

  it('enforces free daily limit when configured', () => {
    const result = checkUsageAllowance({
      plan: 'free',
      metric: 'ai_messages',
      amount: 1,
      dailyUsed: 20,
      monthlyUsed: 20,
      limits: {
        plan: 'free',
        metric: 'ai_messages',
        dailyLimit: 20,
        monthlyLimit: 200,
        fairUseLimit: null,
      },
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, 'daily_limit');
    }
  });

  it('allows free traffic under the daily and monthly caps', () => {
    const result = checkUsageAllowance({
      plan: 'free',
      metric: 'ai_messages',
      amount: 1,
      dailyUsed: 3,
      monthlyUsed: 10,
      limits: {
        plan: 'free',
        metric: 'ai_messages',
        dailyLimit: 20,
        monthlyLimit: 200,
        fairUseLimit: null,
      },
    });
    assert.equal(result.allowed, true);
  });

  it('enforces pro fair-use when configured', () => {
    const result = checkUsageAllowance({
      plan: 'pro',
      metric: 'ai_messages',
      amount: 1,
      dailyUsed: 500,
      monthlyUsed: 500,
      limits: {
        plan: 'pro',
        metric: 'ai_messages',
        dailyLimit: null,
        monthlyLimit: null,
        fairUseLimit: 500,
      },
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, 'fair_use_exceeded');
    }
  });
});
