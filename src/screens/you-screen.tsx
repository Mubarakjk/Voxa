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
import { isFeatureVisible } from '../config/feature-status';
import { hasSupabaseConfig, getDataSourceMode } from '../config/env';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/auth-context';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getAIProviderInfo } from '../services/ai/create-ai-service';
import { notificationService } from '../services/notifications/notification-service';
import { DebugPanelInfo, getDebugPanelInfo } from '../utils/debug-info';
import {
  buildSettingsSections,
  cycleCheckInStyle,
  cycleCompanionControl,
  cycleQuietHours,
  cycleTheme,
} from '../utils/settings';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import { openPlatformSubscriptionManagement } from '../services/billing/revenuecat-purchase-manager';
import { PlanStatus } from '../types/subscription';
import { getVoxaDisplayName } from '../utils/companion-display';
import { requestAccountDeletion } from '../services/privacy/account-deletion-service';
import { getWeatherService } from '../services/weather/weather-service';
import { getNutritionService } from '../services/nutrition/nutrition-service';
import { NutritionMode } from '../types/nutrition';
import Constants from 'expo-constants';

export function YouScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthEnabled, signOut } = useAuth();
  const { profile, refreshProfile, resetLocalData, services, signOutCleanup } = useVoxa();
  const [debugInfo, setDebugInfo] = useState<DebugPanelInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [weatherLocationLabel, setWeatherLocationLabel] = useState('Not set');
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('off');

  const loadPlanStatus = useCallback(async () => {
    if (!profile) return;
    setPlanStatus(await services.subscription.getPlanStatus(profile.id));
    const pref = await getWeatherService(services.storage).getPreference();
    setWeatherLocationLabel(getWeatherService(services.storage).formatLocationLabel(pref));
    if (isFeatureVisible('calorieTracking')) {
      const nutritionPrefs = await getNutritionService(services.storage).getPreferences(profile.id);
      setNutritionMode(nutritionPrefs.mode);
    }
  }, [profile, services.storage, services.subscription]);

  const loadDebugInfo = useCallback(async () => {
    if (!profile) return;
    setDebugInfo(await getDebugPanelInfo(profile, services));
  }, [profile, services]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void loadDebugInfo();
      void loadPlanStatus();
    }, [refreshProfile, loadDebugInfo, loadPlanStatus]),
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

  const handlePress = async (itemId: string, label: string, displayOnly?: boolean) => {
    if (displayOnly) return;
    if (itemId === 'companion-customise') return navigation.navigate('CompanionStudio');
    if (itemId === 'voice') return navigation.navigate('CompanionStudioVoice');
    if (itemId === 'voxa-speaks' && profile) {
      const next = profile.preferences.voxaSpeaksReplies === false;
      await services.repositories.userProfile.updateProfile({
        preferences: { ...profile.preferences, voxaSpeaksReplies: next },
      });
      await refreshProfile();
      return;
    }
    if (itemId === 'weather-location') return navigation.navigate('WeatherLocationSetup');
    if (itemId === 'news-digest') return navigation.navigate('DailyNews');
    if (itemId === 'calorie-tracking') {
      if (!isFeatureVisible('calorieTracking')) return;
      if (!profile) return;
      const prefs = await getNutritionService(services.storage).getPreferences(profile.id);
      if (!prefs.onboardingCompleted && prefs.mode === 'off') {
        return navigation.navigate('NutritionOnboarding');
      }
      return navigation.navigate('NutritionSettings');
    }
    if (itemId === 'privacy-policy') return navigation.navigate('PrivacyPolicy');
    if (itemId === 'terms') return navigation.navigate('TermsOfService');
    if (itemId === 'theme' && profile) {
      await services.repositories.userProfile.updateProfile({
        preferences: { ...profile.preferences, ...cycleTheme(profile) },
      });
      await refreshProfile();
      return;
    }
    if (itemId === 'checkins' && profile) {
      await services.repositories.userProfile.updateProfile({
        preferences: { ...profile.preferences, ...cycleCheckInStyle(profile) },
      });
      await refreshProfile();
      return;
    }
    if (itemId === 'quiet-hours' && profile) {
      await services.repositories.userProfile.updateProfile({
        preferences: { ...profile.preferences, ...cycleQuietHours(profile) },
      });
      await refreshProfile();
      return;
    }
    if (itemId === 'features') return navigation.navigate('Features');
    if (itemId === 'life-os') return navigation.navigate('LifeOSHub');
    if (itemId === 'memory-debug') return navigation.navigate('Memory');
    if (itemId === 'music' && isFeatureVisible('musicRecognition')) return navigation.navigate('Music');
    if (itemId === 'subscription-upgrade' || itemId === 'subscription-plan' || itemId === 'subscription-usage') {
      return navigation.navigate('Paywall', { source: 'you' });
    }
    if (itemId === 'subscription-manage') {
      const opened = await openPlatformSubscriptionManagement();
      if (!opened) {
        Alert.alert(
          'Manage subscription',
          'Open your device subscription settings to manage or cancel Voxa Pro.',
        );
      }
      return;
    }
    if (itemId === 'subscription-restore') {
      if (!profile) return;
      await services.subscription.restorePurchases(profile.id);
      await refreshProfile();
      await loadPlanStatus();
      Alert.alert('Restore complete', 'Your subscription status has been refreshed.');
      return;
    }
    if (itemId === 'export-data') return exportData();
    if (itemId === 'delete-account') {
      Alert.alert(
        'Delete account',
        hasSupabaseConfig()
          ? 'This permanently deletes your Voxa account and associated cloud data (profile, chats, memories, goals, reminders) where configured, then signs you out and clears local data on this device. This cannot be undone.'
          : 'This permanently resets all Voxa data stored on this device. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const result = await requestAccountDeletion({
                resetLocalData,
                signOut,
                signOutCleanup,
                cancelNotifications: () => notificationService.cancelAll(),
              });
              if (!result.ok) {
                Alert.alert('Deletion unavailable', result.message);
                return;
              }
              Alert.alert(
                'Deleted',
                result.mode === 'cloud'
                  ? 'Your account deletion request completed and local data was cleared.'
                  : 'Local Voxa data on this device was reset.',
              );
            },
          },
        ],
      );
      return;
    }
    if (itemId === 'sign-out') {
      if (isAuthEnabled) await handleSignOut();
      return;
    }
    if (itemId === 'notifications' && profile) {
      const nextEnabled = !(profile.preferences.morningGreetingEnabled ?? true);
      await services.repositories.userProfile.updateProfile({
        preferences: {
          ...profile.preferences,
          morningGreetingEnabled: nextEnabled,
          eveningReflectionEnabled: nextEnabled,
        },
      });
      if (nextEnabled) {
        const granted = await notificationService.requestPermissions();
        if (!granted) {
          Alert.alert('Notifications off', 'Enable notifications in Settings to receive check-ins.');
        } else {
          await notificationService.scheduleDailyCheckIns(profile.id, {
            morningEnabled: true,
            eveningEnabled: true,
          });
          Alert.alert('Notifications on', 'Voxa will send gentle daily check-ins.');
        }
      } else {
        await notificationService.cancelAll();
        Alert.alert('Notifications off', 'Daily check-ins paused.');
      }
      await refreshProfile();
      return;
    }
    if (itemId === 'memory' && profile) {
      await services.repositories.userProfile.updateProfile({
        preferences: {
          ...profile.preferences,
          memoryEnabled: !profile.preferences.memoryEnabled,
        },
      });
      await refreshProfile();
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
    }
  };

  if (!profile) {
    return (
      <ScreenShell padded={false}>
        <View style={styles.centered}>
          <VoxaText variant="body" color="textSecondary">
            Loading profile...
          </VoxaText>
          <Pressable onPress={() => void refreshProfile()}>
            <VoxaText variant="caption" color="primarySoft">
              Tap to retry
            </VoxaText>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const sections = buildSettingsSections(profile, planStatus ?? undefined, weatherLocationLabel, nutritionMode);
  const subscription = sections.find((s) => s.title === 'Subscription');
  const companion = sections.find((s) => s.title === 'Companion');
  const personalisation = sections.find((s) => s.title === 'Personalisation');
  const notifications = sections.find((s) => s.title === 'Notifications & check-ins');
  const privacy = sections.find((s) => s.title === 'Privacy & data');
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
                  onPress={() => handlePress(item.id, item.label, item.displayOnly)}
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
                    onPress={() => handlePress(item.id, item.label, item.displayOnly)}
                  />
                ))}
            </GlassCard>
          </>
        ) : null}

        {[personalisation, notifications].map((section) =>
          section ? (
            <View key={section.title}>
              <SectionHeader title={section.title} />
              <GlassCard style={styles.group}>
                {section.items.map((item, index) => (
                  <SettingRow
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    displayOnly={item.displayOnly}
                    isLast={index === section.items.length - 1}
                    onPress={() => handlePress(item.id, item.label, item.displayOnly)}
                  />
                ))}
              </GlassCard>
            </View>
          ) : null,
        )}

        {privacy ? (
          <>
            <SectionHeader title="Privacy & data" />
            <GlassCard style={styles.group}>
              {privacy.items.map((item, index) => (
                <SettingRow
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  isLast={index === privacy.items.length - 1}
                  onPress={() => handlePress(item.id, item.label, item.displayOnly)}
                />
              ))}
            </GlassCard>
          </>
        ) : null}

        <SectionHeader title="More" />
        <GlassCard style={styles.group}>
          <SettingRow label="All features" value="" onPress={() => navigation.navigate('Features')} />
          <SettingRow label="Memories" value="View" onPress={() => navigation.navigate('Memory')} isLast={!isFeatureVisible('musicRecognition')} />
          {isFeatureVisible('musicRecognition') ? (
            <SettingRow label="Music recognition" value="" onPress={() => navigation.navigate('Music')} isLast />
          ) : null}
        </GlassCard>

        <Pressable style={styles.debugToggle} onPress={() => setShowDebug((v) => !v)}>
          <VoxaText variant="caption" color="textMuted">
            {showDebug ? 'Hide diagnostics' : 'Diagnostics'}
          </VoxaText>
          <Ionicons name={showDebug ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </Pressable>

        {showDebug && __DEV__ ? (
          <GlassCard style={styles.group}>
            <SettingRow
              label="System health"
              value="QA"
              onPress={() => navigation.navigate('HealthCheck')}
            />
            <SettingRow
              label="Billing QA"
              value="RevenueCat"
              onPress={() => navigation.navigate('BillingQA')}
            />
            {[
              { label: 'Experimental features', value: debugInfo?.experimentalFeatures ?? '—' },
              { label: 'Supabase', value: debugInfo?.supabaseConnected ? 'Connected' : 'Off' },
              { label: 'OpenAI', value: debugInfo?.openAIConnected ? 'Connected' : 'Off' },
              { label: 'AI provider', value: debugInfo?.aiProvider ?? getAIProviderInfo().label },
              { label: 'Subscription plan', value: debugInfo?.plan ?? '—' },
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
          Voxa · {Constants.expoConfig?.version ?? '1.0.0'} · {getDataSourceMode()}
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
  displayOnly,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  displayOnly?: boolean;
}) {
  const content = (
    <>
      <VoxaText variant="body" style={styles.rowLabel}>
        {label}
      </VoxaText>
      <View style={styles.value}>
        {value ? (
          <VoxaText variant="caption" color="textMuted">
            {value}
          </VoxaText>
        ) : null}
        {!displayOnly ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
      </View>
    </>
  );

  if (displayOnly) {
    return <View style={[styles.row, !isLast && styles.rowBorder]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  centered: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl, paddingHorizontal: layout.screenPadding },
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
