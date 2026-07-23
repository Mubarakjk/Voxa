import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  quickPrompts: string[];
  onSelect: (prompt: string) => void;
  onFocus?: () => void;
  onCommands?: () => void;
  showFocus?: boolean;
};

export function ChatComposerToolbar({ quickPrompts, onSelect, onFocus, onCommands, showFocus }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {showFocus && onFocus ? (
          <Pressable style={styles.chipAccent} onPress={onFocus}>
            <Ionicons name="timer-outline" size={14} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">Focus</VoxaText>
          </Pressable>
        ) : null}
        {onCommands ? (
          <Pressable style={styles.chip} onPress={onCommands}>
            <Ionicons name="flash-outline" size={14} color={colors.textMuted} />
            <VoxaText variant="caption" color="textMuted">Quick</VoxaText>
          </Pressable>
        ) : null}
        {quickPrompts.map((prompt) => (
          <Pressable key={prompt} style={styles.chip} onPress={() => onSelect(prompt)}>
            <VoxaText variant="caption" color="textSecondary" numberOfLines={1}>
              {prompt.length > 28 ? `${prompt.slice(0, 28)}…` : prompt}
            </VoxaText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxWidth: 200,
  },
  chipAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.primarySoft}18`,
    borderWidth: 1,
    borderColor: `${colors.primarySoft}44`,
  },
});
