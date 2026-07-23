import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { VoiceCallHistory } from '../components/voice/voice-call-history';
import { VoiceCallStateBadge } from '../components/voice/voice-call-state-badge';
import { VoiceTranscriptPanel } from '../components/voice/voice-transcript-panel';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { IconButton, PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { getCompanionMode } from '../constants/companion-modes';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useVoiceCallController } from '../hooks/use-voice-call-controller';
import { RootStackParamList } from '../navigation/types';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { VoiceSession } from '../types';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { formatDuration } from '../utils/interactions';
import { VoicePersonality } from '../types';

const VOICE_LABELS: Record<VoicePersonality, string> = {
  warm_calm: 'Warm & calm',
  energetic: 'Energetic',
  direct: 'Direct',
  gentle: 'Gentle',
};

export function VoiceCallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useVoxa();
  const voice = useVoiceCallController();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [history, setHistory] = useState<VoiceSession[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const modeConfig = getCompanionMode(profile?.companion.lastUsedMode ?? 'friend');
  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const personality = profile?.preferences.voicePersonality ?? 'warm_calm';

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    setHistory(await voice.listCallHistory(profile.id));
  }, [profile, voice]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const startCall = async () => {
    if (!profile) return;
    setIsStarting(true);
    try {
      const mode = profile.companion.lastUsedMode ?? 'friend';
      await voice.startCall(mode);
    } catch (err) {
      if (err instanceof FeatureLimitError) {
        Alert.alert('Voice limit reached', err.message, [
          { text: 'Continue Free', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => navigation.navigate('Paywall', { source: 'voice-limit' }) },
        ]);
      } else {
        Alert.alert('Voice call failed', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const endCall = async () => {
    await voice.endCall();
    await loadHistory();
  };

  const toggleCall = async () => {
    if (voice.isActive) {
      await endCall();
      return;
    }
    await startCall();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    voice.setMicMuted(next);
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    voice.setSpeakerEnabled(next);
  };

  const testVoiceOutput = async () => {
    setIsTestingVoice(true);
    try {
      await voice.testVoiceOutput();
    } catch (err) {
      Alert.alert('Voice test failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const statusLine = voice.isActive ? formatDuration(voice.seconds) : undefined;
  const latestVoxaLine =
    [...voice.transcript].reverse().find((entry) => entry.role === 'voxa')?.text ??
    '"Whenever you\'re ready, I\'m one tap away."';

  if (isStarting || voice.connectionState === 'connecting') {
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
          <VoxaText variant="title">{voxaName}</VoxaText>
          <VoxaText variant="caption" color="textSecondary">
            {VOICE_LABELS[personality]} · {modeConfig.shortLabel}
          </VoxaText>
          <VoiceCallStateBadge state={voice.connectionState} durationLabel={statusLine} />
        </View>

        {voice.error ? (
          <View style={styles.errorWrap}>
            <ErrorState message={voice.error} onRetry={startCall} />
          </View>
        ) : null}

        <View style={styles.center}>
          <Pressable onPress={() => voice.isActive && voice.interrupt()}>
            <VoiceOrb
              size={220}
              active={voice.connectionState === 'listening' || voice.connectionState === 'speaking'}
              tint={voxaTint}
            />
          </Pressable>
          <VoxaText variant="subtitle" style={styles.listening}>
            {voice.connectionState === 'listening'
              ? `${voxaName} is listening...`
              : voice.connectionState === 'thinking'
                ? `${voxaName} is thinking...`
                : voice.connectionState === 'speaking'
                  ? `${voxaName} is speaking...`
                  : voice.connectionState === 'disconnected'
                    ? 'Call ended'
                    : 'Tap Call to connect'}
          </VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.prompt}>
            {latestVoxaLine}
          </VoxaText>

          {voice.isActive ? (
            <VoiceTranscriptPanel entries={voice.transcript} voxaName={voxaName} />
          ) : (
            <>
              <PrimaryButton
                label={isTestingVoice ? 'Testing…' : 'Test voice output'}
                variant="ghost"
                onPress={testVoiceOutput}
                disabled={isTestingVoice || isStarting}
                loading={isTestingVoice}
              />
              <VoiceCallHistory sessions={history} />
            </>
          )}

          <View style={styles.waves}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: 12 + (i % 4) * 10,
                    opacity:
                      voice.connectionState === 'listening' || voice.connectionState === 'speaking'
                        ? 0.35 + (i % 3) * 0.2
                        : 0.12,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            onPress={toggleMute}
            active={muted}
            disabled={!voice.isActive}
          />
          <IconButton
            icon={voice.isActive ? 'call' : 'call-outline'}
            label={voice.isActive ? 'End' : 'Call'}
            onPress={toggleCall}
            variant={voice.isActive ? 'danger' : 'default'}
            size={64}
          />
          <IconButton
            icon={speakerOn ? 'volume-high' : 'volume-mute'}
            label="Speaker"
            onPress={toggleSpeaker}
            active={!speakerOn}
            disabled={!voice.isActive}
          />
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
  waves: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.lg },
  bar: { width: 4, borderRadius: 4, backgroundColor: colors.primarySoft },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: spacing.lg,
  },
});
