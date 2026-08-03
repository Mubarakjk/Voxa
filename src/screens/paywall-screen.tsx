import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { CONTEXTUAL_PAYWALL_SOURCES, PAYWALL_COPY } from '../constants/free-pro-access';
import { LEGAL_URLS } from '../constants/legal-urls';
import {
  calculateAnnualSavingsPercent,
  formatPriceFromStore,
  FREE_FEATURES,
  FREE_VS_PRO_COMPARISON,
  PRICING_CONFIG,
  PRO_TOP_BENEFITS,
} from '../constants/pricing';
import { colors, layout, radius, spacing } from '../constants/theme';
import { isPaywallEnabled } from '../config/launch-mode';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { OfferingsSnapshot } from '../services/billing/billing-types';
import { billingStateMachine } from '../services/billing/billing-state-machine';
import { getBillingRuntime, getPurchasesUnavailableMessage } from '../services/billing/runtime-environment';
import { BillingPeriod } from '../types/subscription';
import { trackEvent } from '../services/analytics/analytics-service';
import {
  restoreAlertMessage,
  restoreAlertTitle,
  RESTORE_FAILURE_MESSAGE,
} from '../services/billing/restore-messages';
import {
  sanitizeBillingMessage,
  toFriendlyBillingError,
} from '../services/billing/friendly-billing-errors';
import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '../utils/haptics';

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
  onPackageSelected?: (period: BillingPeriod) => void;
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
  onPackageSelected,
  purchaseDisabled,
  setupMessage,
}: PaywallScreenProps) {
  const runtime = getBillingRuntime();
  const monthly = offerings?.monthly;
  const annual = offerings?.annual;
  const storePrices = offerings?.source === 'store';
  const monthlyDisplay = storePrices
    ? formatPriceFromStore(monthly?.priceString)
    : offeringsLoading
      ? '…'
      : '—';
  const annualDisplay = storePrices
    ? formatPriceFromStore(annual?.priceString)
    : offeringsLoading
      ? '…'
      : '—';
  const savingsPercent = storePrices
    ? calculateAnnualSavingsPercent(monthly?.price ?? 0, annual?.price ?? 0)
    : 0;
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
    selectedPackageValid === false ||
    offerings?.source === 'fallback'
  );

  const purchaseLabel = useMemo(() => {
    if (!runtime.supportsNativePurchases) return 'Development build required';
    if (trialEligible && trialDays) {
      return `Start ${trialDays}-day free trial`;
    }
    return PAYWALL_COPY.subscribeLabel;
  }, [runtime.supportsNativePurchases, trialEligible, trialDays]);

  return (
    <ScreenShell padded={false} glow="primary">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {onClose ? (
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12} accessibilityLabel="Close paywall">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <LinearGradient colors={['rgba(45,212,191,0.28)', 'rgba(11,15,20,0)']} style={styles.heroGlow}>
          <View style={styles.hero}>
            <View style={styles.proBadge}>
              <Ionicons name="diamond" size={14} color={colors.background} />
              <VoxaText variant="caption" style={styles.proBadgeText}>
                Voxa Pro
              </VoxaText>
            </View>
            <VoiceOrb size={88} tint={colors.primary} active />
            <VoxaText variant="title" style={styles.heroTitle}>
              {PAYWALL_COPY.title}
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.heroCopy}>
              {PAYWALL_COPY.subtitle}
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
            <VoxaText variant="subtitle">Plans temporarily unavailable</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              We couldn’t load subscription options from the App Store. Check your connection and try again later — the rest of Voxa still works.
            </VoxaText>
          </GlassCard>
        ) : null}

        {errorMessage ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <View style={{ flex: 1, gap: 4 }}>
              <VoxaText variant="subtitle">Couldn’t complete purchase</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                {errorMessage.includes('Network') || errorMessage.includes('offline')
                  ? 'Check your connection and try again. You won’t be charged twice.'
                  : errorMessage.includes('cancel')
                    ? 'Purchase cancelled — no charge was made.'
                    : 'Please try again, or restore purchases if you already subscribed.'}
              </VoxaText>
            </View>
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
                  onPress={() => {
                    void hapticSelection();
                    onSelectPeriod('monthly');
                    onPackageSelected?.('monthly');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedPeriod === 'monthly' }}
                  accessibilityLabel={`Monthly plan, ${monthlyDisplay} per month`}
                >
                  <VoxaText variant="caption">Monthly</VoxaText>
                  <VoxaText variant="subtitle">{monthlyDisplay}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    /month
                  </VoxaText>
                </Pressable>
                <Pressable
                  style={[
                    styles.periodChip,
                    styles.periodChipRecommended,
                    selectedPeriod === 'annual' && styles.periodChipActive,
                  ]}
                  onPress={() => {
                    void hapticSelection();
                    onSelectPeriod('annual');
                    onPackageSelected?.('annual');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedPeriod === 'annual' }}
                  accessibilityLabel={`Annual plan, ${annualDisplay} per year${savingsPercent > 0 ? `, save ${savingsPercent} percent` : ''}`}
                >
                  <VoxaText variant="caption" color="primarySoft">
                    {PAYWALL_COPY.annualBestValueLabel}
                  </VoxaText>
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
            Payment is charged to your Apple ID (or Google Play account). The subscription renews automatically
            unless cancelled at least 24 hours before the end of the current period. After a free trial, if
            offered and eligible, your subscription converts to a paid plan unless you cancel. Manage or cancel
            anytime in your Apple ID / Google Play subscription settings.
          </VoxaText>
          <View style={styles.linkRow}>
            <Pressable onPress={onOpenTerms} accessibilityRole="link">
              <VoxaText variant="caption" color="primarySoft">
                Terms of Use
              </VoxaText>
            </Pressable>
            <Pressable onPress={onOpenPrivacy} accessibilityRole="link">
              <VoxaText variant="caption" color="primarySoft">
                Privacy Policy
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
          <PrimaryButton label={PAYWALL_COPY.continueFreeLabel} variant="ghost" onPress={onContinueFree} disabled={isLoading} />
          <Pressable
            onPress={onRestorePurchases}
            style={styles.restoreBtn}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={PAYWALL_COPY.restoreLabel}
          >
            <VoxaText variant="caption" color="textMuted">
              {PAYWALL_COPY.restoreLabel}
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
  errorCard: {
    padding: spacing.lg,
    borderColor: colors.danger,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
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
  periodChipRecommended: {
    borderColor: 'rgba(45,212,191,0.35)',
  },
  periodChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45,212,191,0.12)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  bestValueText: { color: colors.background, fontWeight: '700', fontSize: 10 },
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

  useEffect(() => {
    if (!isPaywallEnabled()) {
      navigation.goBack();
    }
  }, [navigation]);

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
      const next = await services.billingService.getOfferings();
      setOfferings(next);
      billingStateMachine.offeringsReady();
    } catch (err) {
      setErrorMessage(toFriendlyBillingError(err, 'offerings'));
      billingStateMachine.offeringsFailed();
    } finally {
      setOfferingsLoading(false);
    }
  }, [services.subscription]);

  useEffect(() => {
    void loadOfferings();
    const source = route.params?.source ?? 'unknown';
    trackEvent('paywall_opened', { source });
    trackEvent('subscription_screen_opened', { source });
    if (profile) {
      void services.subscriptionAnalytics.track('paywall_opened', { source });
      if (CONTEXTUAL_PAYWALL_SOURCES.has(source)) {
        void services.paywallImpressions.recordImpression(profile.id);
      }
    }
  }, [loadOfferings, profile, route.params?.source, services.paywallImpressions, services.subscriptionAnalytics]);

  const openLegalUrl = useCallback(async (url: string, fallback: () => void) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to in-app screen
    }
    fallback();
  }, []);

  const handlePurchase = async (period: BillingPeriod) => {
    if (!profile || !billingStateMachine.startPurchase()) return;
    setIsLoading(true);
    setErrorMessage(null);
    void hapticLight();
    try {
      trackEvent('purchase_started', { source: route.params?.source, period });
      await services.subscriptionAnalytics.track('purchase_started', {
        source: route.params?.source,
        productId: period,
      });
      const outcome = await services.billingService.purchase(profile.id, period);
      if (outcome.success) {
        const status = await services.billingService.getPlanStatus(profile.id);
        if (!status.isPro) {
          billingStateMachine.purchaseFailed();
          void hapticWarning();
          trackEvent('purchase_failed', { reason: 'no_entitlement' });
          await services.subscriptionAnalytics.track('purchase_failed');
          setErrorMessage('Purchase completed, but Voxa Pro is not active yet. Try Restore Purchases.');
          return;
        }
        billingStateMachine.purchaseSucceeded();
        void hapticSuccess();
        trackEvent('purchase_succeeded', { period });
        await services.subscriptionAnalytics.track('purchase_succeeded', { productId: outcome.productId });
        await refreshProfile();
        Alert.alert('Welcome to Voxa Pro', 'Your subscription is active. Enjoy the deeper companion experience.', [
          { text: 'Continue', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (outcome.cancelled) {
        billingStateMachine.purchaseCancelled();
        trackEvent('purchase_cancelled');
        await services.subscriptionAnalytics.track('purchase_cancelled');
        return;
      }
      if (outcome.pending) {
        billingStateMachine.purchasePending();
        Alert.alert(
          'Purchase pending',
          sanitizeBillingMessage(
            outcome.errorMessage ?? 'Your purchase is pending store approval.',
            'purchase',
          ),
        );
        return;
      }
      billingStateMachine.purchaseFailed();
      void hapticWarning();
      trackEvent('purchase_failed');
      await services.subscriptionAnalytics.track('purchase_failed');
      setErrorMessage(sanitizeBillingMessage(outcome.errorMessage, 'purchase'));
    } catch (err) {
      billingStateMachine.purchaseFailed();
      void hapticWarning();
      trackEvent('purchase_failed');
      setErrorMessage(toFriendlyBillingError(err, 'purchase'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFree = async () => {
    trackEvent('paywall_dismissed', { source: route.params?.source });
    navigation.goBack();
  };

  const handleRestore = async () => {
    if (!profile || !billingStateMachine.startRestore()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      trackEvent('restore_started');
      await services.subscriptionAnalytics.track('restore_started');
      await services.billingService.restorePurchases(profile.id);
      await refreshProfile();
      const status = await services.billingService.getPlanStatus(profile.id);
      if (status.isPro) {
        trackEvent('restore_succeeded');
        await services.subscriptionAnalytics.track('restore_succeeded', { productId: status.productId });
      } else {
        trackEvent('restore_no_entitlement');
        await services.subscriptionAnalytics.track('restore_no_entitlement');
      }
      Alert.alert(restoreAlertTitle(status.isPro), restoreAlertMessage(status.isPro));
    } catch (err) {
      trackEvent('restore_failed');
      await services.subscriptionAnalytics.track('restore_failed');
      Alert.alert('Restore failed', toFriendlyBillingError(err, 'restore') || RESTORE_FAILURE_MESSAGE);
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
      onOpenTerms={() =>
        void openLegalUrl(LEGAL_URLS.termsOfService, () => navigation.navigate('TermsOfService'))
      }
      onOpenPrivacy={() =>
        void openLegalUrl(LEGAL_URLS.privacyPolicy, () => navigation.navigate('PrivacyPolicy'))
      }
      isLoading={isLoading || billingUiState === 'purchasing' || billingUiState === 'restoring'}
      purchaseDisabled={
        !billingStateMachine.canPurchase() ||
        offeringsLoading ||
        isLoading ||
        billingUiState === 'purchasing' ||
        billingUiState === 'restoring' ||
        selectedPackageValid === false ||
        offerings?.source === 'fallback'
      }
      setupMessage={offerings?.setupMessage ?? null}
      offerings={offerings}
      offeringsLoading={offeringsLoading}
      offline={offerings?.source === 'fallback'}
      errorMessage={errorMessage}
      selectedPeriod={selectedPeriod}
      onSelectPeriod={(period) => {
        trackEvent('package_selected', { period });
        void services.subscriptionAnalytics.track('package_selected', { productId: period });
        setSelectedPeriod(period);
      }}
    />
  );
}
