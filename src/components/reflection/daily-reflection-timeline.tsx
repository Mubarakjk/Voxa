import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DailyReflectionEntry } from '../../types/daily-reflection';
import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  entries: DailyReflectionEntry[];
  onEdit?: (entry: DailyReflectionEntry) => void;
};

export function DailyReflectionTimeline({ entries, onEdit }: Props) {
  if (!entries.length) {
    return (
      <View style={styles.empty}>
        <VoxaText variant="body" color="textMuted">
          Your reflection timeline will grow one evening at a time.
        </VoxaText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={styles.dot} />
            {index < entries.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <Pressable style={styles.card} onPress={() => onEdit?.(entry)}>
            <View style={styles.cardHeader}>
              <VoxaText variant="subtitle">{formatDate(entry.date)}</VoxaText>
              {onEdit ? <Ionicons name="create-outline" size={16} color={colors.textMuted} /> : null}
            </View>
            <ReflectionLine emoji="🙂" label="Smile" value={entry.answers.smiled} />
            <ReflectionLine emoji="🌊" label="Challenge" value={entry.answers.challenged} />
            <ReflectionLine emoji="🙏" label="Grateful" value={entry.answers.grateful} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ReflectionLine({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.answer}>
      <VoxaText variant="caption" color="primarySoft">{emoji} {label}</VoxaText>
      <VoxaText variant="body" color="textSecondary">{value}</VoxaText>
    </View>
  );
}

function formatDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 16, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginTop: 8,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.glassBorder,
    marginTop: spacing.xs,
  },
  card: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answer: { gap: 2 },
  empty: { padding: spacing.lg },
});
