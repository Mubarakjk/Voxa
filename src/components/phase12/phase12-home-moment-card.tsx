import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { Phase12HomeMoment } from '../../types/phase12-experiences';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  moment: Phase12HomeMoment;
  onPress: () => void;
};

const ICONS: Record<Phase12HomeMoment['kind'], keyof typeof Ionicons.glyphMap> = {
  check_in: 'notifications-outline',
  photo: 'image-outline',
  letter: 'mail-outline',
  challenge: 'flag-outline',
  news: 'newspaper-outline',
  mood: 'happy-outline',
};

export function Phase12HomeMomentCard({ moment, onPress }: Props) {
  return (
    <StaggerFade index={2}>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Ionicons name={ICONS[moment.kind]} size={18} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">{moment.title}</VoxaText>
          </View>
          <VoxaText variant="body" color="textSecondary" numberOfLines={2}>{moment.subtitle}</VoxaText>
          {'actionLabel' in moment && moment.actionLabel ? (
            <VoxaText variant="caption" color="primarySoft">{moment.actionLabel} →</VoxaText>
          ) : (
            <VoxaText variant="caption" color="textMuted">Tap to open →</VoxaText>
          )}
        </GlassCard>
      </Pressable>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.85 },
});
