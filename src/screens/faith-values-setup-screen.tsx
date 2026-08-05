import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { FadeIn, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { trackEvent } from '../services/analytics/analytics-service';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { FaithValuesMode, faithModeLabel } from '../types/faith-values';
import { hapticLight, hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'FaithValuesSetup'>;

const MODE_OPTIONS: Array<{ id: FaithValuesMode; label: string; detail: string }> = [
  { id: 'off', label: 'Not now', detail: 'Hide Faith & Values completely' },
  { id: 'general', label: 'General values & gratitude', detail: 'Reflection, intentions and kindness' },
  { id: 'islam', label: 'Islam', detail: 'Private duas, prayer routine and faith reflection' },
  { id: 'personal', label: 'Other / Personal spirituality', detail: 'Your own spiritual path' },
];

export function FaithValuesSetupScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const [selected, setSelected] = useState<FaithValuesMode>('off');
  const [faithAware, setFaithAware] = useState(false);
  const [hideHome, setHideHome] = useState(false);
  const [ramadan, setRamadan] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const prefs = await getFaithValuesService(services.storage).getPreferences(profile.id);
    setSelected(prefs.mode);
    setFaithAware(prefs.faithAwareLanguage);
    setHideHome(prefs.hideFromHome);
    setRamadan(prefs.ramadanGoalsEnabled);
  }, [profile, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      const service = getFaithValuesService(services.storage);
      await service.setMode(profile.id, selected);
      await service.updatePreferences(profile.id, {
        faithAwareLanguage: selected !== 'off' ? faithAware : false,
        hideFromHome: hideHome,
        ramadanGoalsEnabled: selected === 'islam' ? ramadan : false,
        onboardingCompleted: selected !== 'off',
      });
      trackEvent('faith_values_mode_set', { mode: selected, enabled: selected !== 'off' });
      if (selected === 'off') {
        navigation.goBack();
      } else {
        navigation.replace('FaithValuesHub');
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = () => {
    if (!profile) return;
    Alert.alert(
      'Delete Faith & Values data',
      'This removes all intentions, reflections, duas and prayer records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void getFaithValuesService(services.storage)
              .deleteAllData(profile.id)
              .then(() => {
                setSelected('off');
                navigation.goBack();
              });
          },
        },
      ],
    );
  };

  const exportData = async () => {
    if (!profile) return;
    const payload = await getFaithValuesService(services.storage).buildExport(profile.id);
    await Share.share({
      title: 'Voxa Faith & Values export',
      message: JSON.stringify({ faithAndValues: payload }, null, 2),
    });
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader
            title="Faith & Values"
            subtitle="Optional and private. You can change or turn this off anytime."
          />
        </FadeIn>

        <VoxaText variant="label" color="textMuted" style={styles.sectionLabel}>
          Choose your experience
        </VoxaText>

        {MODE_OPTIONS.map((option, index) => {
          const active = selected === option.id;
          return (
            <StaggerFade key={option.id} index={index}>
              <Pressable
                style={[styles.modeRow, active && styles.modeRowActive]}
                onPress={() => {
                  void hapticSelection();
                  setSelected(option.id);
                  if (option.id !== 'off' && !faithAware) setFaithAware(true);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}>
                <View style={styles.modeCopy}>
                  <VoxaText variant="subtitle">{option.label}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {option.detail}
                  </VoxaText>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primarySoft} />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={colors.textMuted} />
                )}
              </Pressable>
            </StaggerFade>
          );
        })}

        {selected !== 'off' ? (
          <GlassCard style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <VoxaText variant="body">Faith-aware conversations</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  Voxa may use respectful, opt-in context in Talk
                </VoxaText>
              </View>
              <Switch
                value={faithAware}
                onValueChange={setFaithAware}
                trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
                accessibilityLabel="Allow faith-aware conversations"
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <VoxaText variant="body">Hide Home card</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  Access from Journey and Settings only
                </VoxaText>
              </View>
              <Switch
                value={hideHome}
                onValueChange={setHideHome}
                trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
                accessibilityLabel="Hide faith and values home card"
              />
            </View>
            {selected === 'islam' ? (
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <VoxaText variant="body">Ramadan goals</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    Manually enable seasonal reflection
                  </VoxaText>
                </View>
                <Switch
                  value={ramadan}
                  onValueChange={setRamadan}
                  trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
                  accessibilityLabel="Enable Ramadan goals"
                />
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        <PrimaryButton
          label={selected === 'off' ? 'Turn off Faith & Values' : 'Save & continue'}
          onPress={() => void save()}
          disabled={busy}
        />

        {selected !== 'off' ? (
          <VoxaText variant="caption" color="textMuted" style={styles.currentMode}>
            Current: {faithModeLabel(selected)}
          </VoxaText>
        ) : null}

        <View style={styles.dangerZone}>
          <PrimaryButton label="Export Faith & Values data" variant="ghost" onPress={() => void exportData()} />
          <PrimaryButton label="Delete all Faith & Values data" variant="ghost" onPress={deleteAll} />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  sectionLabel: { marginTop: spacing.sm },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTapTarget + 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  modeRowActive: {
    borderColor: 'rgba(45, 212, 191, 0.35)',
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
  },
  modeCopy: { flex: 1, gap: 4 },
  toggleCard: { gap: spacing.md, padding: spacing.md },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: layout.minTapTarget,
  },
  toggleCopy: { flex: 1, gap: 2 },
  currentMode: { textAlign: 'center' },
  dangerZone: { gap: spacing.sm, marginTop: spacing.lg },
});
