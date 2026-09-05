import { ScrollView, Pressable, StyleSheet } from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';

export type ContextChip = {
  id: string;
  label: string;
  kind: 'memory' | 'goal' | 'routine' | 'context';
};

type Props = {
  chips: ContextChip[];
  onSelect?: (chip: ContextChip) => void;
};

export function ChatContextChips({ chips, onSelect }: Props) {
  const visible = chips.filter((chip) => chip.label.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {visible.map((chip) => (
        <Pressable
          key={chip.id}
          style={[styles.chip, chip.kind === 'memory' && styles.memory, chip.kind === 'goal' && styles.goal]}
          onPress={() => onSelect?.(chip)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={chip.label}>
          <VoxaText variant="caption" color="textSecondary">{chip.label}</VoxaText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceQuiet,
    minHeight: 36,
    justifyContent: 'center',
  },
  memory: { borderColor: `${colors.primarySoft}44` },
  goal: { borderColor: `${colors.primarySoft}66` },
});
