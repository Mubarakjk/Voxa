import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  formatTimer,
  GameChrome,
  HoldToReveal,
  PlayerNameEditor,
} from '../components/games/social-game-ui';
import { PremiumButton } from '../components/premium/premium-ui';
import { BackButton } from '../components/ui/back-button';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getGameSessionStore } from '../services/games/game-session-store';
import {
  advanceImpostorPhase,
  castImpostorVote,
  createImpostorSetup,
  getImpostorRevealSecret,
  listImpostorCategories,
  markImpostorRevealed,
  rematchImpostor,
  resolveImpostorVotes,
  tickImpostorDiscussion,
} from '../services/games/impostor-game-service';
import { ImpostorSession } from '../types/social-games';
import { hapticLight, hapticSuccess } from '../utils/haptics';

export function ImpostorGameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const store = getGameSessionStore(services.storage);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ImpostorSession | null>(null);
  const [paused, setPaused] = useState(false);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3']);
  const [category, setCategory] = useState('Random');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback(
    async (next: ImpostorSession, id?: string | null) => {
      if (!profile) return;
      const sid = id ?? sessionId;
      if (!sid) return;
      await store.updatePayload(profile.id, sid, next);
      setSession(next);
    },
    [profile, sessionId, store],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      const existing = await store.getActive<ImpostorSession>(profile.id, 'impostor');
      if (cancelled) return;
      if (existing) {
        setSessionId(existing.id);
        setSession(existing.payload);
        setPaused(existing.status === 'paused');
        setNames(existing.payload.players.map((p) => p.name));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, store]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (!session || paused || session.phase !== 'discussion') return;
    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.phase !== 'discussion') return prev;
        const next = tickImpostorDiscussion(prev);
        if (profile && sessionId) {
          void store.updatePayload(profile.id, sessionId, next);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.phase, paused, profile, sessionId, store]);

  const startNew = async () => {
    if (!profile) return;
    try {
      const payload = createImpostorSetup(names, category);
      const created = await store.create(profile.id, 'impostor', payload);
      setSessionId(created.id);
      setSession(payload);
      setPaused(false);
      void hapticSuccess();
    } catch (err) {
      // keep UI calm — surface via caption below
      void hapticLight();
    }
  };

  const leave = async () => {
    if (profile && sessionId) {
      await store.pause(profile.id, sessionId);
    }
    navigation.goBack();
  };

  const restart = async () => {
    if (!profile) return;
    const payload = createImpostorSetup(
      session?.players.map((p) => p.name) ?? names,
      session?.category ?? category,
    );
    const created = await store.create(profile.id, 'impostor', payload);
    setSessionId(created.id);
    setSession({ ...payload, phase: 'reveal' });
    setPaused(false);
  };

  if (loading) {
    return (
      <ScreenShell padded>
        <VoxaText variant="body" color="textMuted">
          Loading…
        </VoxaText>
      </ScreenShell>
    );
  }

  if (!session || session.phase === 'setup') {
    return (
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <BackButton onPress={() => navigation.goBack()} />
          <VoxaText variant="caption" color="primarySoft">
            Impostor
          </VoxaText>
          <VoxaText variant="title">Set up the circle</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Add 3–10 names. Pass the phone for private reveals. Discuss, then vote.
          </VoxaText>
          <GlassCard style={styles.block}>
            <VoxaText variant="caption" color="textMuted">
              Players
            </VoxaText>
            <PlayerNameEditor names={names} onChange={setNames} min={3} max={10} />
          </GlassCard>
          <GlassCard style={styles.block}>
            <VoxaText variant="caption" color="textMuted">
              Word category
            </VoxaText>
            <View style={styles.chips}>
              {['Random', ...listImpostorCategories()].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipActive]}>
                  <VoxaText variant="caption" color={category === c ? 'primarySoft' : 'textMuted'}>
                    {c}
                  </VoxaText>
                </Pressable>
              ))}
            </View>
          </GlassCard>
          <PremiumButton label="Continue" onPress={() => void startNew()} />
          {names.filter((n) => n.trim()).length < 3 ? (
            <VoxaText variant="caption" color="danger">
              Need at least 3 named players
            </VoxaText>
          ) : null}
        </ScrollView>
      </ScreenShell>
    );
  }

  const secret = getImpostorRevealSecret(session);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GameChrome
          title="Impostor"
          subtitle={`Round ${session.round} · ${session.category}`}
          paused={paused}
          onPause={() => {
            setPaused(true);
            if (profile && sessionId) void store.pause(profile.id, sessionId);
          }}
          onResume={() => {
            setPaused(false);
            if (profile && sessionId) void store.resume(profile.id, sessionId);
          }}
          onRestart={() => void restart()}
          onLeave={() => void leave()}>
          {session.phase === 'onboarding' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="subtitle">How it works</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                1. Pass the device. Each person holds to see a private role.
              </VoxaText>
              <VoxaText variant="body" color="textSecondary">
                2. Crew share a secret word. The Impostor does not.
              </VoxaText>
              <VoxaText variant="body" color="textSecondary">
                3. Discuss without saying the word. Vote who you think is the Impostor.
              </VoxaText>
              <PremiumButton
                label="Start secret reveals"
                onPress={() => void persist(advanceImpostorPhase(session, 'reveal'))}
              />
            </GlassCard>
          ) : null}

          {session.phase === 'reveal' && secret ? (
            <View style={styles.block}>
              <VoxaText variant="caption" color="textMuted">
                Pass to {secret.player.name} ({session.revealIndex + 1}/{session.players.length})
              </VoxaText>
              <HoldToReveal
                key={`imp-reveal-${session.revealIndex}-${secret.player.id}`}
                lockedLabel={`Private role for ${secret.player.name}`}
                revealedTitle={secret.headline}
                revealedBody={secret.body}
                onContinue={() => void persist(markImpostorRevealed(session))}
              />
            </View>
          ) : null}

          {session.phase === 'discussion' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="caption" color="textMuted">
                Discussion
              </VoxaText>
              <VoxaText variant="title">{formatTimer(session.discussionRemaining)}</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Talk, ask questions, watch reactions. Do not say the secret word out loud.
              </VoxaText>
              <PremiumButton
                label="End discussion early"
                variant="ghost"
                onPress={() =>
                  void persist({ ...session, phase: 'voting', votes: {}, discussionRemaining: 0 })
                }
              />
            </GlassCard>
          ) : null}

          {session.phase === 'voting' ? (
            <View style={styles.block}>
              <VoxaText variant="subtitle">Vote</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Each player taps once who they think is the Impostor.
              </VoxaText>
              {session.players.map((voter) => {
                const vote = session.votes[voter.id];
                return (
                  <GlassCard key={voter.id} style={styles.voteCard}>
                    <VoxaText variant="caption" color="primarySoft">
                      {voter.name} votes
                    </VoxaText>
                    <View style={styles.chips}>
                      {session.players
                        .filter((p) => p.id !== voter.id)
                        .map((accused) => (
                          <Pressable
                            key={accused.id}
                            onPress={() =>
                              void persist(castImpostorVote(session, voter.id, accused.id))
                            }
                            style={[styles.chip, vote === accused.id && styles.chipActive]}>
                            <VoxaText
                              variant="caption"
                              color={vote === accused.id ? 'primarySoft' : 'textMuted'}>
                              {accused.name}
                            </VoxaText>
                          </Pressable>
                        ))}
                    </View>
                  </GlassCard>
                );
              })}
              <PremiumButton
                label="Reveal results"
                disabled={Object.keys(session.votes).length < session.players.length}
                onPress={() => {
                  void hapticSuccess();
                  void persist(resolveImpostorVotes(session));
                }}
              />
            </View>
          ) : null}

          {session.phase === 'result' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="subtitle">
                {session.winner === 'crew' ? 'Crew wins' : 'Impostor wins'}
              </VoxaText>
              <VoxaText variant="body" color="textSecondary">
                The Impostor was{' '}
                {session.players.find((p) => p.isImpostor)?.name ?? 'unknown'}. Secret word:{' '}
                {session.secretWord}.
              </VoxaText>
              <PremiumButton
                label="Rematch"
                onPress={() => {
                  const next = rematchImpostor(session);
                  void persist(next);
                }}
              />
              <PremiumButton
                label="Back to Games Hub"
                variant="ghost"
                onPress={() => {
                  if (profile && sessionId) void store.finish(profile.id, sessionId);
                  navigation.navigate('GamesHub');
                }}
              />
            </GlassCard>
          ) : null}
        </GameChrome>
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
  block: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: { borderColor: colors.primarySoft },
  voteCard: { gap: spacing.sm },
});
