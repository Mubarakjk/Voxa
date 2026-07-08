import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../constants/theme';
import { VoxaText } from './voxa-text';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'safe';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
}: PrimaryButtonProps) {
  const bg = variant === 'primary' ? colors.primary : variant === 'safe' ? colors.safe : 'transparent';
  const textColor = variant === 'ghost' ? colors.text : colors.background;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? colors.glassBorder : 'transparent' },
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.buttonDisabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={textColor} />
      ) : null}
      <VoxaText variant="caption" style={{ color: textColor, fontWeight: '700' }}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: number;
  variant?: 'default' | 'danger';
};

export function IconButton({
  icon,
  label,
  onPress,
  active,
  disabled,
  size = 52,
  variant = 'default',
}: IconButtonProps) {
  const isDanger = variant === 'danger';
  const iconColor = disabled
    ? colors.textMuted
    : isDanger
      ? colors.danger
      : active
        ? colors.primary
        : colors.textSecondary;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.iconWrap, disabled && styles.disabled]}>
      <View
        style={[
          styles.iconBtn,
          { width: size, height: size, borderRadius: size / 2 },
          active && styles.iconActive,
          isDanger && styles.iconDanger,
          disabled && styles.iconDisabled,
        ]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      {label ? (
        <VoxaText variant="caption" color={isDanger ? 'text' : 'textMuted'} style={{ fontSize: 12 }}>
          {label}
        </VoxaText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  ghost: { backgroundColor: colors.surface },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.55 },
  iconWrap: { alignItems: 'center', gap: 8 },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
  },
  iconDanger: {
    borderColor: 'rgba(248, 113, 113, 0.4)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  iconDisabled: { opacity: 0.45 },
  disabled: { opacity: 0.6 },
});
