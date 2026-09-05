import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { CHALLENGE_TEMPLATES, getCompanionChallengeV2Service } from '../services/phase12/companion-challenge-v2-service';
import { CompanionChallengeV2 } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanionChallenges'>;

export function CompanionChallengesScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getCompanionChallengeV2Service(services.storage);
  const [active, setActive] = useState<CompanionChallengeV2 | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setActive(await svc.getActive(profile.id));
    setLoading(false);
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const start = async (templateId: typeof CHALLENGE_TEMPLATES[0]['id']) => {
    if (!profile) return;
    await svc.start(profile.id, templateId);
    Alert.alert('Challenge started', 'Voxa will encourage you — but you do the work.');
    void load();
  };

  const completeToday = async () => {
    if (!profile || !active) return;
    await svc.completeDay(profile.id, active.id);
    Alert.alert('Day complete', 'Nice work today.');
    void load();
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading challenges..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack title="Companion challenges" subtitle="Shared experience — accept, pause, skip, or complete days." />
        {active ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">{active.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">{active.dailyTarget}</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {active.completedDays}/{active.durationDays} days · streak {active.currentStreak} · {active.adherencePercent}%
            </VoxaText>
            <PremiumButton label="Complete today" onPress={() => void completeToday()} />
            <PremiumButton label="Skip today" variant="ghost" onPress={() => active && profile && void svc.skipDay(profile.id, active.id).then(load)} />
          </GlassCard>
        ) : (
          <>
            <EmptyState icon="flag-outline" title="No active challenge" message="Pick a template to start." />
            {CHALLENGE_TEMPLATES.slice(0, 6).map((t) => (
              <Pressable key={t.id} onPress={() => void start(t.id)}>
                <GlassCard style={styles.card}>
                  <VoxaText variant="subtitle">{t.title}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">{t.days} days · {t.target}</VoxaText>
                </GlassCard>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { gap: spacing.sm },
});
