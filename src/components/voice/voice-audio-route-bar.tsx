import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { VoiceAudioRoute, voiceAudioRouteService } from '../../services/voice/voice-audio-route-service';

type Props = {
  route: VoiceAudioRoute;
  speakerOn: boolean;
  onToggleSpeaker: () => void;
  onCycleRoute: () => void;
};

function routeIcon(route: VoiceAudioRoute): keyof typeof Ionicons.glyphMap {
  switch (route) {
    case 'headphones':
      return 'headset-outline';
    case 'bluetooth':
      return 'bluetooth-outline';
    case 'earpiece':
      return 'phone-portrait-outline';
    default:
      return 'volume-high-outline';
  }
}

export function VoiceAudioRouteBar({ route, speakerOn, onToggleSpeaker, onCycleRoute }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={[styles.chip, speakerOn && styles.chipActive]} onPress={onToggleSpeaker}>
        <Ionicons name={speakerOn ? 'volume-high' : 'volume-mute'} size={16} color={speakerOn ? colors.primarySoft : colors.textMuted} />
        <VoxaText variant="caption" color={speakerOn ? 'primarySoft' : 'textMuted'}>
          {speakerOn ? 'Speaker' : 'Muted'}
        </VoxaText>
      </Pressable>
      <Pressable style={styles.chip} onPress={onCycleRoute}>
        <Ionicons name={routeIcon(route)} size={16} color={colors.textSecondary} />
        <VoxaText variant="caption" color="textSecondary">
          {voiceAudioRouteService.getRouteLabel(route)}
        </VoxaText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: { borderColor: colors.primarySoft },
});
