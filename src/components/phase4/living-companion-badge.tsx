import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { LivingCompanionExpression } from '../../types/phase4-intelligence';
import { VoxaText } from '../ui/voxa-text';

const MOOD_LABEL: Record<LivingCompanionExpression, string> = {
  calm: 'Calm',
  warm: 'Warm',
  bright: 'Bright',
  focused: 'Focused',
  playful: 'Playful',
  gentle: 'Gentle',
  proud: 'Proud',
};

type LivingCompanionBadgeProps = {
  mood: LivingCompanionExpression;
  energy: 'low' | 'medium' | 'high';
  thinkingAbout?: string | null;
};

export function LivingCompanionBadge({ mood, energy, thinkingAbout }: LivingCompanionBadgeProps) {
  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textMuted">
        {MOOD_LABEL[mood]} · {energy} energy
      </VoxaText>
      {thinkingAbout ? (
        <VoxaText variant="caption" color="primarySoft" style={styles.thinking}>
          thinking about {thinkingAbout}
        </VoxaText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  thinking: { fontStyle: 'italic' },
});
