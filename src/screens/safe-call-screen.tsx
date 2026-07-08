import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { VoiceCallStateBadge } from '../components/voice/voice-call-state-badge';
import { VoiceTranscriptPanel } from '../components/voice/voice-transcript-panel';
import { LoadingState } from '../components/ui/screen-state';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { VOXA_SAFETY } from '../constants/safety';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { useVoiceCallController } from '../hooks/use-voice-call-controller';
import { RootStackParamList } from '../navigation/types';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { createSafeCallEscalationService } from '../services/safe-call/safe-call-escalation-service';
import { formatDuration } from '../utils/interactions';
import { getVoxaDisplayName } from '../utils/companion-display';
import { TrustedContact } from '../types';

export function SafeCallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion, services } = useVoxa();
  const voice = useVoiceCallController();
  const escalation = useMemo(() => createSafeCallEscalationService(services.repositories), [services]);
  const [openingMessage, setOpeningMessage] = useState<string | null>(null);
  const [wellbeingPrompt, setWellbeingPrompt] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const lastSpokenPrompt = useRef<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!profile) return;
    const items = await companion.listTrustedContacts(profile.id);
    setContacts(items);
  }, [companion, profile]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts]),
  );

  useEffect(() => {
    if (!voice.isActive || !voice.controller.current?.activeSession) return;
    const session = voice.controller.current.activeSession;
    const level = escalation.evaluateEscalation({
      session,
      elapsedSeconds: voice.seconds,
      escalationLevel: 'none',
    });
    const prompt = escalation.getWellbeingPrompt(level);
    if (prompt && escalation.shouldAutoCheckIn({ session, elapsedSeconds: voice.seconds, escalationLevel: level })) {
      setWellbeingPrompt(prompt);
      if (lastSpokenPrompt.current !== prompt) {
        lastSpokenPrompt.current = prompt;
        void voice.speakPrompt(prompt);
      }
    }
  }, [voice.isActive, voice.seconds, escalation, voice]);

  const beginSafeCall = async () => {
    if (!profile) return;
    setIsStarting(true);
    setError(null);
    try {
      await voice.startSafeCall();
      const latest = voice.transcript.at(-1);
      setOpeningMessage(latest?.text ?? null);
      setWellbeingPrompt(null);
      lastSpokenPrompt.current = null;
    } catch (err) {
      if (err instanceof FeatureLimitError) {
        Alert.alert('Voice limit reached', err.message, [
          { text: 'Continue Free', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => navigation.navigate('Paywall', { source: 'safe-call-limit' }) },
        ]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start Safe Call.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const endSafeCall = async () => {
    await voice.endCall();
    setOpeningMessage(null);
    setWellbeingPrompt(null);
    lastSpokenPrompt.current = null;
  };

  const voxaName = getVoxaDisplayName(profile);
  const active = voice.isActive;

  if (isStarting || voice.connectionState === 'connecting') {
    return (
      <ScreenShell padded={false} glow="safe">
        <LoadingState label="Starting Safe Call..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} glow="safe">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.shield, active && styles.shieldActive]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.safe} />
          </View>
          <VoxaText variant="title">Safe Call</VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
            {active
              ? `Safety mode is active. ${voxaName} is staying with you.`
              : 'A calm space when you need someone — or safety — right now.'}
          </VoxaText>
        </View>

        <GlassCard variant="safe" style={styles.disclaimer}>
          <VoxaText variant="caption" color="textSecondary">
            {VOXA_SAFETY.safeCallDisclaimer} {VOXA_SAFETY.notEmergency}
          </VoxaText>
        </GlassCard>

        {error ? (
          <GlassCard variant="safe" style={styles.errorCard}>
            <VoxaText variant="caption" color="textSecondary">
              {error}
            </VoxaText>
            <PrimaryButton label="Try again" variant="ghost" onPress={beginSafeCall} />
          </GlassCard>
        ) : null}

        {active ? (
          <GlassCard variant="safe" style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={styles.liveDot} />
              <VoxaText variant="label" color="safe">
                Safety mode active
              </VoxaText>
            </View>
            <VoxaText variant="title" style={styles.timer}>
              {formatDuration(voice.seconds)}
            </VoxaText>
            <VoiceCallStateBadge state={voice.connectionState} />
            <VoxaText variant="body" color="textSecondary">
              {wellbeingPrompt ?? openingMessage ?? `${voxaName} is with you in voice mode.`}
            </VoxaText>
            <VoiceTranscriptPanel entries={voice.transcript.slice(-4)} voxaName={voxaName} />
            <VoxaText variant="caption" color="textMuted">
              Safety timer ·{' '}
              {voice.controller.current?.activeSession
                ? formatDuration(
                    escalation.getSafetyTimerRemainingSeconds({
                      session: voice.controller.current.activeSession,
                      elapsedSeconds: voice.seconds,
                      escalationLevel: 'none',
                    }),
                  )
                : '—'}{' '}
              remaining
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {escalation.getLocationPlaceholder()}
            </VoxaText>
            <PrimaryButton label="End Safe Call" variant="ghost" onPress={endSafeCall} />
          </GlassCard>
        ) : (
          <GlassCard variant="safe" style={styles.cta}>
            <VoxaText variant="label" color="safe">
              Quick connect
            </VoxaText>
            <VoxaText variant="subtitle">Start a Safe Call with {voxaName}</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              Calm presence, gentle check-ins, and trusted contacts if you need them.
            </VoxaText>
            <PrimaryButton label="Begin Safe Call" variant="safe" onPress={beginSafeCall} />
          </GlassCard>
        )}

        <SectionHeader title="Trusted contacts" style={styles.section} />
        {contacts.map((contact) => (
          <GlassCard key={contact.id} style={styles.contact}>
            <View style={styles.contactRow}>
              <View style={styles.avatar}>
                <VoxaText variant="caption" color="safe">
                  {contact.name[0]}
                </VoxaText>
              </View>
              <View style={styles.contactInfo}>
                <VoxaText variant="subtitle">{contact.name}</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {contact.relation}
                </VoxaText>
              </View>
              <View style={styles.badge}>
                <View style={styles.dot} />
                <VoxaText variant="caption" color="safe">
                  {contact.status}
                </VoxaText>
              </View>
            </View>
          </GlassCard>
        ))}

        <SectionHeader title="Safety tools" style={styles.section} />
        <View style={styles.tools}>
          {[
            {
              icon: 'timer-outline' as const,
              label: 'Check-in',
              value: active ? `${voice.controller.current?.activeSession?.checkInIntervalMinutes ?? 30} min` : '30 min',
            },
            { icon: 'key-outline' as const, label: 'Safe word', value: 'Set' },
            { icon: 'location-outline' as const, label: 'Location', value: escalation.getLocationPlaceholder().split(' ')[0] },
          ].map((tool) => (
            <GlassCard key={tool.label} style={styles.tool}>
              <Ionicons name={tool.icon} size={22} color={colors.safe} />
              <VoxaText variant="caption" numberOfLines={1}>
                {tool.label}
              </VoxaText>
              <VoxaText variant="label" color="textMuted" numberOfLines={1}>
                {tool.value}
              </VoxaText>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  header: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  shield: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.safeGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  shieldActive: {
    borderColor: colors.safe,
    shadowColor: colors.safe,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  subtitle: { textAlign: 'center', maxWidth: 300, lineHeight: 24 },
  disclaimer: { marginBottom: spacing.sm },
  errorCard: { gap: spacing.md, marginBottom: spacing.sm },
  cta: { gap: spacing.md, marginBottom: spacing.sm },
  activeCard: { gap: spacing.md, marginBottom: spacing.sm },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.safe,
  },
  timer: { fontSize: 36, letterSpacing: 2 },
  section: { marginTop: spacing.section },
  contact: { marginBottom: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.safeGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, gap: 2, minWidth: 0 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safe },
  tools: { flexDirection: 'row', gap: layout.cardGap },
  tool: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
});
