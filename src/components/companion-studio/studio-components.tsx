import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

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
      <View style={styles.accentHeader}>
        <VoxaText variant="subtitle">{flag}</VoxaText>
        <View style={styles.accentMeta}>
          <VoxaText variant="body">{label}</VoxaText>
          {isPremium ? (
            <VoxaText variant="caption" color="primarySoft">
              Pro
            </VoxaText>
          ) : null}
          {futureSupport ? (
            <VoxaText variant="caption" color="textMuted">
              Coming soon
            </VoxaText>
          ) : null}
        </View>
      </View>
      <VoxaText variant="caption" color="textSecondary">
        {description}
      </VoxaText>
      {available && onPreview ? (
        <Pressable style={styles.previewBtn} onPress={onPreview}>
          <VoxaText variant="caption" color="primarySoft">
            {isPreviewing ? 'Playing…' : 'Hear Voxa'}
          </VoxaText>
        </Pressable>
      ) : null}
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
          <VoxaText variant="subtitle">{title}</VoxaText>
          {subtitle ? (
            <VoxaText variant="caption" color="textMuted">
              {subtitle}
            </VoxaText>
          ) : null}
        </View>
        {actionLabel ? (
          <VoxaText variant="caption" color="primarySoft">
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
      duration: 420,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
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
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  accentSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 124, 246, 0.1)',
  },
  accentDisabled: { opacity: 0.45 },
  accentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accentMeta: { flex: 1, gap: 2 },
  previewBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139, 124, 246, 0.15)',
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceStrong,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionCopy: { flex: 1, gap: 4 },
});
