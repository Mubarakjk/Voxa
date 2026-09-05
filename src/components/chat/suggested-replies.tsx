import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  suggestions: string[];
  onSelect: (text: string) => void;
  onDismiss?: () => void;
};

export function SuggestedReplies({ suggestions, onSelect, onDismiss }: Props) {
  const chips = suggestions.map((item) => item.trim()).filter(Boolean);
  if (chips.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
        decelerationRate="fast">
        {chips.map((item) => (
          <Pressable
            key={item}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => onSelect(item)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={item}>
            <VoxaText variant="caption" color="textSecondary" style={styles.chipText} numberOfLines={1}>
              {item}
            </VoxaText>
          </Pressable>
        ))}
        {onDismiss ? (
          <Pressable
            style={({ pressed }) => [styles.dismiss, pressed && styles.chipPressed]}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss suggestions">
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  scroll: {
    flexGrow: 0,
    width: '100%',
  },
  row: {
    gap: spacing.xs,
    paddingVertical: 4,
    paddingRight: spacing.lg,
    alignItems: 'center',
  },
  chip: {
    maxWidth: 200,
    minHeight: 32,
    paddingHorizontal: spacing.md12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceQuiet,
    justifyContent: 'center',
  },
  chipPressed: { opacity: 0.7 },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    flexShrink: 1,
  },
  dismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceQuiet,
  },
});
