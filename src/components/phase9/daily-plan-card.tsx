import { Pressable, StyleSheet } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { spacing } from '../../constants/theme';
import { DailyPlan } from '../../types/phase9-intelligence';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  plan: DailyPlan;
  onItemPress?: (label: string) => void;
};

export function DailyPlanCard({ plan, onItemPress }: Props) {
  return (
    <StaggerFade index={1}>
      <GlassCard style={styles.card}>
        <VoxaText variant="caption" color="primarySoft">Today's plan</VoxaText>
        <VoxaText variant="body" color="textSecondary">{plan.headline}</VoxaText>
        {plan.items.map((item) => (
          <Pressable key={item.id} onPress={() => onItemPress?.(item.label)} disabled={!onItemPress}>
            <VoxaText variant="caption" color="textMuted">· {item.label}</VoxaText>
          </Pressable>
        ))}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
