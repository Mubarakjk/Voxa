import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { spacing } from '../../constants/theme';
import { Phase10DashboardData } from '../../types/phase10-play';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  data: Phase10DashboardData;
  onArcade: () => void;
  onAchievements: () => void;
  onDecks: () => void;
  onChallenge: () => void;
  onMission: () => void;
};

export function JourneyPlaySection({ data, onArcade, onAchievements, onDecks, onChallenge, onMission }: Props) {
  const { growth, xp } = data;
  const unlocked = data.achievements.filter((a) => a.unlockedAt).length;

  return (
    <StaggerFade index={0}>
      <GlassCard style={styles.card}>
        <VoxaText variant="caption" color="primarySoft">
          Play & growth
        </VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.levelLine}>
          Level {xp.level} · {xp.lifetimeXp} lifetime XP
        </VoxaText>

        <View style={styles.stats}>
          <Stat label="Achievements" value={`${unlocked}/${data.achievements.length}`} />
          <Stat label="Challenge streak" value={String(growth.streaks.challenge)} />
          <Stat label="Arcade streak" value={String(growth.streaks.arcade)} />
        </View>

        {growth.xpHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">
              Recent XP
            </VoxaText>
            {growth.xpHistory.slice(0, 4).map((tx) => (
              <VoxaText key={tx.id} variant="caption" color="textMuted" style={styles.line}>
                +{tx.amount} · {tx.source}
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.recentAchievements.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">
              Recent achievements
            </VoxaText>
            <VoxaText variant="caption" color="textSecondary" style={styles.line}>
              {growth.recentAchievements.map((a) => a.emoji).join(' ')}
            </VoxaText>
          </View>
        ) : null}

        {growth.challengeHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">
              Challenges completed
            </VoxaText>
            {growth.challengeHistory.slice(0, 3).map((c) => (
              <VoxaText key={c.id} variant="caption" color="textMuted" style={styles.line}>
                · {c.title}
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.missionHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">
              Mission history
            </VoxaText>
            {growth.missionHistory.slice(0, 2).map((m) => (
              <VoxaText key={m.id} variant="caption" color="textMuted" style={styles.line}>
                · {m.title} ({m.status})
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.arcadeHighScores.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">
              Best scores
            </VoxaText>
            {growth.arcadeHighScores.map((g) => (
              <VoxaText key={g.gameId} variant="caption" color="textMuted" style={styles.line}>
                · {g.title}: {g.bestScore}
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.favouriteGames.length > 0 ? (
          <VoxaText variant="caption" color="textMuted" style={styles.line}>
            Favourite games: {growth.favouriteGames.slice(0, 3).join(', ')}
          </VoxaText>
        ) : null}

        <View style={styles.links}>
          <Link label="Daily challenge" onPress={onChallenge} />
          <Link label="Weekly mission" onPress={onMission} />
          <Link label="Games Hub" onPress={onArcade} />
          <Link label="Achievement Centre" onPress={onAchievements} />
          <Link label="Conversation Decks" onPress={onDecks} />
        </View>
      </GlassCard>
    </StaggerFade>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <VoxaText variant="caption" color="textMuted" style={styles.statLabel} numberOfLines={2}>
        {label}
      </VoxaText>
      <VoxaText variant="body" style={styles.statValue}>
        {value}
      </VoxaText>
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link} hitSlop={4}>
      <VoxaText variant="caption" color="primarySoft">
        {label} →
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  levelLine: { lineHeight: 22 },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  statLabel: { lineHeight: 16 },
  statValue: { lineHeight: 22 },
  section: { gap: spacing.xs },
  line: { lineHeight: 18 },
  links: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  link: {
    minHeight: 28,
    justifyContent: 'center',
  },
});
