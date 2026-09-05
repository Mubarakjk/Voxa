import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { ContextCard } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

type ContextCardsRowProps = {
  cards: ContextCard[];
  thinkingAbout?: string | null;
  onSelect: (card: ContextCard) => void;
};

export function ContextCardsRow({ cards, thinkingAbout, onSelect }: ContextCardsRowProps) {
  const visible = cards.filter((card) => card.label.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>
        {thinkingAbout ? `I'm thinking about ${thinkingAbout}` : "I'm thinking about..."}
      </VoxaText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {visible.map((card) => (
          <Pressable key={card.id} onPress={() => onSelect(card)} style={styles.chip}>
            <VoxaText variant="caption">{card.emoji}</VoxaText>
            <VoxaText variant="caption" color="textSecondary" numberOfLines={1}>
              {card.label}
            </VoxaText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  eyebrow: { fontStyle: 'italic' },
  row: { gap: spacing.sm, paddingBottom: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    backgroundColor: `${colors.primarySoft}18`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primarySoft}30`,
    maxWidth: 180,
    minHeight: 36,
  },
});
