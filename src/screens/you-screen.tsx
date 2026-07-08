import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { FadeIn, ScreenHeader, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { hasSupabaseConfig, getDataSourceMode } from '../config/env';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/auth-context';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getAIProviderInfo } from '../services/ai/create-ai-service';
import { notificationService } from '../services/notifications/notification-service';
import { DebugPanelInfo, getDebugPanelInfo } from '../utils/debug-info';
import { buildSettingsSections, cycleCompanionControl } from '../utils/settings';
import { showComingSoon } from '../utils/interactions';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import { getVoxaDisplayName } from '../utils/companion-display';

export function YouScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthEnabled, signOut } = useAuth();
  const { profile, refreshProfile, resetLocalData, services, signOutCleanup } = useVoxa();
  const [debugInfo, setDebugInfo] = useState<DebugPanelInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const loadDebugInfo = useCallback(async () => {
    if (!profile) return;
    setDebugInfo(await getDebugPanelInfo(profile, services));
  }, [profile, services]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void loadDebugInfo();
    }, [refreshProfile, loadDebugInfo]),
  );

  const exportData = async () => {
    if (!profile) return;
    const [memories, goals, reminders, conversations] = await Promise.all([
      services.repositories.memories.listMemories(profile.id),
      services.repositories.goals.listGoals(profile.id),
      services.repositories.reminders.listReminders(profile.id),
      services.repositories.conversations.listConversations(profile.id),
    ]);
    await Share.share({
      message: JSON.stringify({ profile, memories, goals, reminders, conversations }, null, 2),
      title: 'Voxa export',
    });
  };

  const handleSignOut = async () => {
    await notificationService.cancelAll();
    await signOutCleanup();
    await signOut();
  };

  const handlePress = async (itemId: string, label: string) => {
    if (itemId === 'companion-customise') return navigation.navigate('CompanionStudio');
    if (itemId === 'features') return navigation.navigate('Features');
    if (itemId === 'memory-debug') return navigation.navigate('Memory');
    if (itemId === 'music') return navigation.navigate('Music');
    if (itemId === 'subscription-upgrade' || itemId === 'subscription-plan' || itemId === 'subscription-usage') {
      return navigation.navigate('Paywall', { source: 'you' });
    }
    if (itemId === 'subscription-manage') return showComingSoon('Manage subscription');
    if (itemId === 'export-data') return exportData();
    if (itemId === 'delete-account') {
      Alert.alert('Delete account', hasSupabaseConfig() ? 'This will sign you out.' : 'This resets local data.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            if (hasSupabaseConfig()) {
              await notificationService.cancelAll();
              await signOut();
              await signOutCleanup();
            } else {
              await resetLocalData();
            }
          },
        },
      ]);
      return;
    }
    if (itemId === 'sign-out') {
      if (isAuthEnabled) await handleSignOut();
      return;
    }
    if (itemId === 'notifications' && profile) {
      await notificationService.requestPermissions();
      await notificationService.scheduleDailyCheckIns(profile.id, {
        morningEnabled: profile.preferences.morningGreetingEnabled ?? true,
        eveningEnabled: profile.preferences.eveningReflectionEnabled ?? true,
      });
      return;
    }

    if (!profile) return;
    const controlPatch = cycleCompanionControl(profile, itemId);
    if (controlPatch) {
      const currentControls = profile.preferences.companionControls ?? createDefaultCompanionControls();
      await services.repositories.userProfile.updateProfile({
        preferences: {
          ...profile.preferences,
          companionControls: { ...currentControls, ...controlPatch.companionControls },
        },
      });
      await refreshProfile();
      return;
    }
    showComingSoon(label);
  };

  if (!profile) {
    return (
      <ScreenShell padded={false}>
        <VoxaText variant="body" color="textSecondary" style={styles.centered}>
          Loading profile...
        </VoxaText>
      </ScreenShell>
    );
  }

  const sections = buildSettingsSections(profile);
  const subscription = sections.find((s) => s.title === 'Subscription');
  const companion = sections.find((s) => s.title === 'Companion');
  const notifications = sections.find((s) => s.title === 'Notifications & check-ins');
  const privacy = sections.find((s) => s.title === 'Privacy');
  const experience = sections.find((s) => s.title === 'Experience');
  const voxaName = getVoxaDisplayName(profile);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader eyebrow="Your space" title="You" subtitle="Profile, companion, and preferences." />
        </FadeIn>

        <GlassCard variant="highlight" style={styles.profile}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <VoxaText variant="subtitle" color="primary">
                {profile.displayName[0]}
              </VoxaText>
            </View>
            <View style={styles.profileInfo}>
              <VoxaText variant="subtitle">{profile.displayName}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                {profile.email ?? 'Voxa companion'} · {getDataSourceMode()}
              </VoxaText>
            </View>
          </View>
        </GlassCard>

        <SectionCard
          title="Companion Studio"
          subtitle={`Shape ${voxaName}'s voice, personality & look`}
          actionLabel="Open"
          onPress={() => navigation.navigate('CompanionStudio')}
        />

        {subscription ? (
          <>
            <SectionHeader title="Subscription" />
            <GlassCard style={styles.group}>
              {subscription.items.map((item, index) => (
                <SettingRow
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  isLast={index === subscription.items.length - 1}
                  onPress={() => handlePress(item.id, item.label)}
                />
              ))}
            </GlassCard>
          </>
        ) : null}

        {companion ? (
          <>
            <SectionHeader title="Companion & memory" />
            <GlassCard style={styles.group}>
              {companion.items
                .filter((item) => !['features', 'music', 'memory-debug'].includes(item.id))
                .map((item, index, arr) => (
                  <SettingRow
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    isLast={index === arr.length - 1}
                    onPress={() => handlePress(item.id, item.label)}
                  />
                ))}
            </GlassCard>
          </>
        ) : null}

        {[notifications, experience].map((section) =>
          section ? (
            <View key={section.title}>
              <SectionHeader title={section.title} />
              <GlassCard style={styles.group}>
                {section.items.map((item, index) => (
                  <SettingRow
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    isLast={index === section.items.length - 1}
                    onPress={() => handlePress(item.id, item.label)}
                  />
                ))}
              </GlassCard>
            </View>
          ) : null,
        )}

        {privacy ? (
          <>
            <SectionHeader title="Privacy" />
            <GlassCard style={styles.group}>
              {privacy.items.map((item, index) => (
                <SettingRow
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  isLast={index === privacy.items.length - 1}
                  onPress={() => handlePress(item.id, item.label)}
                />
              ))}
            </GlassCard>
          </>
        ) : null}

        <SectionHeader title="More" />
        <GlassCard style={styles.group}>
          <SettingRow label="All features" value="" onPress={() => navigation.navigate('Features')} />
          <SettingRow label="Memories" value="View" onPress={() => navigation.navigate('Memory')} />
          <SettingRow label="Music recognition" value="" onPress={() => navigation.navigate('Music')} isLast />
        </GlassCard>

        <Pressable style={styles.debugToggle} onPress={() => setShowDebug((v) => !v)}>
          <VoxaText variant="caption" color="textMuted">
            {showDebug ? 'Hide debug' : 'Show debug'}
          </VoxaText>
          <Ionicons name={showDebug ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </Pressable>

        {showDebug ? (
          <GlassCard style={styles.group}>
            {[
              { label: 'Supabase', value: debugInfo?.supabaseConnected ? 'Connected' : 'Off' },
              { label: 'OpenAI', value: debugInfo?.openAIConnected ? 'Connected' : 'Off' },
              { label: 'AudD', value: debugInfo?.audDConfigured ? 'Configured' : 'Not configured' },
              { label: 'Storage bucket', value: debugInfo?.storageBucketStatus ?? '—' },
              { label: 'ID mode', value: debugInfo?.idMode ?? 'UUID' },
              { label: 'Last chat save', value: debugInfo?.lastChatSaveStatus ?? '—' },
              { label: 'Last voice error', value: debugInfo?.lastVoiceError ?? 'None' },
              { label: 'Recorder active', value: debugInfo?.recorderActive ?? 'No' },
              { label: 'Voice call state', value: debugInfo?.voiceCallState ?? 'idle' },
              { label: 'Orb state', value: debugInfo?.orbState ?? 'idle' },
              { label: 'Orb mood', value: debugInfo?.orbMood ?? 'calm' },
              { label: 'STT provider', value: debugInfo?.sttProvider ?? '—' },
              { label: 'TTS provider', value: debugInfo?.ttsProvider ?? '—' },
              { label: 'Last OpenAI request', value: debugInfo?.lastOpenAiRequest ?? '—' },
              { label: 'AI latency', value: debugInfo?.openAiLatency ?? '—' },
              { label: 'Last AudD request', value: debugInfo?.lastAudDRequest ?? '—' },
              { label: 'AudD status', value: debugInfo?.lastAudDStatus ?? '—' },
              { label: 'Relationship score', value: debugInfo?.relationshipScore ?? '—' },
              { label: 'Response time', value: debugInfo?.aiResponseTime ?? '—' },
              { label: 'Subscription plan', value: debugInfo?.plan ?? '—' },
              { label: 'AI provider', value: debugInfo?.aiProvider ?? getAIProviderInfo().label },
              { label: 'Usage', value: debugInfo?.usageSummary ?? '—' },
              { label: 'Voice', value: debugInfo?.selectedVoice ?? '—' },
              { label: 'Accent', value: debugInfo?.selectedAccent ?? '—' },
              { label: 'Music provider', value: debugInfo?.musicProvider ?? '—' },
              { label: 'Music step', value: debugInfo?.musicLastStep ?? '—' },
              { label: 'Music error', value: debugInfo?.musicLastError ?? '—' },
              { label: 'Music response', value: debugInfo?.musicLastResponse ?? '—' },
            ].map((row, index, arr) => (
              <View key={row.label} style={[styles.debugRow, index < arr.length - 1 && styles.rowBorder]}>
                <VoxaText variant="body">{row.label}</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {row.value}
                </VoxaText>
              </View>
            ))}
          </GlassCard>
        ) : null}

        {isAuthEnabled ? (
          <View style={styles.signOutWrap}>
            <PrimaryButton label="Sign out" variant="ghost" onPress={handleSignOut} />
          </View>
        ) : null}

        <VoxaText variant="caption" color="textMuted" style={styles.version}>
          Voxa · {getDataSourceMode()} mode
        </VoxaText>
      </ScrollView>
    </ScreenShell>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  isLast,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}>
      <VoxaText variant="body" style={styles.rowLabel}>
        {label}
      </VoxaText>
      <View style={styles.value}>
        {value ? (
          <VoxaText variant="caption" color="textMuted">
            {value}
          </VoxaText>
        ) : null}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  centered: { textAlign: 'center', marginTop: spacing.xxl },
  profile: { marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 124, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  profileInfo: { flex: 1, gap: 4 },
  group: { padding: 0, overflow: 'hidden', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  rowPressed: { backgroundColor: colors.surfaceStrong },
  rowLabel: { flex: 1 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  signOutWrap: { marginTop: spacing.lg },
  version: { textAlign: 'center', marginTop: spacing.xl },
});
