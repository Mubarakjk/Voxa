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
  advanceMafiaFromIntro,
  alivePlayers,
  castMafiaVote,
  continueAfterDayResult,
  createMafiaSetup,
  getMafiaRevealSecret,
  markMafiaRevealed,
  rematchMafia,
  resolveMafiaVotes,
  resolveNight,
  setGuardianProtect,
  setNightTarget,
  setSeerPeek,
  tickMafiaDiscussion,
} from '../services/games/mafia-game-service';
import { MafiaSession } from '../types/social-games';
import { hapticLight, hapticSuccess } from '../utils/haptics';

export function MafiaGameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const store = getGameSessionStore(services.storage);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<MafiaSession | null>(null);
  const [paused, setPaused] = useState(false);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
  const [loading, setLoading] = useState(true);
  const [seerAck, setSeerAck] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback(
    async (next: MafiaSession) => {
      if (!profile || !sessionId) {
        setSession(next);
        return;
      }
      await store.updatePayload(profile.id, sessionId, next);
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
      const existing = await store.getActive<MafiaSession>(profile.id, 'mafia');
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
    if (!session || paused || session.phase !== 'day_discuss') return;
    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.phase !== 'day_discuss') return prev;
        const next = tickMafiaDiscussion(prev);
        if (profile && sessionId) void store.updatePayload(profile.id, sessionId, next);
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
      const payload = createMafiaSetup(names);
      const created = await store.create(profile.id, 'mafia', payload);
      setSessionId(created.id);
      setSession(payload);
      setPaused(false);
      void hapticSuccess();
    } catch {
      void hapticLight();
    }
  };

  const leave = async () => {
    if (profile && sessionId) await store.pause(profile.id, sessionId);
    navigation.goBack();
  };

  const restart = async () => {
    if (!profile) return;
    const payload = createMafiaSetup(session?.players.map((p) => p.name) ?? names);
    const created = await store.create(profile.id, 'mafia', { ...payload, phase: 'reveal' });
    setSessionId(created.id);
    setSession({ ...payload, phase: 'reveal' });
    setPaused(false);
    setSeerAck(false);
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

  if (!session) {
    return (
      <ScreenShell padded={false}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <BackButton onPress={() => navigation.goBack()} />
          <VoxaText variant="caption" color="primarySoft">
            Night Circle
          </VoxaText>
          <VoxaText variant="title">Gather the circle</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            5–12 players. Voxa narrates nights and days. When someone leaves, they are simply sent
            home — no scary themes.
          </VoxaText>
          <GlassCard style={styles.block}>
            <PlayerNameEditor names={names} onChange={setNames} min={5} max={12} />
          </GlassCard>
          <PremiumButton label="Continue" onPress={() => void startNew()} />
          {names.filter((n) => n.trim()).length < 5 ? (
            <VoxaText variant="caption" color="danger">
              Need at least 5 named players
            </VoxaText>
          ) : null}
        </ScrollView>
      </ScreenShell>
    );
  }

  const secret = getMafiaRevealSecret(session);
  const alive = alivePlayers(session);

  const pickTarget = (label: string, excludeIds: string[], onPick: (id: string) => void) => (
    <View style={styles.block}>
      <VoxaText variant="subtitle">{label}</VoxaText>
      <VoxaText variant="caption" color="textMuted">
        Others look away. Tap one name, then hand the device back.
      </VoxaText>
      <View style={styles.chips}>
        {alive
          .filter((p) => !excludeIds.includes(p.id))
          .map((p) => (
            <Pressable key={p.id} onPress={() => onPick(p.id)} style={styles.chip}>
              <VoxaText variant="caption" color="primarySoft">
                {p.name}
              </VoxaText>
            </Pressable>
          ))}
      </View>
    </View>
  );

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GameChrome
          title="Night Circle"
          subtitle={`Night ${session.night || '—'} · Round ${session.round}`}
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
          {session.narration.length > 0 && !['reveal', 'onboarding'].includes(session.phase) ? (
            <GlassCard style={styles.narration}>
              <VoxaText variant="caption" color="primarySoft">
                Voxa narrates
              </VoxaText>
              {session.narration.map((line) => (
                <VoxaText key={line} variant="body" color="textSecondary">
                  {line}
                </VoxaText>
              ))}
            </GlassCard>
          ) : null}

          {session.phase === 'onboarding' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="subtitle">How Night Circle works</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Hold to reveal private roles. At night, Outsiders may send someone home. The Seer
                can peek. The Guardian can protect. By day, talk and vote.
              </VoxaText>
              <PremiumButton
                label="Start secret reveals"
                onPress={() => void persist({ ...session, phase: 'reveal' })}
              />
            </GlassCard>
          ) : null}

          {session.phase === 'reveal' && secret ? (
            <View style={styles.block}>
              <VoxaText variant="caption" color="textMuted">
                Pass to {secret.player.name} ({session.revealIndex + 1}/{session.players.length})
              </VoxaText>
              <HoldToReveal
                key={`mafia-reveal-${session.revealIndex}-${secret.player.id}`}
                lockedLabel={`Private role for ${secret.player.name}`}
                revealedTitle={secret.headline}
                revealedBody={secret.body}
                onContinue={() => void persist(markMafiaRevealed(session))}
              />
            </View>
          ) : null}

          {session.phase === 'night_intro' ? (
            <PremiumButton
              label="Begin night actions"
              onPress={() => {
                setSeerAck(false);
                void persist(advanceMafiaFromIntro(session));
              }}
            />
          ) : null}

          {session.phase === 'night_outsider'
            ? pickTarget(
                'Outsiders choose',
                alive.filter((p) => p.role === 'outsider').map((p) => p.id),
                (id) => void persist(setNightTarget(session, id)),
              )
            : null}

          {session.phase === 'night_seer' ? (
            seerAck && session.seerResult ? (
              <GlassCard style={styles.block}>
                <View accessible accessibilityLabel={session.seerResult}>
                  <VoxaText variant="subtitle">{session.seerResult}</VoxaText>
                </View>
                <PremiumButton
                  label="Hide & continue"
                  onPress={() => {
                    const hasGuardian = alive.some((p) => p.role === 'guardian');
                    void persist({
                      ...session,
                      phase: hasGuardian ? 'night_guardian' : 'night_resolve',
                      narration: hasGuardian
                        ? ['Guardian — choose one person to protect tonight.']
                        : ['The night resolves…'],
                      seerResult: null,
                    });
                    setSeerAck(false);
                  }}
                />
              </GlassCard>
            ) : (
              pickTarget('Seer peeks', [], (id) => {
                const next = setSeerPeek(session, id);
                setSeerAck(true);
                void persist({ ...next, phase: 'night_seer' });
              })
            )
          ) : null}

          {session.phase === 'night_guardian'
            ? pickTarget('Guardian protects', [], (id) => void persist(setGuardianProtect(session, id)))
            : null}

          {session.phase === 'night_resolve' ? (
            <PremiumButton
              label="Reveal the morning"
              onPress={() => {
                void hapticSuccess();
                void persist(resolveNight(session));
              }}
            />
          ) : null}

          {session.phase === 'day_discuss' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="title">{formatTimer(session.discussionRemaining)}</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Discuss calmly. When ready, move to the vote.
              </VoxaText>
              <View style={styles.aliveRow}>
                {alive.map((p) => (
                  <VoxaText key={p.id} variant="caption" color="textMuted">
                    {p.name}
                  </VoxaText>
                ))}
              </View>
              <PremiumButton
                label="Go to vote"
                variant="ghost"
                onPress={() =>
                  void persist({ ...session, phase: 'day_vote', votes: {}, discussionRemaining: 0 })
                }
              />
            </GlassCard>
          ) : null}

          {session.phase === 'day_vote' ? (
            <View style={styles.block}>
              <VoxaText variant="subtitle">Day vote</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Alive players each vote who to send home.
              </VoxaText>
              {alive.map((voter) => {
                const vote = session.votes[voter.id];
                return (
                  <GlassCard key={voter.id} style={styles.voteCard}>
                    <VoxaText variant="caption" color="primarySoft">
                      {voter.name}
                    </VoxaText>
                    <View style={styles.chips}>
                      {alive
                        .filter((p) => p.id !== voter.id)
                        .map((accused) => (
                          <Pressable
                            key={accused.id}
                            onPress={() => void persist(castMafiaVote(session, voter.id, accused.id))}
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
                label="Count the votes"
                disabled={Object.keys(session.votes).length < alive.length}
                onPress={() => {
                  void hapticSuccess();
                  void persist(resolveMafiaVotes(session));
                }}
              />
            </View>
          ) : null}

          {session.phase === 'day_result' ? (
            <PremiumButton
              label="Continue to night"
              onPress={() => void persist(continueAfterDayResult(session))}
            />
          ) : null}

          {session.phase === 'win' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="subtitle">
                {session.winner === 'neighbours' ? 'Neighbours win' : 'Outsiders win'}
              </VoxaText>
              <VoxaText variant="body" color="textSecondary">
                Roles:{' '}
                {session.players
                  .map((p) => {
                    const label =
                      p.role === 'outsider'
                        ? 'Outsider'
                        : p.role === 'seer'
                          ? 'Seer'
                          : p.role === 'guardian'
                            ? 'Guardian'
                            : 'Neighbour';
                    return `${p.name} (${label})`;
                  })
                  .join(' · ')}
              </VoxaText>
              <PremiumButton label="Rematch" onPress={() => void persist(rematchMafia(session))} />
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
  narration: { gap: spacing.sm },
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
  aliveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
