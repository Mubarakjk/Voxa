import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { GlassCard } from '../components/ui/glass-card';
import { FadeIn, ScreenHeader } from '../components/premium/premium-ui';
import { SpinWheel } from '../components/phase10/spin-wheel';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  formatSpinCountdown,
  getDailySpinService,
  msUntilNextSpin,
} from '../services/phase10/daily-spin-service';
import { getCelebrationService } from '../services/phase10/celebration-service';
import { hapticCelebrate } from '../utils/haptics';
import { DailySpinState } from '../types/phase10-play';

export function DailySpinScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const spinService = getDailySpinService(services.storage);
  const [state, setState] = useState<DailySpinState | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!profile) return;
    void spinService.getState(profile.id).then(setState);
  }, [profile, spinService]);

  useEffect(() => {
    const tick = () => setCountdown(formatSpinCountdown(msUntilNextSpin()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const spin = () => {
    if (!profile || spinning || state?.spun) return;
    setSpinning(true);
  };

  const onSpinEnd = async () => {
    if (!profile) return;
    const result = await spinService.spin(profile.id);
    setState(result);
    setSpinning(false);
    void hapticCelebrate();
    if (result.reward?.xp) {
      void getCelebrationService(services.storage).showIfNew(profile.id, {
        kind: 'xp_gain',
        eventKey: `spin_xp:${result.date}`,
        title: 'Spin reward',
        subtitle: result.reward.label,
        emoji: '🎡',
        amount: result.reward.xp,
      });
    }
  };

  const useReward = () => {
    if (!state?.reward) return;
    const prompt =
      state.reward.kind === 'starter' || state.reward.kind === 'quote' || state.reward.kind === 'fact' || state.reward.kind === 'teaser'
        ? state.reward.value
        : state.reward.kind === 'challenge'
          ? `Today's spin challenge: ${state.reward.value}`
          : state.reward.kind === 'badge'
            ? `I unlocked the ${state.reward.value} — celebrate with me.`
            : state.reward.value;
    navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: prompt } });
  };

  return (
    <ScreenShell padded={false}>
      <View style={styles.wrap}>
        <ScreenHeader title="Daily Spin" subtitle={state?.spun ? `Next spin in ${countdown}` : 'One spin every day'} />
        <FadeIn>
          <GlassCard style={styles.card}>
            <SpinWheel spinning={spinning} onSpinEnd={() => void onSpinEnd()} />
            <VoxaText variant="subtitle">
              {spinning ? 'Spinning...' : state?.spun ? 'Your reward' : 'Ready to spin?'}
            </VoxaText>
            {state?.reward ? (
              <>
                <VoxaText variant="body" color="textSecondary">{state.reward.label}</VoxaText>
                <VoxaText variant="caption" color="textMuted">{state.reward.value}</VoxaText>
              </>
            ) : (
              <VoxaText variant="caption" color="textMuted">Fair rewards only — no pay-to-win.</VoxaText>
            )}

            {!state?.spun ? (
              <Pressable onPress={spin} style={styles.btn} disabled={spinning}>
                <VoxaText variant="caption" color="primarySoft">{spinning ? '...' : 'Spin'}</VoxaText>
              </Pressable>
            ) : (
              <Pressable onPress={useReward} style={styles.btn}>
                <VoxaText variant="caption" color="primarySoft">Use reward in Talk</VoxaText>
              </Pressable>
            )}
          </GlassCard>
        </FadeIn>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: layout.screenPadding, gap: spacing.lg },
  card: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl },
  btn: { marginTop: spacing.md },
});
