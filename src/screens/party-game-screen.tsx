import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GameChrome, PlayerNameEditor } from '../components/games/social-game-ui';
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
  advancePartyTurn,
  chooseTruthOrChallenge,
  completeTruthOrChallenge,
  createPartySession,
  currentPartyPlayer,
  finishTwoTruthsRound,
  guessTwoTruthsLie,
  parseWyr,
  partyInstructions,
  pickWouldYouRather,
  rematchParty,
  setDepthFilter,
  shuffleDeckPreview,
  startPartyPlay,
  submitTwoTruthsStatements,
  updateTwoTruths,
} from '../services/games/party-games-service';
import { getSocialGameDefinition, PartyGameId, PartyGameSession } from '../types/social-games';
import { hapticLight, hapticSuccess } from '../utils/haptics';

function isPartyGameId(id: string | undefined): id is PartyGameId {
  return (
    id === 'wouldYouRather' ||
    id === 'truthOrChallenge' ||
    id === 'twoTruthsAndALie' ||
    id === 'conversationCards'
  );
}

export function PartyGameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PartyGame'>>();
  const gameId = isPartyGameId(route.params?.gameId) ? route.params.gameId : undefined;
  const def = gameId ? getSocialGameDefinition(gameId) : undefined;
  const { profile, services } = useVoxa();
  const store = getGameSessionStore(services.storage);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<PartyGameSession | null>(null);
  const [paused, setPaused] = useState(false);
  const [names, setNames] = useState(
    gameId === 'twoTruthsAndALie' ? ['Player 1', 'Player 2', 'Player 3'] : ['Player 1', 'Player 2'],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (next: PartyGameSession) => {
      setSession(next);
      if (!profile || !sessionId) return;
      await store.updatePayload(profile.id, sessionId, next);
    },
    [profile, sessionId, store],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile || !gameId) {
        setLoading(false);
        return;
      }
      const existing = await store.getActive<PartyGameSession>(profile.id, gameId);
      if (cancelled) return;
      if (existing && existing.payload.gameId === gameId) {
        setSessionId(existing.id);
        setSession(existing.payload);
        setPaused(existing.status === 'paused');
        setNames(existing.payload.playerNames);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, profile, store]);

  const startNew = async () => {
    if (!profile || !gameId) return;
    const payload = createPartySession(gameId, names);
    const created = await store.create(profile.id, gameId, payload);
    setSessionId(created.id);
    setSession(payload);
    setPaused(false);
    setError(null);
    void hapticSuccess();
  };

  const leave = async () => {
    if (profile && sessionId) await store.pause(profile.id, sessionId);
    navigation.goBack();
  };

  const restart = async () => {
    if (!profile || !gameId) return;
    const payload = startPartyPlay(createPartySession(gameId, session?.playerNames ?? names));
    const created = await store.create(profile.id, gameId, payload);
    setSessionId(created.id);
    setSession(payload);
    setPaused(false);
  };

  if (!gameId || !def) {
    return (
      <ScreenShell padded>
        <BackButton onPress={() => navigation.goBack()} />
        <VoxaText variant="body" color="textSecondary">
          This game isn't available.
        </VoxaText>
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell padded>
        <BackButton onPress={() => navigation.goBack()} />
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
            {def.title}
          </VoxaText>
          <VoxaText variant="title">Ready to play</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            {def.description}
          </VoxaText>
          <VoxaText variant="caption" color="textMuted">
            {shuffleDeckPreview(gameId)}
          </VoxaText>
          <GlassCard style={styles.block}>
            <VoxaText variant="caption" color="textMuted">
              Players (for turn order)
            </VoxaText>
            <PlayerNameEditor
              names={names}
              onChange={setNames}
              min={gameId === 'twoTruthsAndALie' ? 3 : 2}
              max={12}
            />
          </GlassCard>
          <PremiumButton label="Continue" onPress={() => void startNew()} />
        </ScrollView>
      </ScreenShell>
    );
  }

  const player = currentPartyPlayer(session);
  const instructions = partyInstructions(gameId);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GameChrome
          title={def.title}
          subtitle={`${player}'s turn · Round ${session.round}`}
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
              <VoxaText variant="subtitle">Quick guide</VoxaText>
              {instructions.map((line) => (
                <VoxaText key={line} variant="body" color="textSecondary">
                  · {line}
                </VoxaText>
              ))}
              <PremiumButton
                label="Start playing"
                onPress={() => void persist(startPartyPlay(session))}
              />
            </GlassCard>
          ) : null}

          {session.phase === 'play' && gameId === 'wouldYouRather' ? (
            <WouldYouRatherPlay
              session={session}
              onPick={(pick) => {
                void hapticLight();
                void persist(pickWouldYouRather(session, pick));
              }}
              onNext={() => void persist(advancePartyTurn(session))}
            />
          ) : null}

          {session.phase === 'play' && gameId === 'truthOrChallenge' ? (
            <TruthOrChallengePlay
              session={session}
              onChoose={(kind) => {
                void hapticLight();
                void persist(chooseTruthOrChallenge(session, kind));
              }}
              onDone={() => {
                void hapticSuccess();
                void persist(completeTruthOrChallenge(session));
              }}
            />
          ) : null}

          {session.phase === 'play' && gameId === 'conversationCards' ? (
            <ConversationCardsPlay
              session={session}
              onDepth={(d) => void persist(setDepthFilter(session, d))}
              onNext={() => void persist(advancePartyTurn(session))}
            />
          ) : null}

          {session.phase === 'play' && gameId === 'twoTruthsAndALie' ? (
            <TwoTruthsPlay
              session={session}
              error={error}
              onChange={(patch) => void persist(updateTwoTruths(session, patch))}
              onSubmit={() => {
                try {
                  submitTwoTruthsStatements(session);
                  setError(null);
                  void hapticLight();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Fill all statements');
                }
              }}
              onGuess={(g) => {
                void hapticSuccess();
                void persist(guessTwoTruthsLie(session, g));
              }}
              onFinish={() => void persist(finishTwoTruthsRound(session))}
            />
          ) : null}

          {session.phase === 'finished' ? (
            <GlassCard style={styles.block}>
              <VoxaText variant="subtitle">Nice round</VoxaText>
              <ScoreBoard session={session} />
              <PremiumButton label="Play again" onPress={() => void persist(rematchParty(session))} />
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

          {session.phase === 'play' ? (
            <View style={styles.footerActions}>
              <ScoreBoard session={session} />
              <PremiumButton
                label="End session"
                variant="ghost"
                onPress={() => void persist({ ...session, phase: 'finished' })}
              />
            </View>
          ) : null}
        </GameChrome>
      </ScrollView>
    </ScreenShell>
  );
}

