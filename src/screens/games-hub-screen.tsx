import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { FadeIn, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { BackButton } from '../components/ui/back-button';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getGameSessionStore } from '../services/games/game-session-store';
import { SOCIAL_GAME_CATALOG, SocialGameId } from '../types/social-games';
import { hapticLight } from '../utils/haptics';

type ResumeMap = Partial<Record<SocialGameId, boolean>>;

export function GamesHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [resumable, setResumable] = useState<ResumeMap>({});

  const loadResume = useCallback(async () => {
    if (!profile) return;
    const store = getGameSessionStore(services.storage);
    const map: ResumeMap = {};
    await Promise.all(
      SOCIAL_GAME_CATALOG.map(async (game) => {
        const active = await store.getActive(profile.id, game.id);
        if (active) map[game.id] = true;
      }),
    );
    setResumable(map);
  }, [profile, services.storage]);

  useEffect(() => {
    void loadResume();
    const unsub = navigation.addListener('focus', () => void loadResume());
    return unsub;
  }, [loadResume, navigation]);

  const openGame = (id: SocialGameId) => {
    void hapticLight();
    if (id === 'impostor') {
      navigation.navigate('ImpostorGame');
      return;
    }
    if (id === 'mafia') {
      navigation.navigate('MafiaGame');
      return;
    }
    navigation.navigate('PartyGame', { gameId: id });
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <BackButton onPress={() => navigation.goBack()} />
        <ScreenHeader
          eyebrow="Play together"
          title="Games Hub"
          subtitle="Local pass-and-play. Calm prompts. Nothing leaves this device."
        />

        <View style={styles.list}>
          {SOCIAL_GAME_CATALOG.map((game, index) => (
            <FadeIn key={game.id} delay={index * 40}>
              <Pressable
                onPress={() => openGame(game.id)}
                style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]}>
                <GlassCard style={styles.card}>
                  <View style={[styles.accent, { backgroundColor: game.accent }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <VoxaText variant="subtitle">{game.title}</VoxaText>
                      {resumable[game.id] ? (
                        <View style={styles.resumePill}>
                          <VoxaText variant="caption" color="primarySoft">
                            Resume
                          </VoxaText>
                        </View>
                      ) : null}
                    </View>
                    <VoxaText variant="body" color="textSecondary">
                      {game.tagline}
                    </VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {game.players} · {game.duration}
                    </VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {game.description}
                    </VoxaText>
                  </View>
                </GlassCard>
              </Pressable>
            </FadeIn>
          ))}
        </View>

        <GlassCard style={styles.secondary}>
          <VoxaText variant="caption" color="primarySoft">
            Also available
          </VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Companion Arcade chat games stay available as a lighter side mode.
          </VoxaText>
          <PremiumButton
            label="Open Companion Arcade"
            variant="ghost"
            onPress={() => {
              void hapticLight();
              navigation.navigate('CompanionArcade');
            }}
          />
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  list: { gap: spacing.md },
  cardPress: { borderRadius: radius.lg },
  pressed: { opacity: 0.88 },
  card: { flexDirection: 'row', overflow: 'hidden', padding: 0 },
  accent: { width: 4 },
  cardBody: { flex: 1, gap: spacing.xs, padding: spacing.md },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resumePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondary: { gap: spacing.sm },
});
