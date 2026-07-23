import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LiveCompanionOrb, CompanionOrbMood, CompanionOrbState } from '../live-companion/live-companion-orb';
import { PremiumButton } from '../premium/premium-ui';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { hapticLight } from '../../utils/haptics';

type Props = {
  greeting: string;
  headline: string;
  subline: string;
  tint: string;
  orbMood?: CompanionOrbMood;
  orbState?: CompanionOrbState;
  orbIntensity?: number;
  moodReason?: string;
  ritualRing?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  onOrbPress?: () => void;
  onCheckIn?: () => void;
  onRoutine?: () => void;
};

export function HomeHeroSection({
  greeting,
  headline,
  subline,
  tint,
  orbMood = 'calm',
  orbState = 'idle',
  orbIntensity = 0.5,
  moodReason,
  ritualRing,
  primaryLabel,
  onPrimary,
  onOrbPress,
  onCheckIn,
  onRoutine,
}: Props) {
  const orb = (
    <LiveCompanionOrb
      size={200}
      tint={tint}
      active
      state={orbState}
      mood={orbMood}
      intensity={orbIntensity}
    />
  );

  return (
    <View style={styles.hero}>
      <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>{greeting}</VoxaText>

      <View style={styles.orbWrap}>
        {onOrbPress ? (
          <Pressable
            onPress={() => {
              void hapticLight();
              onOrbPress();
            }}
            style={({ pressed }) => [pressed && styles.orbPressed]}>
            {orb}
          </Pressable>
        ) : (
          orb
        )}
        {ritualRing ? <View style={styles.ritualBadge}>{ritualRing}</View> : null}
      </View>

      {moodReason ? (
        <VoxaText variant="caption" color="primarySoft" style={styles.moodReason}>{moodReason}</VoxaText>
      ) : null}

      <VoxaText variant="title" style={styles.headline}>{headline}</VoxaText>
      <VoxaText variant="body" color="textSecondary" style={styles.subline}>{subline}</VoxaText>

      <PremiumButton label={primaryLabel} icon="chatbubbles" onPress={onPrimary} />

      <View style={styles.secondaryRow}>
        {onCheckIn ? (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onCheckIn}>
            <Ionicons name="sunny-outline" size={14} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">Check in</VoxaText>
          </Pressable>
        ) : null}
        {onRoutine ? (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onRoutine}>
            <Ionicons name="repeat-outline" size={14} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">Routine</VoxaText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  eyebrow: { letterSpacing: 1.2, textTransform: 'uppercase' },
  orbWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ritualBadge: { position: 'absolute', top: 4, right: -8 },
  orbPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  moodReason: { letterSpacing: 0.3, marginTop: -spacing.xs },
  headline: { textAlign: 'center', lineHeight: 32 },
  subline: { textAlign: 'center', maxWidth: 320, lineHeight: 24 },
  secondaryRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
