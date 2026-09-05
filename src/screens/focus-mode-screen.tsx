import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FadeIn, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFocusModeService } from '../services/phase9/focus-wake-service';
import { FocusDuration } from '../types/phase9-intelligence';
import { hapticCelebrate } from '../utils/haptics';

const DURATIONS: FocusDuration[] = [25, 45, 60, 90];

export function FocusModeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const service = getFocusModeService(services.storage);
  const [label, setLabel] = useState('Deep work');
  const [loading, setLoading] = useState<number | null>(null);

  const start = useCallback(async (durationMin: FocusDuration) => {
    if (!profile) return;
    setLoading(durationMin);
    try {
      await service.start(profile.id, durationMin, label);
      void hapticCelebrate();
      navigation.navigate('MainTabs', {
        screen: 'Talk',
        params: { starterPrompt: `I started a ${durationMin}-minute focus session. Keep me on track — check in once halfway.` },
      });
    } finally {
      setLoading(null);
    }
  }, [profile, service, label, navigation]);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader showBack title="Focus mode" subtitle="Quiet notifications. Voxa stays with you." />
        <GlassCard style={styles.card}>
          <VoxaText variant="body" color="textSecondary">What are you focusing on?</VoxaText>
          <VoxaText variant="subtitle">{label}</VoxaText>
        </GlassCard>
        {DURATIONS.map((d, i) => (
          <FadeIn key={d} delay={i * 40}>
            <Pressable onPress={() => void start(d)} disabled={loading === d}>
              <GlassCard style={styles.card}>
                <VoxaText variant="subtitle">{d} minutes</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {d === 25 ? 'Pomodoro sprint' : d === 90 ? 'Deep flow' : 'Balanced block'}
                </VoxaText>
              </GlassCard>
            </Pressable>
          </FadeIn>
        ))}
        <PremiumButton label="Use default: Deep work" onPress={() => setLabel('Deep work')} variant="ghost" />
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
  card: { gap: spacing.xs },
});
