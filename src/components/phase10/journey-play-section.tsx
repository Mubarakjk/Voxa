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
        <VoxaText variant="caption" color="primarySoft">Play & growth</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Level {xp.level} · {xp.lifetimeXp} lifetime XP
        </VoxaText>

        <View style={styles.stats}>
          <Stat label="Achievements" value={`${unlocked}/${data.achievements.length}`} />
          <Stat label="Challenge streak" value={String(growth.streaks.challenge)} />
          <Stat label="Arcade streak" value={String(growth.streaks.arcade)} />
        </View>

        {growth.xpHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">Recent XP</VoxaText>
            {growth.xpHistory.slice(0, 4).map((tx) => (
              <VoxaText key={tx.id} variant="caption" color="textMuted">
                +{tx.amount} · {tx.source}
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.recentAchievements.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">Recent achievements</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              {growth.recentAchievements.map((a) => a.emoji).join(' ')}
            </VoxaText>
          </View>
        ) : null}

        {growth.challengeHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">Challenges completed</VoxaText>
            {growth.challengeHistory.slice(0, 3).map((c) => (
              <VoxaText key={c.id} variant="caption" color="textMuted">· {c.title}</VoxaText>
            ))}
          </View>
        ) : null}

        {growth.missionHistory.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">Mission history</VoxaText>
            {growth.missionHistory.slice(0, 2).map((m) => (
              <VoxaText key={m.id} variant="caption" color="textMuted">
                · {m.title} ({m.status})
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.arcadeHighScores.length > 0 ? (
          <View style={styles.section}>
            <VoxaText variant="caption" color="textMuted">Best scores</VoxaText>
            {growth.arcadeHighScores.map((g) => (
              <VoxaText key={g.gameId} variant="caption" color="textMuted">
                · {g.title}: {g.bestScore}
              </VoxaText>
            ))}
          </View>
        ) : null}

        {growth.favouriteGames.length > 0 ? (
          <VoxaText variant="caption" color="textMuted">
            Favourite games: {growth.favouriteGames.slice(0, 3).join(', ')}
          </VoxaText>
        ) : null}

        <View style={styles.links}>
          <Link label="Daily challenge" onPress={onChallenge} />
          <Link label="Weekly mission" onPress={onMission} />
          <Link label="Companion Arcade" onPress={onArcade} />
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
      <VoxaText variant="caption" color="textMuted">{label}</VoxaText>
      <VoxaText variant="body">{value}</VoxaText>
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <VoxaText variant="caption" color="primarySoft">{label} →</VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.xs },
  links: { gap: spacing.xs, paddingTop: spacing.xs },
});
