import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getWeeklyLetterService } from '../services/phase12/weekly-letter-service';
import { WeeklyCompanionLetter } from '../types/phase12-experiences';
import { speakSimple } from '../services/voice/simple-speech-service';

type Props = NativeStackScreenProps<RootStackParamList, 'WeeklyLetter'>;

export function WeeklyLetterScreen({ navigation }: Props) {
  const { profile, companion, services } = useVoxa();
  const [letter, setLetter] = useState<WeeklyCompanionLetter | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const dashboard = await companion.getHomeDashboard(profile.id);
    setLetter(dashboard.phase12?.weeklyLetter ?? null);
    setLoading(false);
  }, [profile, companion]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const regenerate = async () => {
    if (!profile) return;
    Alert.alert('Regenerate letter?', 'This replaces this week\'s letter.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: async () => {
          const dash = await companion.getHomeDashboard(profile.id);
          const bundle = await services.companionIntelligence.getBundle(profile.id, profile.displayName);
          const svc = getWeeklyLetterService(services.storage);
          const next = await svc.regenerate({
            userId: profile.id,
            firstName: profile.displayName.split(' ')[0],
            bundle,
            memories: dash.memories,
            goals: dash.activeGoals,
            routine: dash.routineSummary,
            conversationCount: bundle.relationship.conversationCount,
            challengeTitle: dash.phase12?.activeChallenge?.title,
            photoTitle: dash.phase12?.featuredPhoto?.title,
            moodNote: null,
          });
          setLetter(next);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Opening your letter..." />
      </ScreenShell>
    );
  }

  if (!letter) {
    return (
      <ScreenShell>
        <EmptyState
          icon="mail-outline"
          title="Not enough data yet"
          message="Keep chatting, saving memories, or completing goals — Voxa will write when there's enough to reflect on."
        />
        <PremiumButton label="Go to Talk" onPress={() => navigation.navigate('MainTabs', { screen: 'Talk' })} />
      </ScreenShell>
    );
  }

  const sections = [
    letter.opening,
    letter.noticed,
    letter.achievement,
    letter.challenge,
    letter.memory,
    letter.observation,
    letter.encouragement,
    `Next week: ${letter.nextWeekFocus}`,
    letter.closing,
  ].filter(Boolean);

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader eyebrow={`Week of ${letter.weekKey}`} title="Weekly letter" subtitle="From Voxa — grounded in your real week." />
        <GlassCard style={styles.letter}>
          {sections.map((para, i) => (
            <VoxaText key={i} variant="body" color="textSecondary" style={styles.para}>{para}</VoxaText>
          ))}
        </GlassCard>
        <VoxaText variant="caption" color="textMuted">Sources: {letter.dataSources.join(' · ')}</VoxaText>
        {profile ? (
          <PremiumButton label="Play aloud" icon="volume-high-outline" onPress={() => void speakSimple(sections.join('\n\n'), profile)} />
        ) : null}
        <PremiumButton label="Regenerate" variant="ghost" onPress={() => void regenerate()} />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  letter: { gap: spacing.md },
  para: { lineHeight: 24 },
});
