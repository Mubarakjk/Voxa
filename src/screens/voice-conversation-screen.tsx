import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveCompanionOrb, CompanionOrbState } from '../components/live-companion/live-companion-orb';
import { IconButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceAnimatedSubtitles } from '../components/voice/voice-animated-subtitles';
import { VoiceAudioRouteBar } from '../components/voice/voice-audio-route-bar';
import { VoiceConnectionIndicator } from '../components/voice/voice-connection-indicator';
import { VoiceLiveWaveform } from '../components/voice/voice-live-waveform';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useVoiceCallController } from '../hooks/use-voice-call-controller';
import { useVoiceMetering } from '../hooks/use-voice-metering';
import { RootStackParamList } from '../navigation/types';
import { isPaywallEnabled } from '../config/launch-mode';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { navigateToPaywall } from '../utils/paywall-navigation';
import { mapMoodToOrb } from '../services/intelligence/mood-adaptation-service';
import { getMoodIntelligenceService } from '../services/intelligence/mood-intelligence-service';
import { VoiceAudioRoute, voiceAudioRouteService } from '../services/voice/voice-audio-route-service';
import { getCompanionIdentity, getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { formatDuration } from '../utils/interactions';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceConversation'>;

export function VoiceConversationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const voice = useVoiceCallController();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [audioRoute, setAudioRoute] = useState<VoiceAudioRoute>('speaker');
  const [starting, setStarting] = useState(false);
  const [detectedMood, setDetectedMood] = useState<ReturnType<typeof mapMoodToOrb>>('calm');

  const metering = useVoiceMetering(voice.connectionState, voice.isActive);
  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const identity = profile ? getCompanionIdentity(profile) : null;

  const start = useCallback(async () => {
    if (!profile || voice.isActive) return;
    setStarting(true);
    try {
      if (route.params?.safe) await voice.startSafeCall();
      else await voice.startCall(profile.companion.lastUsedMode ?? 'friend');
    } catch (err) {
      if (err instanceof FeatureLimitError) {
        if (isPaywallEnabled()) {
          Alert.alert('Voice limit reached', err.message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigateToPaywall(navigation, 'voice-limit') },
          ]);
        } else {
          Alert.alert('Voice unavailable', err instanceof Error ? err.message : 'Try again.');
        }
      } else {
        Alert.alert('Voice failed', err instanceof Error ? err.message : 'Try again.');
      }
    } finally {
      setStarting(false);
    }
  }, [navigation, profile, route.params?.safe, voice]);

  useEffect(() => {
    if (!profile) return;
    void getMoodIntelligenceService(services.storage)
      .getCurrentMood(profile.id)
      .then((snap) => {
        if (snap.current) setDetectedMood(mapMoodToOrb(snap.current));
      });
    if (route.params?.autoStart) void start();
  }, [profile, route.params?.autoStart, services.storage, start]);

  const latestVoxaLine = useMemo(
    () => [...voice.transcript].reverse().find((entry) => entry.role === 'voxa')?.text ?? '',
    [voice.transcript],
  );
  const latestUserLine = useMemo(
    () => [...voice.transcript].reverse().find((entry) => entry.role === 'user')?.text ?? '',
    [voice.transcript],
  );

  const orbState: CompanionOrbState =
    voice.connectionState === 'listening'
      ? 'listening'
      : voice.connectionState === 'thinking'
        ? 'thinking'
        : voice.connectionState === 'speaking'
          ? 'speaking'
          : 'idle';

  const waveformMode =
    voice.connectionState === 'speaking' ? 'voxa' : voice.connectionState === 'listening' ? 'user' : 'idle';
  const waveformIntensity =
    voice.connectionState === 'listening'
      ? Math.max(0.35, metering)
      : voice.connectionState === 'speaking'
        ? 0.75
        : 0.25;

  const end = async () => {
    await voice.endCall();
    navigation.goBack();
  };

  return (
    <ScreenShell padded={false} glow="purple">
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => void end()} style={styles.back}>
            <Ionicons name="chevron-down" size={22} color={colors.primarySoft} />
            <VoxaText variant="caption" color="primarySoft">Minimize</VoxaText>
          </Pressable>
          {voice.isActive ? (
            <VoxaText variant="caption" color="textMuted">{formatDuration(voice.seconds)}</VoxaText>
          ) : null}
        </View>

        {voice.isActive ? (
          <VoiceConnectionIndicator state={voice.connectionState} error={voice.error} durationLabel={formatDuration(voice.seconds)} />
        ) : null}

        <View style={styles.centre}>
          <Pressable
            onPress={() => {
              if (voice.isActive && (voice.connectionState === 'speaking' || voice.connectionState === 'listening')) {
                void voice.interrupt();
              } else if (!voice.isActive) void start();
            }}>
            <LiveCompanionOrb
              size={260}
              tint={voxaTint}
              mood={detectedMood}
              state={orbState}
              intensity={waveformIntensity}
              active={voice.isActive || starting}
            />
          </Pressable>

          <VoxaText variant="subtitle" color="primarySoft">{voxaName}</VoxaText>
          <VoxaText variant="caption" color="textMuted">
            {identity?.personalityStyle ?? 'Companion'} · Tap orb to {voice.connectionState === 'speaking' ? 'interrupt' : 'talk'}
          </VoxaText>

          <VoiceLiveWaveform
            active={voice.connectionState === 'listening' || voice.connectionState === 'speaking'}
            tint={voxaTint}
            mode={waveformMode}
            intensity={waveformIntensity}
          />

          {voice.isActive ? (
            <VoiceAnimatedSubtitles
              text={voice.connectionState === 'speaking' ? latestVoxaLine : voice.connectionState === 'listening' ? latestUserLine : ''}
              speaker={voice.connectionState === 'speaking' ? 'voxa' : 'user'}
              state={voice.connectionState}
              voxaName={voxaName}
            />
          ) : (
            <VoxaText variant="body" color="textSecondary" style={styles.prompt}>
              {starting ? 'Connecting…' : 'Start a voice conversation — Voxa adapts to your mood.'}
            </VoxaText>
          )}
        </View>

        <VoiceAudioRouteBar
          route={audioRoute}
          speakerOn={speakerOn}
          onToggleSpeaker={() => {
            const next = !speakerOn;
            setSpeakerOn(next);
            voice.setSpeakerEnabled(next);
            void voiceAudioRouteService.setSpeakerEnabled(next);
          }}
          onCycleRoute={() => {
            const next = voiceAudioRouteService.cycleRoute();
            setAudioRoute(next);
            if (next === 'earpiece') {
              setSpeakerOn(false);
              voice.setSpeakerEnabled(false);
            } else if (next === 'speaker') {
              setSpeakerOn(true);
              voice.setSpeakerEnabled(true);
            }
          }}
        />

        <View style={styles.controls}>
          {voice.isActive ? (
            <>
              <IconButton
                icon={muted ? 'mic-off' : 'mic'}
                label={muted ? 'Unmute' : 'Mute'}
                onPress={() => {
                  const next = !muted;
                  setMuted(next);
                  voice.setMicMuted(next);
                }}
                active={muted}
              />
              <IconButton icon="hand-left-outline" label="Interrupt" onPress={() => void voice.interrupt()} />
              <IconButton icon="call" label="End" onPress={() => void end()} variant="danger" size={64} />
              <IconButton
                icon={speakerOn ? 'volume-high' : 'volume-mute'}
                label="Speaker"
                onPress={() => {
                  const next = !speakerOn;
                  setSpeakerOn(next);
                  voice.setSpeakerEnabled(next);
                  void voiceAudioRouteService.setSpeakerEnabled(next);
                  setAudioRoute(next ? 'speaker' : 'earpiece');
                }}
                active={!speakerOn}
              />
            </>
          ) : (
            <IconButton icon="radio-outline" label={starting ? 'Starting…' : 'Start'} onPress={() => void start()} size={64} />
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  prompt: { textAlign: 'center', paddingHorizontal: spacing.lg },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.lg,
    minHeight: 72,
  },
});
