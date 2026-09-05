import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { areAllFeaturesUnlocked } from '../../config/launch-mode';
import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  description?: string;
  style?: ViewStyle;
};

export function PersonalitySlider({ value, onValueChange, label, description, style }: Props) {
  const levels = [0.15, 0.5, 0.85];
  const levelLabel = value >= 0.67 ? 'High' : value <= 0.33 ? 'Low' : 'Medium';

  return (
    <Pressable
      style={[styles.row, style]}
      onPress={() => {
        const idx = levels.findIndex((l) => Math.abs(l - value) < 0.2);
        const next = levels[(idx + 1) % levels.length];
        onValueChange(next);
      }}>
      <View style={styles.copy}>
        <VoxaText variant="body">{label}</VoxaText>
        {description ? (
          <VoxaText variant="caption" color="textMuted">
            {description}
          </VoxaText>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
      <VoxaText variant="caption" color="primarySoft" style={styles.level}>
        {levelLabel}
      </VoxaText>
    </Pressable>
  );
}

type AccentCardProps = {
  flag: string;
  label: string;
  description: string;
  selected: boolean;
  available: boolean;
  isPremium?: boolean;
  futureSupport?: boolean;
  onPress: () => void;
  onPreview?: () => void;
  isPreviewing?: boolean;
};

export function AccentCard({
  flag,
  label,
  description,
  selected,
  available,
  isPremium,
  futureSupport,
  onPress,
  onPreview,
  isPreviewing,
}: AccentCardProps) {
  return (
    <Pressable
      style={[styles.accentCard, selected && styles.accentSelected, !available && styles.accentDisabled]}
      onPress={available ? onPress : undefined}
      disabled={!available}>
      <View style={styles.accentRow}>
        <VoxaText variant="body" style={styles.flag}>
          {flag}
        </VoxaText>
        <View style={styles.accentMeta}>
          <View style={styles.accentTitleRow}>
            <VoxaText variant="body" numberOfLines={1} style={styles.accentLabel}>
              {label}
            </VoxaText>
            {isPremium && !areAllFeaturesUnlocked() ? (
              <VoxaText variant="caption" color="primarySoft">
                Pro
              </VoxaText>
            ) : null}
            {futureSupport || !available ? (
              <VoxaText variant="caption" color="textMuted">
                Soon
              </VoxaText>
            ) : null}
          </View>
          <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
            {description}
          </VoxaText>
        </View>
        {available && onPreview ? (
          <Pressable
            style={styles.previewBtn}
            onPress={onPreview}
            hitSlop={8}
            accessibilityLabel={isPreviewing ? 'Playing preview' : 'Hear Voxa'}>
            <VoxaText variant="caption" color="primarySoft">
              {isPreviewing ? '…' : 'Hear'}
            </VoxaText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

type StudioSectionProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  children?: ReactNode;
  actionLabel?: string;
};

export function StudioSectionCard({ title, subtitle, onPress, children, actionLabel }: StudioSectionProps) {
  return (
    <Pressable style={styles.sectionCard} onPress={onPress} disabled={!onPress}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <VoxaText variant="body">{title}</VoxaText>
          {subtitle ? (
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
              {subtitle}
            </VoxaText>
          ) : null}
        </View>
        {actionLabel ? (
          <VoxaText variant="caption" color="primarySoft" style={styles.editLabel}>
            {actionLabel}
          </VoxaText>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

export function FadeInView({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.md12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  copy: { gap: 2 },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  level: { alignSelf: 'flex-end' },
  accentCard: {
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceQuiet,
    marginBottom: spacing.xs,
  },
  accentSelected: {
    borderColor: `${colors.primarySoft}66`,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
  },
  accentDisabled: { opacity: 0.5 },
  accentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { width: 28, textAlign: 'center' },
  accentMeta: { flex: 1, minWidth: 0, gap: 2 },
  accentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  accentLabel: { flexShrink: 1 },
  previewBtn: {
    flexShrink: 0,
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  sectionCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceQuiet,
    paddingVertical: spacing.md12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  sectionCopy: { flex: 1, minWidth: 0, gap: 2 },
  editLabel: { flexShrink: 0 },
});
