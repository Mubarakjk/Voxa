import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { Phase12DashboardData } from '../../types/phase12-experiences';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  data: Phase12DashboardData;
  onNavigate: (screen: string, params?: object) => void;
};

type HubItem = { icon: keyof typeof Ionicons.glyphMap; label: string; screen: string; badge?: string };

export function Phase12JourneyHub({ data, onNavigate }: Props) {
  const groups: Array<{ title: string; items: HubItem[] }> = [
    {
      title: 'Today',
      items: [
        { icon: 'moon-outline', label: 'Daily reflection', screen: 'DailyReflection' },
        { icon: 'newspaper-outline', label: 'Daily updates', screen: 'DailyNews', badge: data.dailyNews ? 'New' : undefined },
        { icon: 'happy-outline', label: 'Mood journal', screen: 'MoodJournal', badge: data.moodLoggedToday ? undefined : 'Log' },
        { icon: 'pulse-outline', label: 'Mood timeline', screen: 'MoodTimeline' },
        { icon: 'notifications-outline', label: 'Scheduled check-ins', screen: 'ScheduledCheckIns' },
        { icon: 'chatbubble-ellipses-outline', label: 'Proactive check-ins', screen: 'ProactiveCheckIns' },
      ],
    },
    {
      title: 'Our Story',
      items: [
        { icon: 'people-outline', label: 'Relationship growth', screen: 'RelationshipGrowth' },
        { icon: 'heart-outline', label: 'Relationship timeline', screen: 'RelationshipTimeline', badge: data.timelinePreview.length ? String(data.timelinePreview.length) : undefined },
        { icon: 'mail-outline', label: 'Weekly letter', screen: 'WeeklyLetter', badge: data.weeklyLetterReady ? '✓' : undefined },
      ],
    },
    {
      title: 'Growth',
      items: [
        { icon: 'school-outline', label: 'Specialist coaching', screen: 'CoachingHub', badge: data.activeCoach ? 'Active' : undefined },
        { icon: 'flag-outline', label: 'Companion challenges', screen: 'CompanionChallenges', badge: data.activeChallenge ? 'Live' : undefined },
      ],
    },
    {
      title: 'Memories',
      items: [
        { icon: 'images-outline', label: 'Photo memories', screen: 'PhotoMemories', badge: data.photoCount ? String(data.photoCount) : undefined },
      ],
    },
    {
      title: 'Experiences',
      items: [
        { icon: 'planet-outline', label: 'Conversation worlds', screen: 'ConversationWorlds' },
        { icon: 'gift-outline', label: 'Gifts & collection', screen: 'GiftsCollection', badge: data.newRewards.length ? String(data.newRewards.length) : undefined },
      ],
    },
  ];

  return (
    <View style={styles.wrap}>
      {groups.map((group, gi) => {
        const visible = group.items.some((item) => {
          if (item.screen === 'WeeklyLetter') return data.weeklyLetterReady || true;
          if (item.screen === 'PhotoMemories') return true;
          return true;
        });
        if (!visible) return null;
        return (
          <StaggerFade key={group.title} index={gi}>
            <VoxaText variant="caption" color="primarySoft" style={styles.groupTitle}>{group.title}</VoxaText>
            <GlassCard style={styles.groupCard}>
              {group.items.map((item, ii) => (
                <Pressable
                  key={item.screen}
                  style={[styles.row, ii < group.items.length - 1 && styles.rowBorder]}
                  onPress={() => onNavigate(item.screen)}>
                  <Ionicons name={item.icon} size={18} color={colors.primarySoft} />
                  <VoxaText variant="body" style={styles.label}>{item.label}</VoxaText>
                  {item.badge ? <VoxaText variant="caption" color="textMuted">{item.badge}</VoxaText> : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </GlassCard>
          </StaggerFade>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  groupTitle: { marginBottom: spacing.xs, letterSpacing: 0.8, textTransform: 'uppercase' },
  groupCard: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 48 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  label: { flex: 1 },
});
