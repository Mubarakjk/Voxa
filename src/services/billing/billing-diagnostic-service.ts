import { Platform, Share } from 'react-native';

import { hasSupabaseConfig } from '../../config/env';
import {
  getRevenueCatEntitlementId,
  getRevenueCatOfferingId,
  hasRevenueCatConfig,
} from '../../config/revenuecat-env';
import { VoxaServices } from '../contracts';
import { BillingLog, maskSecret } from './billing-logger';
import {
  BillingValidationReport,
  getConfiguredPlatformKeyPrefix,
  isAiGatewayConfigured,
  shouldPreferAiGateway,
  validateBillingEnvironment,
  validateOfferingPackages,
} from './billing-validation';
import { OfferingsSnapshot, PurchaseOutcome } from './billing-types';
import { RevenueCatPurchaseManager } from './revenuecat-purchase-manager';
import { getBillingRuntime } from './runtime-environment';

export type BillingDiagnosticSection = {
  title: string;
  rows: { label: string; value: string; ok?: boolean }[];
};

export type BillingDiagnosticReport = {
  generatedAt: string;
  validation: BillingValidationReport;
  sections: BillingDiagnosticSection[];
  redactedText: string;
};

export async function buildBillingDiagnosticReport(
  userId: string,
  services: VoxaServices,
): Promise<BillingDiagnosticReport> {
  const runtime = getBillingRuntime();
  const validation = validateBillingEnvironment();
  const billingStatus = await services.subscription.getBillingStatus();
  const planStatus = await services.subscription.getPlanStatus(userId);
  const offerings = await services.subscription.getOfferings();
  const entitlement = await services.entitlementService.getCachedEntitlement(userId);
  const mirror = await services.synchroniser.getWebhookMirrorDetails(userId);
  const isolation = await services.synchroniser.runAccountIsolationSelfCheck(userId);
  const purchaseManager = services.purchaseManager as RevenueCatPurchaseManager;
  const packageValidation = validateOfferingPackages(offerings);
  const gatewayConfigured = isAiGatewayConfigured();
  const gatewayPreferred = shouldPreferAiGateway();

  const lastPurchase = purchaseManager.getLastPurchase();
  const lastRestore = purchaseManager.getLastRestore();

  const sections: BillingDiagnosticSection[] = [
    {
      title: 'Environment',
      rows: validation.checks.map((check) => ({
        label: check.label,
        value: check.detail,
        ok: check.ok,
      })),
    },
    {
      title: 'Runtime & RevenueCat',
      rows: [
        { label: 'Runtime', value: runtime.environmentLabel, ok: true },
        { label: 'Native purchases', value: runtime.supportsNativePurchases ? 'supported' : 'blocked', ok: runtime.supportsNativePurchases || runtime.isExpoGo },
        { label: 'RevenueCat configured', value: hasRevenueCatConfig() ? 'yes' : 'no', ok: hasRevenueCatConfig() },
        { label: 'Platform key', value: getConfiguredPlatformKeyPrefix(), ok: hasRevenueCatConfig() },
        { label: 'Entitlement ID', value: getRevenueCatEntitlementId(), ok: true },
        { label: 'Offering ID', value: getRevenueCatOfferingId(), ok: true },
        { label: 'Billing ready', value: billingStatus.ready ? 'yes' : 'no', ok: billingStatus.ready },
        { label: 'Billing message', value: billingStatus.message, ok: billingStatus.ready },
      ],
    },
    {
      title: 'Customer & entitlement',
      rows: [
        { label: 'App user ID', value: `${userId.slice(0, 8)}…`, ok: true },
        { label: 'Customer info loaded', value: purchaseManager.getLastRefreshAt() ?? 'not yet', ok: Boolean(purchaseManager.getLastRefreshAt()) },
        { label: 'Entitlement', value: entitlement.isPro ? 'active' : 'inactive', ok: !entitlement.isPro || planStatus.isPro },
        { label: 'Entitlement source', value: planStatus.entitlementSource ?? 'none', ok: true },
        { label: 'Expiration', value: planStatus.renewalDate ?? '—', ok: true },
        { label: 'Trial active', value: planStatus.isTrialActive ? 'yes' : 'no', ok: true },
        { label: 'Account isolation', value: isolation.detail, ok: isolation.ok },
      ],
    },
    {
      title: 'Offerings & packages',
      rows: buildOfferingRows(offerings, packageValidation),
    },
    {
      title: 'Purchase & restore',
      rows: [
        { label: 'UI state machine', value: 'active', ok: true },
        { label: 'Purchase in flight', value: purchaseManager.isPurchaseInFlight() ? 'yes' : 'no', ok: !purchaseManager.isPurchaseInFlight() },
        { label: 'Restore in flight', value: purchaseManager.isRestoreInFlight() ? 'yes' : 'no', ok: !purchaseManager.isRestoreInFlight() },
        { label: 'Last purchase', value: formatOutcome(lastPurchase), ok: !lastPurchase || Boolean(lastPurchase.cancelled || lastPurchase.success || lastPurchase.pending) },
        { label: 'Last restore', value: formatOutcome(lastRestore), ok: true },
      ],
    },
    {
      title: 'Supabase mirror & gateway',
      rows: [
        { label: 'Supabase configured', value: hasSupabaseConfig() ? 'yes' : 'no', ok: hasSupabaseConfig() },
        { label: 'Subscription mirror', value: mirror.status, ok: mirror.status !== 'none' || !hasSupabaseConfig() },
        { label: 'Last webhook event', value: mirror.lastEventId ? `${mirror.lastEventId.slice(0, 12)}…` : 'none', ok: true },
        { label: 'Mirror updated', value: mirror.updatedAt ?? '—', ok: true },
        { label: 'AI gateway configured', value: gatewayConfigured ? 'yes' : 'no', ok: gatewayConfigured || __DEV__ },
        { label: 'Server limits active', value: gatewayPreferred ? 'production gateway' : __DEV__ ? 'dev direct OpenAI allowed' : 'not active', ok: gatewayPreferred || __DEV__ },
      ],
    },
  ];

  const redactedText = formatDiagnosticText(sections, validation);

  return {
    generatedAt: new Date().toISOString(),
    validation,
    sections,
    redactedText,
  };
}

