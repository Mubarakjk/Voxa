import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { EveningRitualContent, MorningRitualContent } from '../../types/ritual';
import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type RitualOverviewProps = {
  period: 'morning' | 'evening';
  content: MorningRitualContent | EveningRitualContent;
};

function StatRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Ionicons name={icon} size={16} color={colors.primarySoft} />
      <View style={styles.statCopy}>
        <VoxaText variant="caption" color="textMuted">
          {label}
        </VoxaText>
        <VoxaText variant="body" color="textSecondary">
          {value}
        </VoxaText>
      </View>
    </View>
  );
}

export function RitualOverview({ period, content }: RitualOverviewProps) {
  const isMorning = period === 'morning';
  const morning = isMorning ? (content as MorningRitualContent) : null;
  const evening = !isMorning ? (content as EveningRitualContent) : null;

  return (
    <View style={styles.wrap}>
      {content.specialMoment ? (
        <View style={styles.special}>
          <VoxaText variant="label" color="primarySoft">
            {content.specialMoment.title}
          </VoxaText>
          <VoxaText variant="body" color="textSecondary">
            {content.specialMoment.message}
          </VoxaText>
        </View>
      ) : null}

      {content.missedDayMessage ? (
        <VoxaText variant="body" color="textSecondary" style={styles.missed}>
          {content.missedDayMessage}
        </VoxaText>
      ) : null}

      {isMorning && morning ? (
        <>
          {morning.smartContext ? (
            <StatRow icon="bulb-outline" label="Today" value={morning.smartContext} />
          ) : null}
          <StatRow icon="flame-outline" label="Routine streak" value={`${morning.routineStreak} days`} />
          {morning.mainGoal ? (
            <StatRow icon="flag-outline" label="Main goal" value={morning.mainGoal} />
          ) : null}
          <StatRow icon="calendar-outline" label="Today's routine" value={morning.routineSummary} />
          <StatRow icon="chatbubble-ellipses-outline" label="Coach" value={morning.coachMessage} />
          <StatRow icon="happy-outline" label="Mood" value={morning.moodLabel} />
          <StatRow icon="compass-outline" label="Today's focus" value={morning.todaysFocus} />
          <StatRow icon="book-outline" label="Quote" value={morning.dailyQuote} />
          <StatRow icon="trophy-outline" label="Challenge" value={morning.dailyChallenge} />
        </>
      ) : null}

      {!isMorning && evening ? (
        <>
          {evening.wins.map((win) => (
            <StatRow key={win} icon="checkmark-circle-outline" label="Win" value={win} />
          ))}
          {evening.totalRoutines > 0 ? (
            <StatRow
              icon="calendar-outline"
              label="Routines"
              value={`${evening.completedRoutines}/${evening.totalRoutines} completed`}
            />
          ) : null}
          {evening.photosToday > 0 ? (
            <StatRow icon="camera-outline" label="Photos today" value={String(evening.photosToday)} />
          ) : null}
          {evening.memoriesToday > 0 ? (
            <StatRow icon="sparkles-outline" label="Memories today" value={String(evening.memoriesToday)} />
          ) : null}
          {evening.conversationHighlight ? (
            <StatRow icon="chatbubbles-outline" label="Highlight" value={evening.conversationHighlight} />
          ) : null}
          <StatRow icon="chatbubble-ellipses-outline" label="Coach advice" value={evening.coachAdvice} />
          <StatRow icon="sunny-outline" label="Tomorrow's focus" value={evening.tomorrowFocus} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  special: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(139, 124, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.25)',
    gap: spacing.xs,
  },
  missed: { fontStyle: 'italic', textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  statCopy: { flex: 1, gap: 2 },
});
