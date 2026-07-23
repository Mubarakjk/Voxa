import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { GlassCard } from '../components/ui/glass-card';
import { EmptyState, FadeIn, ScreenHeader } from '../components/premium/premium-ui';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { ARCADE_GAMES } from '../services/phase10/arcade-games';
import { getArcadeService } from '../services/phase10/arcade-service';
import { ArcadeGameDefinition } from '../types/phase10-play';

export function CompanionArcadeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [stats, setStats] = useState<Record<string, { gamesPlayed: number; wins: number; streak: number }>>({});

  const loadStats = useCallback(async () => {
    if (!profile) return;
    const s = await getArcadeService(services.storage).getStats(profile.id);
    setStats(s);
  }, [profile, services.storage]);

  const playGame = (game: ArcadeGameDefinition) => {
    navigation.navigate('ArcadeGameSession', { gameId: game.id });
  };

  return (
    <ScreenShell padded={false}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Companion Arcade"
          subtitle="Chat games with Voxa — lighter side modes. For party games, open Games Hub."
          right={
            <Pressable onPress={() => navigation.navigate('GamesHub')}>
              <VoxaText variant="caption" color="primarySoft">
                Games Hub →
              </VoxaText>
            </Pressable>
          }
        />
      </View>
      <FlatList
        data={ARCADE_GAMES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onLayout={() => void loadStats()}
        ListHeaderComponent={
          <Pressable onPress={() => navigation.navigate('GamesHub')} style={styles.hubLink}>
            <GlassCard style={styles.hubCard}>
              <VoxaText variant="subtitle">Social Games Hub</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Impostor, Night Circle, Would You Rather, and more — local pass-and-play.
              </VoxaText>
            </GlassCard>
          </Pressable>
        }
        renderItem={({ item, index }) => {
          const s = stats[item.id];
          return (
            <FadeIn delay={index * 30}>
              <Pressable onPress={() => playGame(item)}>
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <VoxaText variant="subtitle">{item.emoji} {item.title}</VoxaText>
                    <VoxaText variant="caption" color="primarySoft">+{item.xpReward} XP</VoxaText>
                  </View>
                  <VoxaText variant="caption" color="textMuted">{item.description}</VoxaText>
                  {s ? (
                    <VoxaText variant="caption" color="textMuted">
                      Played {s.gamesPlayed} · Wins {s.wins} · Streak {s.streak}
                    </VoxaText>
                  ) : null}
                </GlassCard>
              </Pressable>
            </FadeIn>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="game-controller-outline" title="No games" message="Arcade games will appear here." />
        }
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  list: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hubLink: { marginBottom: spacing.sm },
  hubCard: { gap: spacing.xs },
});
