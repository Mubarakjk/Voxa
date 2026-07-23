import { MoodTimelineEntry, MOOD_INTELLIGENCE_LABELS, moodLabelDisplay } from '../../types/mood-intelligence';
import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

type Props = {
  entries: MoodTimelineEntry[];
  limit?: number;
};

export function MoodTimelineSection({ entries, limit = 14 }: Props) {
  const items = entries.slice(0, limit);
  if (!items.length) {
    return (
      <GlassCard style={styles.card}>
        <VoxaText variant="body" color="textMuted">
          Mood timeline will appear as you chat, log journal entries, or use voice.
        </VoxaText>
      </GlassCard>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((entry) => {
        const emoji = MOOD_INTELLIGENCE_LABELS.find((item) => item.id === entry.mood)?.emoji ?? '•';
        return (
          <GlassCard key={entry.id} style={styles.card}>
            <View style={styles.row}>
              <VoxaText variant="subtitle">{emoji}</VoxaText>
              <View style={styles.copy}>
                <VoxaText variant="subtitle">{moodLabelDisplay(entry.mood)}</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {entry.detectedAt.slice(0, 16).replace('T', ' ')} · {entry.source}
                  {entry.confidence ? ` · ${Math.round(entry.confidence * 100)}%` : ''}
                </VoxaText>
                {entry.snippet ? (
                  <VoxaText variant="caption" color="textSecondary" numberOfLines={2}>
                    {entry.snippet}
                  </VoxaText>
                ) : null}
              </View>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 2 },
});
