import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { invalidateDashboardCache } from '../hooks/use-cached-dashboard';
import { RootStackParamList } from '../navigation/types';
import { getArcadeGame } from '../services/phase10/arcade-games';
import { getArcadeService } from '../services/phase10/arcade-service';
import { ArcadeGameSession } from '../types/phase10-play';

export function ArcadeGameSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ArcadeGameSession'>>();
  const { profile, services } = useVoxa();
  const game = getArcadeGame(route.params.gameId);
  const arcade = getArcadeService(services.storage);

  const [session, setSession] = useState<ArcadeGameSession | null>(null);
  const [result, setResult] = useState<{ xp: number; highScore: boolean; stats: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const ensureSession = useCallback(async () => {
    if (!profile || session) return;
    const s = await arcade.startSession(profile.id, route.params.gameId);
    setSession(s);
  }, [arcade, profile, route.params.gameId, session]);

  const startTalk = async () => {
    if (!profile || !game) return;
    await ensureSession();
    navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: game.starterPrompt } });
  };

  const finish = async (won: boolean) => {
    if (!profile || !session) return;
    setBusy(true);
    try {
      const out = await arcade.finishSession(profile.id, session.id, { won, score: won ? 100 : 50 });
      if (out) {
        setResult({
          xp: out.xpAwarded,
          highScore: out.newHighScore,
          stats: `Played ${out.stats.gamesPlayed} · Best ${out.stats.bestScore}`,
        });
        invalidateDashboardCache();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!game) {
    return (
      <ScreenShell padded={false}>
        <VoxaText variant="body">Game not found.</VoxaText>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} onLayout={() => void ensureSession()}>
        <ScreenHeader title={`${game.emoji} ${game.title}`} subtitle={game.description} />

        <GlassCard style={styles.card}>
          <VoxaText variant="body" color="textSecondary">
            Play with Voxa in Talk. When you are done, mark your result below — XP is awarded once per session.
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">Reward: up to +{game.xpReward} XP</VoxaText>

          {!result ? (
            <View style={styles.actions}>
              <PremiumButton label="Start game" onPress={() => void startTalk()} />
              <PremiumButton label="I won" disabled={busy || !session} onPress={() => void finish(true)} />
              <PremiumButton label="Finished playing" disabled={busy || !session} onPress={() => void finish(false)} />
              <Pressable onPress={() => navigation.goBack()}>
                <VoxaText variant="caption" color="textMuted">Quit</VoxaText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <VoxaText variant="subtitle">{result.highScore ? '🏆 New high score!' : 'Nice game'}</VoxaText>
              <VoxaText variant="body" color="primarySoft">+{result.xp} XP</VoxaText>
              <VoxaText variant="caption" color="textMuted">{result.stats}</VoxaText>
              <PremiumButton label="Play again" onPress={() => {
                setResult(null);
                setSession(null);
                void ensureSession();
              }} />
              <Pressable onPress={() => navigation.goBack()}>
                <VoxaText variant="caption" color="primarySoft">Back to arcade</VoxaText>
              </Pressable>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