function buildOfferingRows(
  offerings: OfferingsSnapshot,
  validation: ReturnType<typeof validateOfferingPackages>,
): BillingDiagnosticSection['rows'] {
  return [
    { label: 'Offering source', value: offerings.source, ok: offerings.source === 'store' },
    { label: 'Offering ID', value: offerings.offeringId ?? getRevenueCatOfferingId(), ok: true },
    { label: 'Monthly package', value: offerings.monthly?.productId ?? 'missing', ok: validation.monthlyValid },
    { label: 'Monthly price', value: offerings.monthly?.priceString ?? '—', ok: validation.monthlyValid },
    { label: 'Annual package', value: offerings.annual?.productId ?? 'missing', ok: validation.annualValid },
    { label: 'Annual price', value: offerings.annual?.priceString ?? '—', ok: validation.annualValid },
    { label: 'Trial eligible', value: offerings.trialEligible ? 'yes (store confirmed)' : 'no', ok: true },
    { label: 'Setup message', value: offerings.setupMessage ?? validation.setupMessage ?? 'OK', ok: validation.monthlyValid && validation.annualValid },
  ];
}

function formatOutcome(outcome?: PurchaseOutcome): string {
  if (!outcome) return 'none';
  if (outcome.cancelled) return 'cancelled';
  if (outcome.pending) return 'pending';
  if (outcome.success && outcome.productId) return `success · ${outcome.productId}`;
  if (outcome.success) return 'success · no active entitlement';
  return outcome.errorMessage ?? 'failed';
}

function formatDiagnosticText(
  sections: BillingDiagnosticSection[],
  validation: BillingValidationReport,
): string {
  const lines = [
    'Voxa Billing Diagnostic (redacted)',
    `Generated: ${new Date().toISOString()}`,
    `Platform: ${Platform.OS}`,
    `Runtime: ${validation.runtime}`,
    `Required checks OK: ${validation.allRequiredOk ? 'yes' : 'no'}`,
    '',
  ];

  sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    section.rows.forEach((row) => {
      const status = row.ok === undefined ? '' : row.ok ? '✓' : '✗';
      lines.push(`${status} ${row.label}: ${row.value}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

export async function shareBillingDiagnosticReport(report: BillingDiagnosticReport): Promise<void> {
  await Share.share({ message: report.redactedText, title: 'Voxa billing diagnostic' });
}

export async function checkAiGatewayHealth(): Promise<{ ok: boolean; detail: string }> {
  if (!isAiGatewayConfigured()) {
    return { ok: __DEV__, detail: __DEV__ ? 'Gateway not configured (dev direct OpenAI allowed)' : 'Gateway URL missing' };
  }

  const baseUrl = process.env.EXPO_PUBLIC_AI_GATEWAY_URL?.trim();
  if (!baseUrl) return { ok: false, detail: 'Gateway URL not set' };

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, detail: `Gateway health HTTP ${response.status}` };
    }
    BillingLog.webhookMirrorStatus('AI gateway health OK');
    return { ok: true, detail: 'Gateway reachable' };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'Gateway unreachable' };
  }
}

export async function checkWebhookMirrorHealth(userId: string, services: VoxaServices): Promise<{ ok: boolean; detail: string }> {
  const mirror = await services.synchroniser.getWebhookMirrorDetails(userId);
  if (!hasSupabaseConfig()) {
    return { ok: true, detail: 'Local-only mode (webhook mirror N/A)' };
  }
  if (mirror.status === 'none') {
    return { ok: true, detail: 'No webhook events yet (expected before first purchase)' };
  }
  return { ok: mirror.status !== 'unknown', detail: `${mirror.status} · ${mirror.updatedAt ?? 'unknown time'}` };
}
