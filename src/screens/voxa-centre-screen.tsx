import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { VoiceCallHistory } from '../components/voice/voice-call-history';
import { VoiceTranscriptPanel } from '../components/voice/voice-transcript-panel';
import { IconButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import {
  ActionPill,
  FadeIn,
  HeroOrb,
  PremiumButton,
  ScreenHeader,
} from '../components/premium/premium-ui';
import { VoiceAnimatedSubtitles } from '../components/voice/voice-animated-subtitles';
import { VoiceConnectionIndicator } from '../components/voice/voice-connection-indicator';
import { VoiceLiveWaveform } from '../components/voice/voice-live-waveform';
import { CompanionOrbState } from '../components/live-companion/live-companion-orb';
import { getAccentById } from '../constants/voice-accents';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useVoiceCallController } from '../hooks/use-voice-call-controller';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { resolveVoiceIdentity } from '../services/voice/voice-identity-resolver';
import { VoiceSession } from '../types';
import { getCompanionIdentity, getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { formatDuration } from '../utils/interactions';
import { buildCompanionStudioSnapshot } from '../services/companion-studio/companion-studio-service';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Voxa'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function VoxaCentreScreen({ navigation }: Props) {
  const route = useRoute<BottomTabScreenProps<MainTabParamList, 'Voxa'>['route']>();
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useVoxa();
  const voice = useVoiceCallController();
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [history, setHistory] = useState<VoiceSession[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [safeMode, setSafeMode] = useState(false);

  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const identity = profile ? getCompanionIdentity(profile) : null;
  const snapshot = profile ? buildCompanionStudioSnapshot(profile) : null;
  const voiceIdentity = profile ? resolveVoiceIdentity(profile) : null;
  const accent = voiceIdentity ? getAccentById(voiceIdentity.accentId) : undefined;

  const moodLabel =
    voice.connectionState === 'listening'
      ? 'Listening'
      : voice.connectionState === 'thinking'
        ? 'Thinking'
        : voice.connectionState === 'speaking'
          ? 'Speaking'
          : voice.isActive
            ? 'Connected'
            : 'Here for you';

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    setHistory(await voice.listCallHistory(profile.id));
  }, [profile, voice]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const startVoice = useCallback(async () => {
    if (!profile || voice.isActive) return;
    setIsStarting(true);
    setSafeMode(false);
    try {
      await voice.startCall(profile.companion.lastUsedMode ?? 'friend');
    } catch (err) {
      if (err instanceof FeatureLimitError) {
        Alert.alert('Voice limit reached', err.message, [
          { text: 'Continue Free', style: 'cancel' },
          { text: 'Upgrade', onPress: () => stackNav.navigate('Paywall', { source: 'voice-limit' }) },
        ]);
      } else {
        Alert.alert('Voice call failed', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [profile, voice, stackNav]);

  const startSafe = useCallback(async () => {
    if (!profile || voice.isActive) return;
    setIsStarting(true);
    setSafeMode(true);
    try {
      await voice.startSafeCall();
    } catch (err) {
      if (err instanceof FeatureLimitError) {
        Alert.alert('Voice limit reached', err.message);
      } else {
        Alert.alert('Safe Call failed', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [profile, voice]);

  useEffect(() => {
    const action = route.params?.action;
    if (!action || !profile) return;
    if (action === 'voice') void startVoice();
    if (action === 'safe') void startSafe();
    if (action === 'music') stackNav.navigate('Music');
    navigation.setParams({ action: undefined } as MainTabParamList['Voxa']);
  }, [route.params?.action, profile, startVoice, startSafe, stackNav, navigation]);

  const endCall = async () => {
    await voice.endCall();
    await loadHistory();
    setSafeMode(false);
  };

  const toggleCall = async () => {
    if (voice.isActive) {
      await endCall();
      return;
    }
    await startVoice();
  };

  const latestVoxaLine =
    [...voice.transcript].reverse().find((e) => e.role === 'voxa')?.text ?? '';
  const latestUserLine =
    [...voice.transcript].reverse().find((e) => e.role === 'user')?.text ?? '';
  const idleLine = `"Hey ${profile?.displayName?.split(' ')[0] ?? 'there'}, I'm right here."`;

  const orbState: CompanionOrbState = voice.connectionState === 'listening'
    ? 'listening'
    : voice.connectionState === 'thinking'
      ? 'thinking'
      : voice.connectionState === 'speaking'
        ? 'speaking'
        : voice.isActive
          ? 'idle'
          : 'idle';

  const waveformMode =
    voice.connectionState === 'speaking' ? 'voxa' : voice.connectionState === 'listening' ? 'user' : 'idle';

  return (
    <ScreenShell padded={false} glow="purple">
      <View style={styles.container}>
        <FadeIn>
          <ScreenHeader
            eyebrow={safeMode ? 'Safe Call' : 'Your companion'}
            title={voxaName}
            subtitle={`${snapshot?.speakingStyleLabel ?? 'Calm'} · ${accent?.flag ?? '🌍'} ${snapshot?.accentLabel ?? 'International'}`}
            right={
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, voice.isActive && styles.statusDotActive]} />
                <VoxaText variant="caption" color={voice.isActive ? 'safe' : 'textMuted'}>
                  {moodLabel}
                </VoxaText>
              </View>
            }
          />
        </FadeIn>

        {voice.isActive ? (
          <VoiceConnectionIndicator
            state={voice.connectionState}
            error={voice.error}
            durationLabel={formatDuration(voice.seconds)}
          />
        ) : null}

        <View style={styles.centre}>
          <FadeIn delay={80}>
            <HeroOrb
              tint={voxaTint}
              size={240}
              active={voice.isActive || voice.connectionState === 'listening' || voice.connectionState === 'speaking'}
              orbState={orbState}
              orbMood={safeMode ? 'focused' : 'calm'}
              intensity={voice.connectionState === 'speaking' ? 0.85 : 0.5}
              label={voice.isActive ? undefined : 'Tap to talk'}
              caption={voice.isActive ? undefined : idleLine}
              onPress={() => {
                if (voice.isActive) void voice.interrupt();
                else void toggleCall();
              }}
              onLongPress={() => navigation.navigate('Talk')}
            />
          </FadeIn>

          <VoiceLiveWaveform
            active={voice.connectionState === 'listening' || voice.connectionState === 'speaking'}
            tint={voxaTint}
            mode={waveformMode}
            intensity={0.6}
          />

          {voice.isActive ? (
            <VoiceAnimatedSubtitles
              text={
                voice.connectionState === 'speaking'
                  ? latestVoxaLine
                  : voice.connectionState === 'listening'
                    ? latestUserLine
                    : ''
              }
              speaker={voice.connectionState === 'speaking' ? 'voxa' : 'user'}
              state={voice.connectionState}
              voxaName={voxaName}
            />
          ) : null}

          {voice.isActive ? (
            <VoiceTranscriptPanel entries={voice.transcript} voxaName={voxaName} />
          ) : (
            <VoiceCallHistory sessions={history} />
          )}
        </View>

        <View style={styles.actions}>
          <ActionPill icon="chatbubbles-outline" label="Talk" onPress={() => navigation.navigate('Talk')} />
          <ActionPill icon="shield-checkmark-outline" label="Safe" onPress={() => void startSafe()} />
          <ActionPill icon="musical-notes-outline" label="Music" onPress={() => stackNav.navigate('Music')} />
          <ActionPill icon="camera-outline" label="Camera" onPress={() => navigation.navigate('Talk')} />
        </View>

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
              <IconButton icon="call" label="End" onPress={() => void endCall()} variant="danger" size={64} />
              <IconButton
                icon={speakerOn ? 'volume-high' : 'volume-mute'}
                label="Speaker"
                onPress={() => {
                  const next = !speakerOn;
                  setSpeakerOn(next);
                  voice.setSpeakerEnabled(next);
                }}
                active={!speakerOn}
              />
            </>
          ) : (
            <PremiumButton
              label={isStarting ? 'Connecting…' : 'Start voice call'}
              icon="radio-outline"
              onPress={() => void toggleCall()}
              disabled={isStarting}
            />
          )}
        </View>

        <Pressable style={styles.studioLink} onPress={() => stackNav.navigate('CompanionStudio')}>
          <Ionicons name="color-palette-outline" size={14} color={colors.textMuted} />
          <VoxaText variant="caption" color="textMuted">
            Customise voice & appearance in Companion Studio
          </VoxaText>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight / 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  statusDotActive: { backgroundColor: colors.safe },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.xl,
    minHeight: 72,
  },
  studioLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
