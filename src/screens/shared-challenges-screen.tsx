import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { FadeIn, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getSharedChallengesService } from '../services/phase8/shared-challenges-service';
import { ChallengeTemplateId, SharedChallenge } from '../types/phase8-retention';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export function SharedChallengesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const service = getSharedChallengesService(services.storage);
  const templates = service.listTemplates();
  const [active, setActive] = useState<SharedChallenge | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setActive(await service.getActive(profile.id));
  }, [profile, service]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (id: ChallengeTemplateId) => {
    if (!profile) return;
    setLoading(id);
    try {
      const c = await service.start(profile.id, id);
      setActive(c);
      navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: `I started the ${c.title} challenge with you — let's do day one.` } });
    } finally {
      setLoading(null);
    }
  };

  const checkIn = async () => {
    if (!profile || !active) return;
    const updated = await service.checkInToday(profile.id, active.id);
    setActive(updated);
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader showBack title="Shared challenges" subtitle="Voxa joins you — no pressure, real progress." />
        {active ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">{active.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Day {active.completedDays}/{active.durationDays} · {active.streakDays}d streak
            </VoxaText>
            <PremiumButton label="Check in today" onPress={() => void checkIn()} />
          </GlassCard>
        ) : null}
        {templates.map((t, i) => (
          <FadeIn key={t.id} delay={i * 30}>
            <Pressable onPress={() => void start(t.id)} disabled={loading === t.id}>
              <GlassCard style={styles.card}>
                <VoxaText variant="subtitle">{t.emoji} {t.title}</VoxaText>
                <VoxaText variant="body" color="textSecondary">{t.description}</VoxaText>
                <VoxaText variant="caption" color="textMuted">{t.durationDays} days</VoxaText>
              </GlassCard>
            </Pressable>
          </FadeIn>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: { gap: spacing.sm, marginBottom: spacing.sm },
});
