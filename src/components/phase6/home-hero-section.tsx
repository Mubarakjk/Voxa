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
  primaryLabel,
  onPrimary,
  onOrbPress,
  onCheckIn,
  onRoutine,
}: Props) {
  const orb = (
    <LiveCompanionOrb
      size={176}
      tint={tint}
      active
      state={orbState}
      mood={orbMood}
      intensity={orbIntensity}
    />
  );

  return (
    <View style={styles.hero}>
      <VoxaText variant="label" color="textMuted" style={styles.eyebrow}>
        {greeting}
      </VoxaText>

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
      </View>

      <VoxaText variant="display" style={styles.headline} numberOfLines={3}>
        {headline}
      </VoxaText>
      {subline ? (
        <VoxaText variant="supporting" color="textSecondary" style={styles.subline} numberOfLines={2}>
          {subline}
        </VoxaText>
      ) : null}

      <View style={styles.primaryWrap}>
        <PremiumButton label={primaryLabel} icon="chatbubbles" onPress={onPrimary} />
      </View>

      {onCheckIn || onRoutine ? (
        <View style={styles.secondaryRow}>
          {onCheckIn ? (
            <Pressable onPress={onCheckIn} style={styles.secondaryLink} accessibilityRole="button">
              <VoxaText variant="caption" color="primarySoft">
                Check in
              </VoxaText>
            </Pressable>
          ) : null}
          {onRoutine ? (
            <Pressable onPress={onRoutine} style={styles.secondaryLink} accessibilityRole="button">
              <VoxaText variant="caption" color="primarySoft">
                Routine
              </VoxaText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md12,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  eyebrow: { letterSpacing: 1.1 },
  orbWrap: { marginVertical: spacing.sm },
  orbPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  headline: { textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  subline: { textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  primaryWrap: { width: '100%', marginTop: spacing.sm },
  secondaryRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  secondaryLink: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
