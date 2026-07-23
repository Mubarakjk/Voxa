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
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>
        {thinkingAbout ? `I'm thinking about ${thinkingAbout}` : "I'm thinking about..."}
      </VoxaText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((card) => (
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
    borderRadius: radius.full,
    backgroundColor: `${colors.primarySoft}18`,
    borderWidth: 1,
    borderColor: `${colors.primarySoft}30`,
    maxWidth: 180,
  },
});
