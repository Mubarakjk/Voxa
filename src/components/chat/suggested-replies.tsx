import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  suggestions: string[];
  onSelect: (text: string) => void;
};

export function SuggestedReplies({ suggestions, onSelect }: Props) {
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.24)',
  },
});