function ScoreBoard({ session }: { session: PartyGameSession }) {
  const entries = Object.entries(session.score);
  if (entries.length === 0) return null;
  return (
    <View style={styles.score}>
      <VoxaText variant="caption" color="textMuted">
        Soft score
      </VoxaText>
      {entries.map(([name, pts]) => (
        <VoxaText key={name} variant="caption" color="textSecondary">
          {name}: {pts}
        </VoxaText>
      ))}
    </View>
  );
}

function WouldYouRatherPlay({
  session,
  onPick,
  onNext,
}: {
  session: PartyGameSession;
  onPick: (pick: 'A' | 'B') => void;
  onNext: () => void;
}) {
  const card = parseWyr(session);
  if (!card) return null;
  return (
    <View style={styles.block}>
      <VoxaText variant="caption" color="textMuted">
        Would you rather…
      </VoxaText>
      <Pressable
        onPress={() => onPick('A')}
        style={[styles.choice, session.lastPick === 'A' && styles.choiceActive]}>
        <VoxaText variant="body">{card.optionA}</VoxaText>
      </Pressable>
      <VoxaText variant="caption" color="textMuted" style={styles.or}>
        or
      </VoxaText>
      <Pressable
        onPress={() => onPick('B')}
        style={[styles.choice, session.lastPick === 'B' && styles.choiceActive]}>
        <VoxaText variant="body">{card.optionB}</VoxaText>
      </Pressable>
      {session.lastPick ? (
        <PremiumButton label="Next dilemma" onPress={onNext} />
      ) : (
        <VoxaText variant="caption" color="textMuted">
          Tap a side, discuss, then continue.
        </VoxaText>
      )}
    </View>
  );
}

function TruthOrChallengePlay({
  session,
  onChoose,
  onDone,
}: {
  session: PartyGameSession;
  onChoose: (kind: 'truth' | 'challenge') => void;
  onDone: () => void;
}) {
  if (!session.pendingKind || !session.currentPrompt) {
    return (
      <GlassCard style={styles.block}>
        <VoxaText variant="subtitle">{currentPartyPlayer(session)}, your call</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Skip anything that feels uncomfortable — kindness first.
        </VoxaText>
        <PremiumButton label="Truth" onPress={() => onChoose('truth')} />
        <PremiumButton label="Challenge" variant="ghost" onPress={() => onChoose('challenge')} />
      </GlassCard>
    );
  }
  return (
    <GlassCard style={styles.block}>
      <VoxaText variant="caption" color="primarySoft">
        {session.pendingKind === 'truth' ? 'Truth' : 'Challenge'}
      </VoxaText>
      <VoxaText variant="subtitle">{session.currentPrompt}</VoxaText>
      <PremiumButton label="Done — next player" onPress={onDone} />
    </GlassCard>
  );
}

