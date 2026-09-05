import { Pressable, StyleSheet, View } from 'react-native';

import { LiveCompanionOrb, CompanionOrbMood, CompanionOrbState } from '../live-companion/live-companion-orb';
import { VoxaText } from '../ui/voxa-text';
import { FadeIn } from '../premium/premium-ui';
import { colors, spacing } from '../../constants/theme';

type Props = {
  voxaName: string;
  tint: string;
  greeting: string;
  emotionalLine?: string | null;
  orbMood?: CompanionOrbMood;
  orbState?: CompanionOrbState;
  starters: string[];
  onSelectStarter: (text: string) => void;
};

export function ChatEmptyState({
  voxaName,
  tint,
  greeting,
  emotionalLine,
  orbMood = 'calm',
  orbState = 'idle',
  starters,
  onSelectStarter,
}: Props) {
  return (
    <FadeIn>
      <View style={styles.wrap}>
        <LiveCompanionOrb size={72} tint={tint} active mood={orbMood} state={orbState} intensity={0.45} />
        <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>
          {greeting}
        </VoxaText>
        <VoxaText variant="subtitle" style={styles.headline}>
          {emotionalLine ?? `I'm here whenever you're ready, ${voxaName.split(' ')[0] || voxaName}.`}
        </VoxaText>
        <VoxaText variant="caption" color="textMuted" style={styles.hint}>
          Say what's on your mind — or tap a starter below.
        </VoxaText>
        <View style={styles.starters}>
          {starters.slice(0, 3).map((starter) => (
            <Pressable
              key={starter}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => onSelectStarter(starter)}>
              <VoxaText variant="caption" color="textSecondary">
                {starter}
              </VoxaText>
            </Pressable>
          ))}
        </View>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: { letterSpacing: 0.6, marginTop: spacing.xs },
  headline: { textAlign: 'center', lineHeight: 26, maxWidth: 280, fontSize: 18 },
  hint: { textAlign: 'center', marginBottom: spacing.xs, maxWidth: 260 },
  starters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceQuiet,
    maxWidth: '100%',
  },
  chipPressed: { opacity: 0.75 },
});
