import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { colors, typography } from '../../constants/theme';

type ColorKey = 'text' | 'textSecondary' | 'textMuted' | 'primary' | 'primarySoft' | 'safe' | 'danger';

const colorMap: Record<ColorKey, string> = {
  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  primary: colors.primary,
  primarySoft: colors.primarySoft,
  safe: colors.safe,
  danger: colors.danger,
};

type Props = {
  children: React.ReactNode;
  variant?: keyof typeof typography;
  color?: ColorKey;
  style?: TextStyle;
  numberOfLines?: number;
};

export function VoxaText({ children, variant = 'body', color = 'text', style, numberOfLines }: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[typography[variant], { color: colorMap[color] }, style]}>
      {children}
    </Text>
  );
}

export function SectionHeader({ title, style }: { title: string; style?: ViewStyle }) {
  return (
    <View style={[headerStyles.row, style]}>
      <VoxaText variant="label" color="textMuted">
        {title}
      </VoxaText>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: { marginBottom: 12 },
});
