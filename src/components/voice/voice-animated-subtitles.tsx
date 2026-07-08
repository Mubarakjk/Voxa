import { memo, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';
import { VoiceConnectionState } from '../../services/voice/voice-engine';

type Props = {
  text: string;
  speaker: 'user' | 'voxa';
  state: VoiceConnectionState;
  voxaName?: string;
};

function VoiceAnimatedSubtitlesComponent({ text, speaker, state, voxaName = 'Voxa' }: Props) {
  const [visible, setVisible] = useState(text);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!text) return;
    setVisible('');
    opacity.setValue(0);
    translateY.setValue(8);

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) clearInterval(interval);
    }, speaker === 'voxa' ? 22 : 18);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();

    return () => clearInterval(interval);
  }, [text, speaker, opacity, translateY]);

  if (!text && state !== 'thinking') return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      <VoxaText variant="caption" color="textMuted" style={styles.label}>
        {state === 'thinking' ? `${voxaName} is thinking…` : speaker === 'voxa' ? voxaName : 'You'}
      </VoxaText>
      <View style={[styles.bubble, speaker === 'user' && styles.userBubble]}>
        <VoxaText variant="body" color="textSecondary" style={styles.text}>
          {state === 'thinking' ? '…' : visible}
          {speaker === 'voxa' && visible.length < text.length ? '▍' : ''}
        </VoxaText>
      </View>
    </Animated.View>
  );
}

export const VoiceAnimatedSubtitles = memo(VoiceAnimatedSubtitlesComponent);

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingHorizontal: spacing.md, gap: spacing.xs },
  label: { textAlign: 'center' },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  userBubble: { backgroundColor: 'rgba(99, 102, 241, 0.12)' },
  text: { textAlign: 'center', lineHeight: 24 },
});
