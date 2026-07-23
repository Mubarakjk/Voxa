import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  suggestions: string[];
  onSelect: (text: string) => void;
  onDismiss?: () => void;
};

export function SuggestedReplies({ suggestions, onSelect, onDismiss }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {suggestions.map((item) => (
        <Pressable key={item} style={styles.chip} onPress={() => onSelect(item)}>
          <VoxaText variant="caption" color="primarySoft">
            {item}
          </VoxaText>
        </Pressable>
      ))}
      {onDismiss ? (
        <Pressable style={styles.dismiss} onPress={onDismiss} accessibilityLabel="Dismiss suggestions">
          <VoxaText variant="caption" color="textMuted">
            Dismiss
          </VoxaText>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: `${colors.primarySoft}33`,
    maxWidth: 220,
  },
  dismiss: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
