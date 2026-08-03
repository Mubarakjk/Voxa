import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type CompanionActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  isLast?: boolean;
};

export function CompanionActionRow({
  icon,
  label,
  detail,
  onPress,
  isLast,
}: CompanionActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !isLast && styles.rowBorder]}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={layout.iconSm} color={colors.primarySoft} />
      </View>
      <View style={styles.copy}>
        <VoxaText variant="body">{label}</VoxaText>
        {detail ? (
          <VoxaText variant="caption" color="textMuted" numberOfLines={1}>
            {detail}
          </VoxaText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTapTarget + 8,
    paddingVertical: spacing.md12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  copy: { flex: 1, gap: 2 },
});