function ConversationCardsPlay({
  session,
  onDepth,
  onNext,
}: {
  session: PartyGameSession;
  onDepth: (d: PartyGameSession['depthFilter']) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.chips}>
        {(['all', 'light', 'warm', 'deep'] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => onDepth(d)}
            style={[styles.chip, session.depthFilter === d && styles.chipActive]}>
            <VoxaText variant="caption" color={session.depthFilter === d ? 'primarySoft' : 'textMuted'}>
              {d}
            </VoxaText>
          </Pressable>
        ))}
      </View>
      <GlassCard style={styles.block}>
        <VoxaText variant="caption" color="textMuted">
          Card for {currentPartyPlayer(session)}
        </VoxaText>
        <VoxaText variant="subtitle">{session.currentPrompt}</VoxaText>
        <PremiumButton label="Next card" onPress={onNext} />
      </GlassCard>
    </View>
  );
}

function TwoTruthsPlay({
  session,
  error,
  onChange,
  onSubmit,
  onGuess,
  onFinish,
}: {
  session: PartyGameSession;
  error: string | null;
  onChange: (patch: Partial<NonNullable<PartyGameSession['twoTruths']>>) => void;
  onSubmit: () => void;
  onGuess: (g: 0 | 1 | 2) => void;
  onFinish: () => void;
}) {
  const t = session.twoTruths;
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
  }, [t?.speakerName, session.cardIndex]);

  if (!t) return null;

  const filled = Boolean(t.statement1.trim() && t.statement2.trim() && t.statement3.trim());

  if (!locked && !t.revealed) {
    return (
      <GlassCard style={styles.block}>
        <VoxaText variant="subtitle">{t.speakerName} — two truths & a lie</VoxaText>
        <VoxaText variant="caption" color="textMuted">
          Mark which one is the lie, then pass for guesses.
        </VoxaText>
        {([0, 1, 2] as const).map((i) => {
          const key = `statement${i + 1}` as 'statement1' | 'statement2' | 'statement3';
          return (
            <View key={key} style={styles.ttRow}>
              <TextInput
                value={t[key]}
                onChangeText={(text) => onChange({ [key]: text })}
                placeholder={`Statement ${i + 1}`}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Pressable
                onPress={() => onChange({ lieIndex: i })}
                style={[styles.lieChip, t.lieIndex === i && styles.chipActive]}>
                <VoxaText variant="caption" color={t.lieIndex === i ? 'primarySoft' : 'textMuted'}>
                  Lie
                </VoxaText>
              </Pressable>
            </View>
          );
        })}
        {error ? (
          <VoxaText variant="caption" color="danger">
            {error}
          </VoxaText>
        ) : null}
        <PremiumButton
          label="Ready for guesses"
          disabled={!filled}
          onPress={() => {
            onSubmit();
            setLocked(true);
          }}
        />
      </GlassCard>
    );
  }

  if (!t.revealed) {
    const lines = [t.statement1, t.statement2, t.statement3];
    return (
      <GlassCard style={styles.block}>
        <VoxaText variant="caption" color="textMuted">
          Which is the lie?
        </VoxaText>
        {lines.map((line, i) => (
          <Pressable key={line + i} onPress={() => onGuess(i as 0 | 1 | 2)} style={styles.choice}>
            <VoxaText variant="body">{line}</VoxaText>
          </Pressable>
        ))}
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.block}>
      <VoxaText variant="subtitle">
        {t.guess === t.lieIndex ? 'Caught the lie!' : 'Nice bluff'}
      </VoxaText>
      <VoxaText variant="body" color="textSecondary">
        The lie was: {[t.statement1, t.statement2, t.statement3][t.lieIndex]}
      </VoxaText>
      <PremiumButton label="Next speaker" onPress={onFinish} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  block: { gap: spacing.md },
  choice: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  choiceActive: { borderColor: colors.primarySoft, backgroundColor: colors.surfaceStrong },
  or: { alignSelf: 'center' },
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
  score: { gap: 2 },
  footerActions: { gap: spacing.sm },
  input: {
    flex: 1,
    color: colors.text,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ttRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lieChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
