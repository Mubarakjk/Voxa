import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import {
  formatPrice,
  FREE_FEATURES,
  isFoundingMemberOfferEnabled,
  PRICING_CONFIG,
  PRO_FEATURES,
} from '../constants/pricing';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';

type PaywallScreenProps = {
  source?: string;
  onStartTrial: () => void | Promise<void>;
  onContinueFree: () => void | Promise<void>;
  onRestorePurchases: () => void | Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
};

const TESTIMONIALS = [
  { quote: 'Voxa feels like someone who actually remembers me.', author: 'Early member' },
  { quote: 'The voice conversations changed my daily routine.', author: 'Pro user' },
  { quote: 'Premium without feeling pushy — exactly right.', author: 'Founding member' },
];

const FAQ = [
  {
    q: 'What happens after the trial?',
    a: 'You can continue on Free or upgrade to Pro. No charge during the trial.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Manage your subscription in Settings when billing is connected.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your memories and conversations stay private and encrypted in transit.',
  },
];

export function PaywallScreen({
  onStartTrial,
  onContinueFree,
  onRestorePurchases,
  onClose,
  isLoading,
}: PaywallScreenProps) {
  const foundingEnabled = isFoundingMemberOfferEnabled();
  const monthlyPrice = formatPrice(PRICING_CONFIG.prices.monthly);
  const annualPrice = formatPrice(PRICING_CONFIG.prices.annual);
  const foundingPrice = formatPrice(PRICING_CONFIG.prices.founding);

  const comparisonRows = useMemo(
    () => [
      { label: 'AI conversations', free: 'Limited', pro: 'Unlimited' },
      { label: 'Voice calls', free: 'Limited', pro: 'Unlimited' },
      { label: 'Voice notes & media', free: 'Limited', pro: 'Unlimited' },
      { label: 'Memories & goals', free: 'Basic', pro: 'Unlimited' },
      { label: 'Premium voices', free: '—', pro: '✓' },
      { label: 'Priority AI', free: '—', pro: '✓' },
    ],
    [],
  );

  return (
    <ScreenShell padded={false} glow="purple">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {onClose ? (
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
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
              Your companion, unlimited
            </VoxaText>
            <VoxaText variant="body" color="textSecondary" style={styles.heroCopy}>
              Deeper conversations, unlimited voice, and premium intelligence — crafted for you.
            </VoxaText>
          </View>
        </LinearGradient>

        <GlassCard style={styles.pricingCard}>
          <VoxaText variant="label" color="primarySoft">
            {PRICING_CONFIG.trialDays}-day free trial
          </VoxaText>
          <View style={styles.priceRow}>
            <VoxaText variant="title">{monthlyPrice}</VoxaText>
            <VoxaText variant="body" color="textMuted">
              /month after trial
            </VoxaText>
          </View>
          <VoxaText variant="caption" color="textSecondary">
            or {annualPrice}/year · save 37%
          </VoxaText>

          {foundingEnabled ? (
            <View style={styles.foundingCard}>
              <View style={styles.foundingHeader}>
                <VoxaText variant="subtitle">Founding Member</VoxaText>
                <VoxaText variant="caption" color="primarySoft">
                  Limited
                </VoxaText>
              </View>
              <VoxaText variant="body" color="textSecondary">
                {foundingPrice}/month forever · first {PRICING_CONFIG.foundingMemberSlots} members
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Countdown placeholder — offer ends soon
              </VoxaText>
            </View>
          ) : null}
        </GlassCard>

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
            {comparisonRows.map((row) => (
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
          <VoxaText variant="subtitle">Pro benefits</VoxaText>
          <GlassCard style={styles.benefitsCard}>
            {PRO_FEATURES.map((feature) => (
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

        <View style={styles.section}>
          <VoxaText variant="subtitle">Loved by early members</VoxaText>
          {TESTIMONIALS.map((item) => (
            <GlassCard key={item.author} style={styles.testimonial}>
              <VoxaText variant="body" color="textSecondary">
                “{item.quote}”
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                — {item.author}
              </VoxaText>
            </GlassCard>
          ))}
        </View>

        <View style={styles.section}>
          <VoxaText variant="subtitle">FAQ</VoxaText>
          {FAQ.map((item) => (
            <GlassCard key={item.q} style={styles.faqCard}>
              <VoxaText variant="body">{item.q}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                {item.a}
              </VoxaText>
            </GlassCard>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={`Start ${PRICING_CONFIG.trialDays}-Day Trial`}
            onPress={onStartTrial}
            loading={isLoading}
          />
          <PrimaryButton label="Continue Free" variant="ghost" onPress={onContinueFree} disabled={isLoading} />
          <Pressable onPress={onRestorePurchases} style={styles.restoreBtn}>
            <VoxaText variant="caption" color="textMuted">
              Restore Purchases
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
  pricingCard: { gap: spacing.sm, padding: spacing.lg },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  foundingCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 124, 246, 0.1)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.xs,
  },
  foundingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  testimonial: { gap: spacing.sm, padding: spacing.lg },
  faqCard: { gap: spacing.xs, padding: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.md },
});

type PaywallRouteProps = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreenRoute({ navigation, route }: PaywallRouteProps) {
  const { profile, services, refreshProfile } = useVoxa();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      await services.subscription.startTrial(profile.id);
      await refreshProfile();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Trial unavailable', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFree = async () => {
    if (profile) {
      await services.subscription.continueFree(profile.id);
      await refreshProfile();
    }
    navigation.goBack();
  };

  const handleRestore = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      await services.billing.restorePurchases(profile.id);
      await refreshProfile();
      Alert.alert('Restore complete', 'Your subscription status has been refreshed.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Billing not connected yet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PaywallScreen
      source={route.params?.source}
      onStartTrial={handleStartTrial}
      onContinueFree={handleContinueFree}
      onRestorePurchases={handleRestore}
      onClose={() => navigation.goBack()}
      isLoading={isLoading}
    />
  );
}
