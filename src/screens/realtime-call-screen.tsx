import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveCompanionOrb, CompanionOrbState } from '../components/live-companion/live-companion-orb';
import { PremiumButton } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { isRealtimeVoiceEnabled } from '../config/realtime-voice';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/auth-context';
import { useVoxa } from '../context/voxa-context';
import { useRealtimeCall } from '../hooks/use-realtime-call';
import { RootStackParamList } from '../navigation/types';
import { buildScheduledCallInstructions } from '../services/scheduled-calls/scheduled-call-context';
import { getScheduledCallService } from '../services/scheduled-calls/scheduled-call-service';
import { RealtimeCallState } from '../services/realtime-voice/realtime-call-state';
import { ScheduledCompanionCall } from '../types/scheduled-companion-call';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { formatDuration } from '../utils/interactions';
import { hapticLight, hapticSuccess } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'RealtimeCall'>;

function orbStateForCall(state: RealtimeCallState): CompanionOrbState {
  if (state === 'voxa_speaking') return 'speaking';
  if (state === 'user_speaking') return 'listening';
  if (state === 'voxa_thinking' || state === 'connecting' || state === 'reconnecting') return 'thinking';
  return 'idle';
}

export function RealtimeCallScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const { session } = useAuth();
  const call = useRealtimeCall();
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [scheduledCall, setScheduledCall] = useState<ScheduledCompanionCall | null>(null);
  const [scheduleReady, setScheduleReady] = useState(!route.params?.scheduledCallId);
  const answeredMarked = useRef(false);

  const voxaName = getVoxaDisplayName(profile);
  const tint = getVoxaAvatarTint(profile);
  const fromScheduled = Boolean(route.params?.fromScheduledCall || route.params?.scheduledCallId);

  useEffect(() => {
    const id = route.params?.scheduledCallId;
    if (!profile || !id) {
      setScheduleReady(true);
      return;
    }
    const svc = getScheduledCallService(services.storage);
    void svc.get(profile.id, id).then((item) => {
      setScheduledCall(item);
      setScheduleReady(true);
      if (item && !answeredMarked.current) {
        answeredMarked.current = true;
        void svc.handleAnswer(profile.id, id);
      }
    });
  }, [profile, route.params?.scheduledCallId, services.storage]);

  const begin = useCallback(async () => {
    if (!profile || call.isActive || starting || !scheduleReady) return;
    setStarting(true);
    try {
      const [goals, memories] = await Promise.all([
        services.repositories.goals.listActiveGoals(profile.id).catch(() => []),
        services.repositories.memories
          .listMemories(profile.id)
          .then((items) =>
            items
              .filter((m) => (m.importance ?? 0) >= 4 || Boolean(m.pinned))
              .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
              .slice(0, 4),
          )
          .catch(() => []),
      ]);

      const topGoal =
        (scheduledCall?.relatedGoalId
          ? goals.find((g) => g.id === scheduledCall.relatedGoalId)
          : null) ??
        goals[0] ??
        null;

      const scheduledInstructions = scheduledCall
        ? buildScheduledCallInstructions({
            profile,
            call: scheduledCall,
            topGoalTitle: topGoal?.title,
          })
        : undefined;

      await call.startCall({
        profile,
        topGoal,
        memories: scheduledCall ? [] : memories,
        scheduledInstructions,
      });
    } finally {
      setStarting(false);
    }
  }, [call, profile, scheduleReady, scheduledCall, services.repositories, starting]);

  useEffect(() => {
    if (!isRealtimeVoiceEnabled()) {
      navigation.navigate('MainTabs', { screen: 'Talk' });
      return;
    }
    if (!scheduleReady) return;
    if (route.params?.autoStart !== false) {
      void begin();
    }
  }, [begin, navigation, route.params?.autoStart, scheduleReady]);

  useEffect(() => {
    if (!session) {
      void call.endCall();
    }
  }, [call, session]);

  useEffect(() => {
    return () => {
      void call.endCall();
    };
    // Intentionally once on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!call.startedAt || !call.isActive) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - call.startedAt!) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [call.isActive, call.startedAt]);

  const end = async () => {
    void hapticLight();
    await call.endCall();
    navigation.goBack();
  };

  const retry = async () => {
    void hapticSuccess();
    await call.resetForRetry();
    await begin();
  };

  const openTalkFallback = () => {
    void call.endCall();
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: {
        starterPrompt: scheduledCall
          ? `I had a scheduled call about ${scheduledCall.title}. Can we continue here?`
          : 'Can we continue our conversation here instead?',
      },
    });
  };

  const failed = call.state === 'failed';
  const ended = call.state === 'ended';
  const statusText =
    fromScheduled && (starting || call.state === 'connecting' || call.state === 'requesting_microphone')
      ? 'Connecting your scheduled call…'
      : call.statusText;

  return (
    <ScreenShell padded={false}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={() => void end()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="End call and go back">
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Close
          </VoxaText>
        </Pressable>

        <View style={styles.hero}>
          <VoxaText variant="caption" color="textMuted" style={styles.eyebrow}>
            {fromScheduled ? 'Scheduled call' : `Call ${voxaName}`}
          </VoxaText>
          <LiveCompanionOrb
            size={180}
            tint={tint}
            active={call.isActive}
            state={orbStateForCall(call.state)}
            mood={call.state === 'voxa_speaking' ? 'happy' : 'calm'}
            intensity={call.state === 'user_speaking' || call.state === 'voxa_speaking' ? 0.85 : 0.45}
          />
          <VoxaText variant="title" style={styles.status}>
            {statusText}
          </VoxaText>
          {scheduledCall ? (
            <VoxaText variant="caption" color="textSecondary" style={styles.caption}>
              {scheduledCall.title}
            </VoxaText>
          ) : null}
          {call.isActive && call.startedAt ? (
            <View accessibilityLabel={`Call duration ${formatDuration(elapsed)}`}>
              <VoxaText variant="caption" color="textMuted">
                {formatDuration(elapsed)}
              </VoxaText>
            </View>
          ) : null}
          {call.captionsEnabled && call.caption ? (
            <VoxaText variant="body" color="textSecondary" style={styles.caption} numberOfLines={3}>
              {call.caption}
            </VoxaText>
          ) : null}
        </View>

        <View style={styles.waveRow} accessibilityElementsHidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height:
                    call.state === 'user_speaking' || call.state === 'voxa_speaking'
                      ? 10 + ((i * 7 + elapsed) % 18)
                      : 8,
                  opacity: call.isActive ? 0.7 : 0.25,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          {failed || ended ? (
            <>
              <PremiumButton label="Retry" icon="refresh" onPress={() => void retry()} />
              <PremiumButton label="Talk instead" variant="ghost" onPress={openTalkFallback} />
              <PremiumButton label="Done" variant="ghost" onPress={() => void end()} />
            </>
          ) : (
            <>
              <View style={styles.row}>
                <ControlButton
                  icon={call.muted ? 'mic-off' : 'mic'}
                  label={call.muted ? 'Unmute' : 'Mute'}
                  active={call.muted}
                  onPress={() => {
                    void hapticLight();
                    call.setMuted(!call.muted);
                  }}
                />
                <ControlButton
                  icon="chatbubble-ellipses-outline"
                  label={call.captionsEnabled ? 'Captions on' : 'Captions off'}
                  active={call.captionsEnabled}
                  onPress={() => {
                    void hapticLight();
                    call.setCaptionsEnabled(!call.captionsEnabled);
                  }}
                />
                <ControlButton icon="call" label="End" danger onPress={() => void end()} />
              </View>
              {!call.isActive && !starting ? (
                <PremiumButton label={`Call ${voxaName}`} icon="call" onPress={() => void begin()} />
              ) : null}
            </>
          )}
        </View>

        {__DEV__ ? (
          <VoxaText variant="caption" color="textMuted" style={styles.debug}>
            state={call.state}
          </VoxaText>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.control, active && styles.controlActive, danger && styles.controlDanger]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Ionicons
        name={icon}
        size={22}
        color={danger ? colors.danger : active ? colors.text : colors.primarySoft}
      />
      <VoxaText variant="caption" color={danger ? 'danger' : 'textSecondary'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'space-between',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  eyebrow: { letterSpacing: 1.2, textTransform: 'uppercase' },
  status: { textAlign: 'center', maxWidth: 320 },
  caption: { textAlign: 'center', maxWidth: 320, marginTop: spacing.xs },
  waveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
    height: 36,
  },
  waveBar: {
    width: 4,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  controls: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-around', gap: spacing.sm },
  control: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 72,
  },
  controlActive: { backgroundColor: 'rgba(45, 212, 191, 0.2)' },
  controlDanger: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: 'rgba(248, 113, 113, 0.35)' },
  debug: { textAlign: 'center', marginTop: spacing.sm },
});
