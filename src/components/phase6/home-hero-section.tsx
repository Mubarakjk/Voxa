import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  /** Subtle top-right settings control (You / preferences). */
  onSettings?: () => void;
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
  onSettings,
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
      <View style={styles.topRow}>
        <VoxaText variant="label" color="textMuted" style={styles.eyebrow} numberOfLines={1}>
          {greeting}
        </VoxaText>
        {onSettings ? (
          <Pressable
            onPress={() => {
              void hapticLight();
              onSettings();
            }}
            hitSlop={14}
            style={({ pressed }) => [styles.settingsHit, pressed && styles.settingsPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open settings">
            <Ionicons name="settings-outline" size={20} color={colors.primarySoft} style={styles.settingsIcon} />
          </Pressable>
        ) : (
          <View style={styles.settingsSpacer} />
        )}
      </View>

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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  eyebrow: {
    flex: 1,
    letterSpacing: 1.1,
    paddingRight: spacing.sm,
  },
  settingsHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  settingsIcon: {
    opacity: 0.72,
  },
  settingsPressed: {
    opacity: 0.55,
  },
  settingsSpacer: { width: 44, height: 44 },
  orbWrap: { marginTop: spacing.xs, marginBottom: spacing.sm },
  orbPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  headline: {
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  subline: {
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  primaryWrap: { width: '100%', marginTop: spacing.xs },
  secondaryRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  secondaryLink: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
