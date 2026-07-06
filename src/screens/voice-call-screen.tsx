import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { IconButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { formatDuration } from '../utils/interactions';

export function VoiceCallScreen() {
  const { profile, companion } = useVoxa();
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [prompt, setPrompt] = useState('"Whenever you\'re ready, I\'m one tap away."');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    if (!profile) return;
    setIsStarting(true);
    setError(null);
    try {
      const session = await companion.startVoiceSession(profile.id);
      setPrompt(`"${session.openingMessage.content}"`);
      setActive(true);
      setSeconds(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voice session.');
    } finally {
      setIsStarting(false);
    }
  }, [companion, profile]);

  const toggleCall = async () => {
    if (active) {
      setActive(false);
      setSeconds(0);
      setMuted(false);
      setPrompt('"Whenever you\'re ready, I\'m one tap away."');
      return;
    }
    await startCall();
  };

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (isStarting) {
    return (
      <ScreenShell padded={false} glow="purple">
        <LoadingState label="Connecting voice session..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} glow="purple">
      <View style={styles.container}>
        <View style={styles.header}>
          <VoxaText variant="label" color="primarySoft">
            Voice Call
          </VoxaText>
          <VoxaText variant="title">Voxa</VoxaText>
          <VoxaText variant="caption" color="textSecondary">
            {active ? `Connected · ${formatDuration(seconds)}` : 'Ready when you are'}
          </VoxaText>
        </View>

        {error ? (
          <View style={styles.errorWrap}>
            <ErrorState message={error} onRetry={startCall} />
          </View>
        ) : null}

        <View style={styles.center}>
          <VoiceOrb size={220} active={active} />
          <VoxaText variant="subtitle" style={styles.listening}>
            {active ? 'Voxa is listening...' : 'Tap Call to connect'}
          </VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.prompt}>
            {prompt}
          </VoxaText>
          <View style={styles.waves}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { height: 12 + (i % 4) * 10, opacity: active ? 0.35 + (i % 3) * 0.2 : 0.12 },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            onPress={() => active && setMuted(!muted)}
            active={muted}
            disabled={!active}
          />
          <IconButton
            icon={active ? 'call' : 'call-outline'}
            label={active ? 'End' : 'Call'}
            onPress={toggleCall}
            variant={active ? 'danger' : 'default'}
            size={64}
          />
          <IconButton icon="volume-high" label="Speaker" disabled={!active} />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding + 4,
    paddingBottom: layout.tabBarHeight / 2,
  },
  header: { alignItems: 'center', gap: 6, paddingTop: spacing.sm },
  errorWrap: { paddingTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  listening: { marginTop: spacing.xxl },
  prompt: { textAlign: 'center', maxWidth: 300, lineHeight: 24, fontStyle: 'italic' },
  waves: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xl },
  bar: { width: 4, borderRadius: 4, backgroundColor: colors.primarySoft },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: spacing.lg,
  },
});
