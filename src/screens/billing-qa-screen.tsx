import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  buildBillingDiagnosticReport,
  checkAiGatewayHealth,
  checkWebhookMirrorHealth,
  type BillingDiagnosticSection,
} from '../services/billing/billing-diagnostic-service';
import { billingStateMachine } from '../services/billing/billing-state-machine';
import { RevenueCatPurchaseManager } from '../services/billing/revenuecat-purchase-manager';

const STATUS_COLOR = {
  ok: '#4ade80',
  bad: colors.danger,
  warn: '#fbbf24',
} as const;

function StatusDot({ ok }: { ok?: boolean }) {
  const color = ok === undefined ? STATUS_COLOR.warn : ok ? STATUS_COLOR.ok : STATUS_COLOR.bad;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function DiagnosticSection({ section }: { section: BillingDiagnosticSection }) {
  return (
    <GlassCard style={styles.sectionCard}>
      <VoxaText variant="subtitle" color="primarySoft">
        {section.title}
      </VoxaText>
      {section.rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.rowLabelWrap}>
            <StatusDot ok={row.ok} />
            <VoxaText variant="caption" color="textMuted" style={styles.rowLabel}>
              {row.label}
            </VoxaText>
          </View>
          <VoxaText variant="caption" style={styles.rowValue}>
            {row.value}
          </VoxaText>
        </View>
      ))}
    </GlassCard>
  );
}

export function BillingQAScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, refreshProfile } = useVoxa();
  const [sections, setSections] = useState<BillingDiagnosticSection[]>([]);
  const [summary, setSummary] = useState({ runtime: '—', requiredOk: false, state: 'idle' });
  const [loading, setLoading] = useState(false);
  const [diagnosticText, setDiagnosticText] = useState('');

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const report = await buildBillingDiagnosticReport(profile.id, services);
      setSections(report.sections);
      setDiagnosticText(report.redactedText);
      setSummary({
        runtime: report.validation.runtime,
        requiredOk: report.validation.allRequiredOk,
        state: billingStateMachine.getState(),
      });
    } finally {
      setLoading(false);
    }
  }, [profile, services]);

  useEffect(() => {
    void refresh();
    const unsubscribe = billingStateMachine.subscribe((state) => {
      setSummary((prev) => ({ ...prev, state }));
    });
    return unsubscribe;
  }, [refresh]);

  const handleRefreshCustomerInfo = async () => {
    if (!profile) return;
    await services.synchroniser.refreshAndSync(profile.id);
    await refreshProfile();
    await refresh();
  };

  const handleReloadOfferings = async () => {
    billingStateMachine.startLoadingOfferings();
    try {
      await services.subscription.getOfferings();
      billingStateMachine.offeringsReady();
    } catch {
      billingStateMachine.offeringsFailed();
    }
    await refresh();
  };

  const handleRestore = async () => {
    if (!profile) return;
    if (!billingStateMachine.startRestore()) return;
    try {
      await services.subscription.restorePurchases(profile.id);
      await refreshProfile();
    } finally {
      billingStateMachine.restoreFinished();
      await refresh();
    }
  };

  const handleIsolationCheck = async () => {
    if (!profile) return;
    const result = await services.synchroniser.runAccountIsolationSelfCheck(profile.id);
    Alert.alert(result.ok ? 'Isolation OK' : 'Isolation issue', result.detail);
  };

  const handleWebhookCheck = async () => {
    if (!profile) return;
    const result = await checkWebhookMirrorHealth(profile.id, services);
    Alert.alert(result.ok ? 'Webhook mirror' : 'Webhook mirror issue', result.detail);
  };

  const handleGatewayCheck = async () => {
    const result = await checkAiGatewayHealth();
    Alert.alert(result.ok ? 'AI gateway' : 'AI gateway issue', result.detail);
  };

  const handleCopyReport = async () => {
    if (diagnosticText) {
      await Share.share({ message: diagnosticText, title: 'Voxa billing diagnostic' });
    }
  };

  const handleClearDevOverride = () => {
    services.entitlementService.clearDevOverride();
    Alert.alert('Dev override cleared');
    void refresh();
  };

  const purchaseManager = services.purchaseManager as RevenueCatPurchaseManager;
  const busy = billingStateMachine.isBusy() || purchaseManager.isPurchaseInFlight() || purchaseManager.isRestoreInFlight();

  const headerTone = useMemo(() => {
    if (summary.requiredOk) return ['rgba(45,212,191,0.28)', 'rgba(6,6,12,0)'] as const;
    return ['rgba(248,113,113,0.18)', 'rgba(6,6,12,0)'] as const;
  }, [summary.requiredOk]);

  if (!__DEV__) {
    return (
      <ScreenShell>
        <VoxaText variant="body">Billing QA is available in development builds only.</VoxaText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} glow="purple">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <VoxaText variant="caption" color="textMuted">
            Back
          </VoxaText>
        </Pressable>

        <LinearGradient colors={headerTone} style={styles.hero}>
          <VoxaText variant="title">Billing QA</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            RevenueCat verification for dev builds. No production “make me Pro” action exists.
          </VoxaText>
          <View style={styles.heroMeta}>
            <GlassCard style={styles.metaChip}>
              <VoxaText variant="caption" color="textMuted">
                Runtime
              </VoxaText>
              <VoxaText variant="body">{summary.runtime}</VoxaText>
            </GlassCard>
            <GlassCard style={styles.metaChip}>
              <VoxaText variant="caption" color="textMuted">
                Required checks
              </VoxaText>
              <VoxaText variant="body" color={summary.requiredOk ? 'primarySoft' : 'danger'}>
                {summary.requiredOk ? 'Pass' : 'Review'}
              </VoxaText>
            </GlassCard>
            <GlassCard style={styles.metaChip}>
              <VoxaText variant="caption" color="textMuted">
                UI state
              </VoxaText>
              <VoxaText variant="body">{summary.state}</VoxaText>
            </GlassCard>
          </View>
        </LinearGradient>

        {sections.map((section) => (
          <DiagnosticSection key={section.title} section={section} />
        ))}

        <View style={styles.actions}>
          <PrimaryButton label="Refresh customer info" onPress={handleRefreshCustomerInfo} loading={loading} disabled={busy} />
          <PrimaryButton label="Reload offerings" variant="ghost" onPress={handleReloadOfferings} disabled={busy} />
          <PrimaryButton label="Restore purchases" variant="ghost" onPress={handleRestore} disabled={busy} />
          <PrimaryButton label="Run account isolation check" variant="ghost" onPress={handleIsolationCheck} />
          <PrimaryButton label="Webhook mirror check" variant="ghost" onPress={handleWebhookCheck} />
          <PrimaryButton label="Usage gateway health" variant="ghost" onPress={handleGatewayCheck} />
          <PrimaryButton label="Open paywall" variant="ghost" onPress={() => navigation.navigate('Paywall', { source: 'billing-qa' })} />
          <PrimaryButton label="Copy redacted diagnostic" variant="ghost" onPress={handleCopyReport} />
          <PrimaryButton label="Clear dev override" variant="ghost" onPress={handleClearDevOverride} />
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
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metaChip: { flex: 1, padding: spacing.sm, gap: 2 },
  sectionCard: { gap: spacing.sm, padding: spacing.lg },
  row: { gap: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  rowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowLabel: { fontWeight: '600' },
  rowValue: { color: colors.textSecondary, paddingLeft: spacing.md + 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
});
