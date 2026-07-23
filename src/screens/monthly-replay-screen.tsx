import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet } from 'react-native';

import { FadeIn, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useCachedDashboard } from '../hooks/use-cached-dashboard';
import { RootStackParamList } from '../navigation/types';

export function MonthlyReplayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion } = useVoxa();
  const { dashboard } = useCachedDashboard(profile?.id, (id) => companion.getHomeDashboard(id));
  const replay = dashboard?.phase8.monthlyReplay;

  if (!replay) {
    return (
      <ScreenShell>
        <VoxaText variant="body" color="textSecondary">Not enough data for a replay yet — keep chatting.</VoxaText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={`${replay.monthLabel}`} subtitle="Your month with Voxa" />
        <FadeIn>
          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="primarySoft">Biggest win</VoxaText>
            <VoxaText variant="subtitle">{replay.biggestAchievement ?? 'Showing up'}</VoxaText>
          </GlassCard>
        </FadeIn>
        {replay.mostDiscussedTopic ? (
          <FadeIn delay={40}>
            <GlassCard style={styles.card}>
              <VoxaText variant="caption" color="primarySoft">Most discussed</VoxaText>
              <VoxaText variant="body">{replay.mostDiscussedTopic}</VoxaText>
            </GlassCard>
          </FadeIn>
        ) : null}
        {replay.moodTrend ? (
          <FadeIn delay={60}>
            <GlassCard style={styles.card}>
              <VoxaText variant="caption" color="primarySoft">Mood trend</VoxaText>
              <VoxaText variant="body" color="textSecondary">{replay.moodTrend}</VoxaText>
            </GlassCard>
          </FadeIn>
        ) : null}
        <FadeIn delay={80}>
          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="primarySoft">Routine consistency</VoxaText>
            <VoxaText variant="body" color="textSecondary">{replay.routineConsistency}</VoxaText>
          </GlassCard>
        </FadeIn>
        {replay.bestMemory ? (
          <FadeIn delay={100}>
            <GlassCard style={styles.card}>
              <VoxaText variant="caption" color="primarySoft">Best memory</VoxaText>
              <VoxaText variant="body" color="textSecondary">{replay.bestMemory}</VoxaText>
            </GlassCard>
          </FadeIn>
        ) : null}
        {replay.lessonsLearned.length > 0 ? (
          <FadeIn delay={120}>
            <GlassCard style={styles.card}>
              <VoxaText variant="caption" color="primarySoft">Lessons</VoxaText>
              {replay.lessonsLearned.map((l) => (
                <VoxaText key={l} variant="body" color="textSecondary">· {l}</VoxaText>
              ))}
            </GlassCard>
          </FadeIn>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: { gap: spacing.sm },
});
