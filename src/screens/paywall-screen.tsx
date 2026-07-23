import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import {
  calculateAnnualSavingsPercent,
  formatPrice,
  formatPriceFromStore,
  FREE_FEATURES,
  FREE_VS_PRO_COMPARISON,
  PRICING_CONFIG,
  PRO_TOP_BENEFITS,
} from '../constants/pricing';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { OfferingsSnapshot } from '../services/billing/billing-types';
import { billingStateMachine } from '../services/billing/billing-state-machine';
import { getBillingRuntime, getPurchasesUnavailableMessage } from '../services/billing/runtime-environment';
import { BillingPeriod } from '../types/subscription';
import { trackEvent } from '../services/analytics/analytics-service';

type PaywallScreenProps = {
  source?: string;
  onPurchase: (period: BillingPeriod) => void | Promise<void>;
  onContinueFree: () => void | Promise<void>;
  onRestorePurchases: () => void | Promise<void>;
  onClose?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  isLoading?: boolean;
  purchaseDisabled?: boolean;
  setupMessage?: string | null;
  offerings?: OfferingsSnapshot | null;
  offeringsLoading?: boolean;
  offline?: boolean;
  errorMessage?: string | null;
  selectedPeriod: BillingPeriod;
  onSelectPeriod: (period: BillingPeriod) => void;
};

