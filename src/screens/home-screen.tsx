import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { HomeDashboardData } from '../services/voxa-companion-service';
import { useGridItemWidth } from '../utils/layout';
import {
  formatReminderDateTime,
  getModeLabel,
  getReminderKindLabel,
} from '../utils/reminders';
import { ReminderKind } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const QUICK_ACTIONS: Array<
  | {
      id: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      desc: string;
      type: 'tab';
      tab: 'Chat' | 'Voice' | 'Safe' | 'Settings';
    }
  | {
      id: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      desc: string;
      type: 'reminder';
      presetKind: ReminderKind;
    }
> = [
  { id: 'chat', type: 'tab', tab: 'Chat', label: 'Chat', icon: 'chatbubbles-outline', desc: 'Continue talking' },
  { id: 'voice', type: 'tab', tab: 'Voice', label: 'Voice', icon: 'radio-outline', desc: 'Start a call' },
  { id: 'safe', type: 'tab', tab: 'Safe', label: 'Safe Call', icon: 'shield-checkmark-outline', desc: 'Safety mode' },
  {
    id: 'checkin',
    type: 'reminder',
    presetKind: 'check_in',
    label: 'Set check-in',
    icon: 'calendar-outline',
    desc: 'Schedule Voxa',
  },
  { id: 'settings', type: 'tab', tab: 'Settings', label: 'Settings', icon: 'settings-outline', desc: 'Preferences' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ navigation }: Props) {
  const { profile, companion } = useVoxa();
  const actionWidth = useGridItemWidth(2);
  const greeting = getGreeting();
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await companion.getHomeDashboard(profile.id);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home data.');
    } finally {
      setIsLoading(false);
    }
  }, [companion, profile]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  if (isLoading && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <LoadingState label="Loading your companion..." />
      </ScreenShell>
    );
  }

  if (error && !dashboard) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message={error} onRetry={loadDashboard} />
      </ScreenShell>
    );
  }

  if (!dashboard || !profile) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message="Profile not available." onRetry={loadDashboard} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <VoxaText variant="caption" color="textMuted">
              {greeting}
            </VoxaText>
            <VoxaText variant="title">{profile.displayName}</VoxaText>
          </View>
          <View style={styles.pill}>
            <View style={styles.dot} />
            <VoxaText variant="caption" color="safe">
              Online
            </VoxaText>
          </View>
        </View>

        <GlassCard variant="highlight" style={styles.heroCard}>
          <VoxaText variant="label" color="primarySoft">
            Your companion
          </VoxaText>
          <View style={styles.heroRow}>
            <VoiceOrb size={96} />
            <View style={styles.heroCopy}>
              <VoxaText variant="subtitle">Voxa is ready</VoxaText>
              <VoxaText variant="body" color="textSecondary" numberOfLines={3}>
                {dashboard.companionPrompt.startsWith('"')
                  ? dashboard.companionPrompt
                  : `"${dashboard.companionPrompt}"`}
              </VoxaText>
            </View>
          </View>
        </GlassCard>

        <SectionHeader title="Quick actions" style={styles.section} />
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((item) => (
            <GlassCard
              key={item.id}
              style={{ ...styles.actionCard, width: actionWidth }}
              onPress={() => {
                if (item.type === 'tab') {
                  navigation.navigate(item.tab);
                  return;
                }
                navigation.getParent()?.navigate('CreateReminder', { presetKind: item.presetKind });
              }}>
              <View style={styles.actionIconWrap}>
                <Ionicons name={item.icon} size={20} color={colors.primarySoft} />
              </View>
              <VoxaText variant="subtitle" style={styles.actionLabel}>
                {item.label}
              </VoxaText>
              <VoxaText variant="caption" color="textMuted" numberOfLines={1}>
                {item.desc}
              </VoxaText>
            </GlassCard>
          ))}
        </View>

        <SectionHeader title="Upcoming check-ins" style={styles.section} />
        {dashboard.upcomingReminders.length === 0 ? (
          <GlassCard style={styles.emptyReminderCard}>
            <VoxaText variant="body" color="textSecondary">
              No upcoming reminders yet. Tap Set check-in to schedule Voxa.
            </VoxaText>
          </GlassCard>
        ) : (
          dashboard.upcomingReminders.map((reminder) => (
            <GlassCard key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderTop}>
                <VoxaText variant="label" color="primarySoft">
                  {getReminderKindLabel(reminder.kind)}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {getModeLabel(reminder.mode)}
                </VoxaText>
              </View>
              <VoxaText variant="subtitle">{reminder.title}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                {formatReminderDateTime(reminder.scheduledAt)}
              </VoxaText>
            </GlassCard>
          ))
        )}

        <SectionHeader title="Today's pulse" style={styles.section} />
        <View style={styles.insightsRow}>
          {dashboard.insights.map((item) => (
            <GlassCard key={item.id} style={styles.insightCard}>
              <VoxaText variant="label" color="textMuted" numberOfLines={1}>
                {item.label}
              </VoxaText>
              <VoxaText variant="subtitle" style={styles.insightValue} numberOfLines={1}>
                {item.value}
              </VoxaText>
              <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                {item.detail}
              </VoxaText>
            </GlassCard>
          ))}
        </View>

        <SectionHeader title="Companion note" style={styles.section} />
        <GlassCard style={styles.noteCard}>
          <VoxaText variant="body" color="textSecondary">
            {dashboard.companionNote}
          </VoxaText>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerText: { flex: 1, gap: 4, paddingRight: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safe },
  heroCard: { gap: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1, gap: spacing.sm, minWidth: 0 },
  section: { marginTop: spacing.section },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.cardGap,
  },
  actionCard: {
    minHeight: 108,
    gap: spacing.sm,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.2)',
  },
  actionLabel: { fontSize: 15 },
  emptyReminderCard: { marginBottom: spacing.sm },
  reminderCard: { gap: spacing.sm, marginBottom: spacing.sm },
  reminderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: layout.cardGap,
  },
  insightCard: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
  },
  insightValue: { fontSize: 20, marginVertical: 2 },
  noteCard: { marginTop: 0 },
});
