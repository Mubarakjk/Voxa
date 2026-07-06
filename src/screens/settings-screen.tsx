import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { showComingSoon } from '../utils/interactions';
import { buildSettingsSections } from '../utils/settings';

export function SettingsScreen() {
  const { profile, refreshProfile, resetLocalData } = useVoxa();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  if (isLoading && !profile) {
    return (
      <ScreenShell padded={false}>
        <LoadingState label="Loading settings..." />
      </ScreenShell>
    );
  }

  if (error && !profile) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message={error} onRetry={loadSettings} />
      </ScreenShell>
    );
  }

  if (!profile) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message="Profile not available." onRetry={loadSettings} />
      </ScreenShell>
    );
  }

  const settingSections = buildSettingsSections(profile);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <VoxaText variant="title" style={styles.title}>
          Settings
        </VoxaText>

        <GlassCard
          variant="highlight"
          style={styles.profile}
          onPress={() => showComingSoon('Profile')}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <VoxaText variant="subtitle" color="primary">
                {profile.displayName[0]}
              </VoxaText>
            </View>
            <View style={styles.profileInfo}>
              <VoxaText variant="subtitle">{profile.displayName}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">
                Voxa Companion · Early access
              </VoxaText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </GlassCard>

        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionHeader title={section.title} />
            <GlassCard style={styles.group}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => showComingSoon(item.label)}
                  style={({ pressed }) => [
                    styles.row,
                    index < section.items.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}>
                  <VoxaText variant="body" style={styles.rowLabel}>
                    {item.label}
                  </VoxaText>
                  <View style={styles.value}>
                    {item.value ? (
                      <VoxaText variant="caption" color="textMuted">
                        {item.value}
                      </VoxaText>
                    ) : null}
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </GlassCard>
          </View>
        ))}

        <View style={styles.section}>
          <SectionHeader title="Local data" />
          <PrimaryButton label="Reset local data" variant="ghost" onPress={resetLocalData} />
        </View>

        <VoxaText variant="caption" color="textMuted" style={styles.version}>
          Voxa v1.0.0 · Local storage mode
        </VoxaText>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  title: { marginBottom: spacing.xl },
  profile: { marginBottom: spacing.sm },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 124, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  profileInfo: { flex: 1, gap: 4, minWidth: 0 },
  section: { marginTop: spacing.section, gap: spacing.md },
  group: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  rowPressed: { backgroundColor: colors.surfaceStrong },
  rowLabel: { flex: 1, paddingRight: spacing.sm },
  value: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  version: { textAlign: 'center', marginTop: spacing.xxl },
});