export function PaywallScreen({
  onPurchase,
  onContinueFree,
  onRestorePurchases,
  onClose,
  onOpenTerms,
  onOpenPrivacy,
  isLoading,
  offerings,
  offeringsLoading,
  offline,
  errorMessage,
  selectedPeriod,
  onSelectPeriod,
  purchaseDisabled,
  setupMessage,
}: PaywallScreenProps) {
  const runtime = getBillingRuntime();
  const monthly = offerings?.monthly;
  const annual = offerings?.annual;
  const monthlyDisplay = formatPriceFromStore(monthly?.priceString, monthly?.price ?? PRICING_CONFIG.prices.monthly);
  const annualDisplay = formatPriceFromStore(annual?.priceString, annual?.price ?? PRICING_CONFIG.prices.annual);
  const savingsPercent = calculateAnnualSavingsPercent(
    monthly?.price ?? PRICING_CONFIG.prices.monthly,
    annual?.price ?? PRICING_CONFIG.prices.annual,
  );
  const trialDays =
    selectedPeriod === 'annual' ? annual?.trialDays : monthly?.trialDays;
  const trialEligible = Boolean(
    offerings?.source === 'store' &&
      offerings.trialEligible &&
      trialDays &&
      runtime.supportsNativePurchases &&
      ((selectedPeriod === 'monthly' && monthly?.trialEligible) ||
        (selectedPeriod === 'annual' && annual?.trialEligible)),
  );

  const selectedPackageValid =
    selectedPeriod === 'monthly' ? offerings?.monthlyPackageValid : offerings?.annualPackageValid;

  const purchaseDisabledProp = purchaseDisabled ?? (
    !runtime.supportsNativePurchases ||
    offeringsLoading ||
    isLoading ||
    selectedPackageValid === false
  );

  const purchaseLabel = useMemo(() => {
    if (!runtime.supportsNativePurchases) return 'Development build required';
    if (trialEligible && trialDays) {
      return `Start ${trialDays}-day free trial`;
    }
    return selectedPeriod === 'annual' ? 'Subscribe yearly' : 'Subscribe monthly';
  }, [runtime.supportsNativePurchases, trialEligible, trialDays, selectedPeriod]);

  return (
    <ScreenShell padded={false} glow="purple">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {onClose ? (
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12} accessibilityLabel="Close paywall">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <LinearGradient colors={['rgba(139,124,246,0.35)', 'rgba(6,6,12,0)']} style={styles.heroGlow}>
          <View style={styles.hero}>
            <View style={styles.proBadge}>
              <Ionicons name="diamond" size={14} color={colors.background} />
              <VoxaText variant="caption" style={styles.proBadgeText}>
                Voxa Pro
              </VoxaText>
            </View>
            <VoiceOrb size={88} tint={colors.primary} active />
            <VoxaText variant="title" style={styles.heroTitle}>
              Deeper companion. Built for your life.
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.heroCopy}>
              Advanced memory, Life OS, mood insights, and generous fair-use AI — honestly priced at {monthlyDisplay}/month.
            </VoxaText>
          </View>
        </LinearGradient>

        {!runtime.supportsNativePurchases ? (
          <GlassCard style={styles.noticeCard}>
            <VoxaText variant="body" color="textSecondary">
              {getPurchasesUnavailableMessage()}
            </VoxaText>
          </GlassCard>
        ) : null}

        {setupMessage ? (
          <GlassCard style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primarySoft} />
            <VoxaText variant="body" color="textSecondary">
              {setupMessage}
            </VoxaText>
          </GlassCard>
        ) : null}

        {offerings?.source === 'fallback' ? (
          <GlassCard style={styles.noticeCard}>
            <VoxaText variant="caption" color="primarySoft">
              Development fallback pricing
            </VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Store metadata is unavailable. Prices shown are local fallbacks only.
            </VoxaText>
          </GlassCard>
        ) : null}

        {errorMessage ? (
          <GlassCard style={styles.errorCard}>
            <VoxaText variant="body" color="danger">
              {errorMessage}
            </VoxaText>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.pricingCard}>
          {offeringsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={styles.periodRow}>
                <Pressable
                  style={[styles.periodChip, selectedPeriod === 'monthly' && styles.periodChipActive]}
                  onPress={() => onSelectPeriod('monthly')}
                >
                  <VoxaText variant="caption">Monthly</VoxaText>
                  <VoxaText variant="subtitle">{monthlyDisplay}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    /month
                  </VoxaText>
                </Pressable>
                <Pressable
                  style={[styles.periodChip, selectedPeriod === 'annual' && styles.periodChipActive]}
                  onPress={() => onSelectPeriod('annual')}
                >
                  <VoxaText variant="caption">Yearly</VoxaText>
                  <VoxaText variant="subtitle">{annualDisplay}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    /year
                  </VoxaText>
                  {savingsPercent > 0 ? (
                    <VoxaText variant="caption" color="primarySoft">
                      Save {savingsPercent}%
                    </VoxaText>
                  ) : null}
                </Pressable>
              </View>

              {trialEligible && trialDays ? (
                <VoxaText variant="caption" color="textSecondary">
                  {trialDays}-day free trial, then {selectedPeriod === 'annual' ? annualDisplay : monthlyDisplay}
                  {selectedPeriod === 'annual' ? '/year' : '/month'}. Cancel anytime in your App Store or Google Play settings.
                </VoxaText>
              ) : (
                <VoxaText variant="caption" color="textSecondary">
                  Recurring subscription. Cancel anytime in your App Store or Google Play settings before renewal.
                </VoxaText>
              )}
            </>
          )}
        </GlassCard>

        <View style={styles.section}>
          <VoxaText variant="subtitle">Top Pro benefits</VoxaText>
          <GlassCard style={styles.benefitsCard}>
            {PRO_TOP_BENEFITS.map((feature) => (
              <View key={feature} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primarySoft} />
                <VoxaText variant="body" color="textSecondary">
                  {feature}
                </VoxaText>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <VoxaText variant="subtitle">Free vs Pro</VoxaText>
          <GlassCard style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <VoxaText variant="caption" color="textMuted" style={styles.tableFeature}>
                Feature
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Free
              </VoxaText>
              <VoxaText variant="caption" color="primarySoft">
                Pro
              </VoxaText>
            </View>
            {FREE_VS_PRO_COMPARISON.map((row) => (
              <View key={row.label} style={styles.tableRow}>
                <VoxaText variant="caption" style={styles.tableFeature}>
                  {row.label}
                </VoxaText>
                <VoxaText variant="caption" color="textSecondary">
                  {row.free}
                </VoxaText>
                <VoxaText variant="caption" color="primarySoft">
                  {row.pro}
                </VoxaText>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.section}>
          <VoxaText variant="subtitle">Free still includes</VoxaText>
          <GlassCard style={styles.benefitsCard}>
            {FREE_FEATURES.map((feature) => (
              <View key={feature} style={styles.benefitRow}>
                <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
                <VoxaText variant="caption" color="textSecondary">
                  {feature}
                </VoxaText>
              </View>
            ))}
          </GlassCard>
        </View>

        <GlassCard style={styles.disclosureCard}>
          <VoxaText variant="caption" color="textMuted">
            Payment is charged to your App Store or Google Play account. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your device subscription settings.
          </VoxaText>
          <View style={styles.linkRow}>
            <Pressable onPress={onOpenTerms}>
              <VoxaText variant="caption" color="primarySoft">
                Terms
              </VoxaText>
            </Pressable>
            <Pressable onPress={onOpenPrivacy}>
              <VoxaText variant="caption" color="primarySoft">
                Privacy
              </VoxaText>
            </Pressable>
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <PrimaryButton
            label={purchaseLabel}
            onPress={() => onPurchase(selectedPeriod)}
            loading={isLoading}
            disabled={purchaseDisabledProp}
          />
          <PrimaryButton label="Continue Free" variant="ghost" onPress={onContinueFree} disabled={isLoading} />
          <Pressable onPress={onRestorePurchases} style={styles.restoreBtn} disabled={isLoading}>
            <VoxaText variant="caption" color="textMuted">
              Restore purchases
            </VoxaText>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  heroGlow: {
    borderRadius: radius.xl,
    marginTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  proBadgeText: { color: colors.background, fontWeight: '700' },
  heroTitle: { textAlign: 'center' },
  heroCopy: { textAlign: 'center', maxWidth: 320 },
  noticeCard: { padding: spacing.lg, gap: spacing.sm, flexDirection: 'row', alignItems: 'flex-start' },
  errorCard: { padding: spacing.lg, borderColor: colors.danger, borderWidth: 1 },
  pricingCard: { gap: spacing.md, padding: spacing.lg },
  periodRow: { flexDirection: 'row', gap: spacing.sm },
  periodChip: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
    alignItems: 'center',
  },
  periodChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139,124,246,0.12)',
  },
  section: { gap: spacing.md },
  tableCard: { padding: 0, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tableFeature: { flex: 1.4 },
  benefitsCard: { gap: spacing.sm, padding: spacing.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disclosureCard: { gap: spacing.sm, padding: spacing.lg },
  linkRow: { flexDirection: 'row', gap: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.md },
});

type PaywallRouteProps = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreenRoute({ navigation, route }: PaywallRouteProps) {
  const { profile, services, refreshProfile } = useVoxa();
  const [isLoading, setIsLoading] = useState(false);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offerings, setOfferings] = useState<OfferingsSnapshot | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [billingUiState, setBillingUiState] = useState(billingStateMachine.getState());

  useEffect(() => {
    return billingStateMachine.subscribe(setBillingUiState);
  }, []);

  const loadOfferings = useCallback(async () => {
    billingStateMachine.startLoadingOfferings();
    setOfferingsLoading(true);
    try {
      const next = await services.subscription.getOfferings();
      setOfferings(next);
      billingStateMachine.offeringsReady();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load pricing.');
      billingStateMachine.offeringsFailed();
    } finally {
      setOfferingsLoading(false);
    }
  }, [services.subscription]);

  useEffect(() => {
    void loadOfferings();
    trackEvent('subscription_screen_opened', { source: route.params?.source ?? 'unknown' });
    if (profile) {
      void services.subscriptionAnalytics.track('paywall_viewed', { source: route.params?.source });
      void services.paywallImpressions.recordImpression(profile.id);
    }
  }, [loadOfferings, profile, route.params?.source, services.paywallImpressions, services.subscriptionAnalytics]);

  const handlePurchase = async (period: BillingPeriod) => {
    if (!profile || !billingStateMachine.startPurchase()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await services.subscriptionAnalytics.track('purchase_started', { source: route.params?.source, productId: period });
      const outcome = await services.subscription.purchase(profile.id, period);
      if (outcome.success) {
        billingStateMachine.purchaseSucceeded();
        await services.subscriptionAnalytics.track('purchase_completed', { productId: outcome.productId });
        await refreshProfile();
        navigation.goBack();
        return;
      }
      if (outcome.cancelled) {
        billingStateMachine.purchaseCancelled();
        await services.subscriptionAnalytics.track('purchase_cancelled');
        return;
      }
      if (outcome.pending) {
        billingStateMachine.purchasePending();
        Alert.alert('Purchase pending', outcome.errorMessage ?? 'Your purchase is pending store approval.');
        return;
      }
      billingStateMachine.purchaseFailed();
      await services.subscriptionAnalytics.track('purchase_failed');
      setErrorMessage(outcome.errorMessage ?? 'Purchase failed. Please try again.');
    } catch (err) {
      billingStateMachine.purchaseFailed();
      setErrorMessage(err instanceof Error ? err.message : 'Purchase failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFree = async () => {
    navigation.goBack();
  };

  const handleRestore = async () => {
    if (!profile || !billingStateMachine.startRestore()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await services.subscriptionAnalytics.track('restore_started');
      await services.subscription.restorePurchases(profile.id);
      await refreshProfile();
      const status = await services.subscription.getPlanStatus(profile.id);
      await services.subscriptionAnalytics.track('restore_completed', {
        productId: status.productId,
      });
      Alert.alert(
        status.isPro ? 'Restore complete' : 'No subscription found',
        status.isPro
          ? 'Your Voxa Pro subscription is active on this account.'
          : 'No active Voxa Pro subscription was found for this account.',
      );
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      billingStateMachine.restoreFinished();
      setIsLoading(false);
    }
  };

  const selectedPackageValid =
    selectedPeriod === 'monthly' ? offerings?.monthlyPackageValid : offerings?.annualPackageValid;

  return (
    <PaywallScreen
      source={route.params?.source}
      onPurchase={handlePurchase}
      onContinueFree={handleContinueFree}
      onRestorePurchases={handleRestore}
      onClose={() => navigation.goBack()}
      onOpenTerms={() => navigation.navigate('TermsOfService')}
      onOpenPrivacy={() => navigation.navigate('PrivacyPolicy')}
      isLoading={isLoading || billingUiState === 'purchasing' || billingUiState === 'restoring'}
      purchaseDisabled={
        !billingStateMachine.canPurchase() ||
        offeringsLoading ||
        isLoading ||
        billingUiState === 'purchasing' ||
        billingUiState === 'restoring' ||
        selectedPackageValid === false
      }
      setupMessage={offerings?.setupMessage ?? null}
      offerings={offerings}
      offeringsLoading={offeringsLoading}
      offline={offerings?.source === 'fallback'}
      errorMessage={errorMessage}
      selectedPeriod={selectedPeriod}
      onSelectPeriod={setSelectedPeriod}
    />
  );
}
