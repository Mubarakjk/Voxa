import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoadingState } from '../components/ui/screen-state';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { safeContacts } from '../constants/dummy-data';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { formatDuration } from '../utils/interactions';

export function SafeCallScreen() {
  const { profile, companion } = useVoxa();
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [openingMessage, setOpeningMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const beginSafeCall = async () => {
    if (!profile) return;
    setIsStarting(true);
    setError(null);
    try {
      const session = await companion.startSafeCallSession(profile.id);
      setOpeningMessage(session.openingMessage.content);
      setActive(true);
      setSeconds(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Safe Call.');
    } finally {
      setIsStarting(false);
    }
  };

  const endSafeCall = () => {
    setActive(false);
    setSeconds(0);
    setOpeningMessage(null);
  };

  if (isStarting) {
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
              ? 'Safety mode is active. Voxa is staying with you.'
              : 'A calm space when you need someone — or safety — right now.'}
          </VoxaText>
        </View>

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
              {formatDuration(seconds)}
            </VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {openingMessage ?? 'Voxa is monitoring your session.'}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Trusted contacts on standby · Safe word armed
            </VoxaText>
            <PrimaryButton label="End Safe Call" variant="ghost" onPress={endSafeCall} />
          </GlassCard>
        ) : (
          <GlassCard variant="safe" style={styles.cta}>
            <VoxaText variant="label" color="safe">
              Quick connect
            </VoxaText>
            <VoxaText variant="subtitle">Start a Safe Call with Voxa</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              She stays with you, checks in gently, and can alert trusted contacts if needed.
            </VoxaText>
            <PrimaryButton label="Begin Safe Call" variant="safe" onPress={beginSafeCall} />
          </GlassCard>
        )}

        <SectionHeader title="Trusted contacts" style={styles.section} />
        {safeContacts.map((contact) => (
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
            { icon: 'timer-outline' as const, label: 'Check-in', value: active ? 'Active' : '30 min' },
            { icon: 'key-outline' as const, label: 'Safe word', value: 'Set' },
            { icon: 'location-outline' as const, label: 'Location', value: 'Off' },
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
  header: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
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
