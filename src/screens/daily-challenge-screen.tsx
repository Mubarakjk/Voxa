import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { LoadingState } from '../components/ui/screen-state';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { invalidateDashboardCache } from '../hooks/use-cached-dashboard';
import { RootStackParamList } from '../navigation/types';
import { getDailyChallengeService } from '../services/phase10/daily-challenge-service';
import { DailyChallenge } from '../types/phase10-play';

function difficultyLabel(xp: number): string {
  if (xp >= 40) return 'Medium';
  if (xp >= 30) return 'Easy';
  return 'Light';
}

function whyVoxaChose(challenge: DailyChallenge): string {
  switch (challenge.source) {
    case 'goal':
      return 'This connects to one of your active goals.';
    case 'routine':
      return 'It fits what you already planned for today.';
    case 'habit':
      return 'A small habit win can shift the whole day.';
    case 'coach':
      return 'Your recent check-ins pointed here.';
    default:
      return 'A balanced nudge based on how your week is going.';
  }
}

export function DailyChallengeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, companion } = useVoxa();
  const service = getDailyChallengeService(services.storage);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoadError(null);
    try {
      const dash = await companion.getHomeDashboard(profile.id);
      setChallenge(dash.phase10.dailyChallenge);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load challenge.');
    } finally {
      setLoading(false);
    }
  }, [companion, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (action: () => Promise<DailyChallenge | null | undefined>) => {
    if (!profile) return;
    setBusy(true);
    setLoadError(null);
    try {
      const next = await action();
      if (next) setChallenge(next);
      invalidateDashboardCache();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, message: string, onOk: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void onOk() },
    ]);
  };

  if (!profile) return null;

  if (loading && !challenge) {
    return (
      <ScreenShell padded={false}>
        <LoadingState label="Loading today's challenge..." />
      </ScreenShell>
    );
  }

  const status = challenge?.status ?? 'none';

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack title="Daily challenge" subtitle="One personalised challenge for today" />

        {loadError ? (
          <GlassCard style={styles.errorCard}>
            <VoxaText variant="body" color="danger">{loadError}</VoxaText>
            <PremiumButton label="Retry" disabled={busy} onPress={() => void refresh()} />
          </GlassCard>
        ) : null}

        {!challenge ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="subtitle">No challenge yet</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Voxa will pick something when your routine or goals are ready.
            </VoxaText>
            <PremiumButton label="Refresh" disabled={busy} onPress={() => void refresh()} />
            <Pressable onPress={() => navigation.goBack()}>
              <VoxaText variant="caption" color="primarySoft">Go back</VoxaText>
            </Pressable>
          </GlassCard>
        ) : status === 'skipped' || status === 'replaced' ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="textMuted">SKIPPED</VoxaText>
            <VoxaText variant="subtitle">That is okay</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Some days need rest, not another task. You can choose a different challenge or come back tomorrow.
            </VoxaText>
            <View style={styles.actions}>
              <PremiumButton
                label="Choose another challenge"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const dash = await companion.getHomeDashboard(profile.id);
                    return service.replace(profile.id, { goals: dash.activeGoals, routine: dash.routineSummary });
                  })
                }
              />
              <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
                <VoxaText variant="body" color="primarySoft">Come back tomorrow</VoxaText>
              </Pressable>
              <Pressable onPress={() => navigation.goBack()}>
                <VoxaText variant="caption" color="textMuted">Back</VoxaText>
              </Pressable>
            </View>
          </GlassCard>
        ) : status === 'completed' ? (
          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="primarySoft">COMPLETED</VoxaText>
            <VoxaText variant="subtitle">{challenge.title}</VoxaText>
            {challenge.completedAt ? (
              <VoxaText variant="caption" color="textMuted">
                Finished {new Date(challenge.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </VoxaText>
            ) : null}
            <VoxaText variant="body" color="textSecondary">
              +{challenge.xpReward} XP earned. Nice work today.
            </VoxaText>
            <VoxaText variant="body" color="textSecondary">
              What felt different after you finished?
            </VoxaText>
            <View style={styles.actions}>
              <PremiumButton
                label="Reflect in Talk"
                disabled={busy}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Talk',
                    params: { starterPrompt: `I completed "${challenge.title}". Help me reflect on it.` },
                  })
                }
              />
              <PremiumButton
                label="Undo completion"
                disabled={busy}
                onPress={() =>
                  confirm('Undo completion?', 'XP will be removed safely.', () =>
                    run(() => service.undoComplete(profile.id)),
                  )
                }
              />
              <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Journey' })}>
                <VoxaText variant="caption" color="primarySoft">View in Journey</VoxaText>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="primarySoft">{status.toUpperCase()}</VoxaText>
            <VoxaText variant="subtitle">{challenge.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">{challenge.description}</VoxaText>
            <VoxaText variant="caption" color="textMuted">{whyVoxaChose(challenge)}</VoxaText>
            <View style={styles.metaRow}>
              <View style={styles.badge}>
                <VoxaText variant="caption" color="textSecondary">{difficultyLabel(challenge.xpReward)}</VoxaText>
              </View>
              <VoxaText variant="caption" color="textMuted">+{challenge.xpReward} XP</VoxaText>
            </View>

            {status === 'accepted' ? (
              <VoxaText variant="caption" color="primarySoft">In progress — mark complete when you are done.</VoxaText>
            ) : null}

            <View style={styles.actions}>
              {status === 'pending' ? (
                <>
                  <PremiumButton label="Accept" disabled={busy} onPress={() => void run(() => service.accept(profile.id))} />
                  <PremiumButton
                    label="Replace"
                    disabled={busy}
                    onPress={() =>
                      confirm('Replace challenge?', 'Get a different challenge for today.', () =>
                        run(async () => {
                          const dash = await companion.getHomeDashboard(profile.id);
                          return service.replace(profile.id, { goals: dash.activeGoals, routine: dash.routineSummary });
                        }),
                      )
                    }
                  />
                  <Pressable style={styles.secondaryBtn} onPress={() => confirm('Skip today?', 'You can try again tomorrow.', () => run(() => service.skip(profile.id)))}>
                    <VoxaText variant="body" color="textSecondary">Skip</VoxaText>
                  </Pressable>
                </>
              ) : null}

              {status === 'accepted' ? (
                <>
                  <PremiumButton
                    label="Mark complete"
                    disabled={busy}
                    onPress={() =>
                      confirm('Complete challenge?', 'Award XP once for today.', () =>
                        run(async () => {
                          const r = await service.complete(profile.id);
                          return r?.challenge;
                        }),
                      )
                    }
                  />
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() =>
                      navigation.navigate('MainTabs', {
                        screen: 'Talk',
                        params: { starterPrompt: `Working on: ${challenge.title}. ${challenge.description}` },
                      })
                    }>
                    <VoxaText variant="body" color="primarySoft">Add note in Talk</VoxaText>
                  </Pressable>
                  <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('PhotoMemories')}>
                    <VoxaText variant="body" color="primarySoft">Add photo memory</VoxaText>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() =>
                      confirm('Replace challenge?', 'You will lose progress on this one.', () =>
                        run(async () => {
                          const dash = await companion.getHomeDashboard(profile.id);
                          return service.replace(profile.id, { goals: dash.activeGoals, routine: dash.routineSummary });
                        }),
                      )
                    }>
                    <VoxaText variant="body" color="textSecondary">Replace</VoxaText>
                  </Pressable>
                </>
              ) : null}
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.md },
  errorCard: { gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
