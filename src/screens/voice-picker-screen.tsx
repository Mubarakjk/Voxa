import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { PremiumButton, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { colors, layout, radius, shadows, spacing } from '../constants/theme';
import { VoiceOption, VOICE_OPTIONS, getVoiceOption } from '../constants/voice-options';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  getPreviewingVoiceId,
  previewVoiceOption,
  setSelectedVoiceOptionId,
  stopVoiceOptionPreview,
  subscribePreviewState,
} from '../services/voice/voice-options-service';
import { stopCompanionSpeech } from '../services/voice/companion-speech-service';
import { usePlanStatus } from '../hooks/use-plan-status';
import { areAllFeaturesUnlocked } from '../config/launch-mode';
import { navigateToPaywall } from '../utils/paywall-navigation';
import { hapticLight, hapticSelection, hapticSuccess } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'VoicePicker'>;

function VoiceCard({
  option,
  selected,
  locked,
  playing,
  loading,
  onSelect,
  onPreview,
  index,
}: {
  option: VoiceOption;
  selected: boolean;
  locked: boolean;
  playing: boolean;
  loading: boolean;
  onSelect: () => void;
  onPreview: () => void;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.02 : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [selected, scale]);

  return (
    <StaggerFade index={index}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          style={[styles.card, selected && styles.cardSelected]}
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${option.displayName}. ${option.shortDescription}${locked ? '. Pro' : ''}`}>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <VoxaText variant="subtitle">{option.displayName}</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                {option.shortDescription}
              </VoxaText>
            </View>
            {locked ? (
              <View style={styles.proBadge}>
                <VoxaText variant="caption">Pro</VoxaText>
              </View>
            ) : null}
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </View>
          <Pressable
            style={styles.previewBtn}
            onPress={onPreview}
            accessibilityRole="button"
            accessibilityLabel={
              playing ? `Stop ${option.displayName} preview` : `Preview ${option.displayName}`
            }>
            {loading ? (
              <ActivityIndicator color={colors.primarySoft} />
            ) : (
              <Ionicons
                name={playing ? 'stop-circle' : 'play-circle'}
                size={28}
                color={colors.primarySoft}
              />
            )}
            <VoxaText variant="caption" color="primarySoft">
              {playing ? 'Stop' : 'Preview'}
            </VoxaText>
          </Pressable>
        </Pressable>
      </Animated.View>
    </StaggerFade>
  );
}

export function VoicePickerScreen({ navigation }: Props) {
  const { profile, services, refreshProfile } = useVoxa();
  const { isPro, reload: reloadPlan } = usePlanStatus();
  const [selectedId, setSelectedId] = useState(
    profile?.preferences.selectedVoiceOptionId ?? 'aurora',
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reloadPlan();
      if (profile) {
        setSelectedId(profile.preferences.selectedVoiceOptionId ?? 'aurora');
      }
      return () => {
        void stopVoiceOptionPreview();
      };
    }, [profile, reloadPlan]),
  );

  useEffect(() => {
    const sync = () => {
      const next = getPreviewingVoiceId();
      setPreviewingId((prev) => (prev === next ? prev : next));
    };
    sync();
    return subscribePreviewState(sync);
  }, []);

  const selectVoice = async (option: VoiceOption) => {
    if (!profile) return;
    if (option.requiresPro && !isPro && !areAllFeaturesUnlocked()) {
      const show = await services.entitlementAccess.shouldShowContextualPaywall(profile.id);
      if (show) {
        await services.entitlementAccess.markPaywallShown(profile.id, 'premium-voice');
        navigateToPaywall(navigation, 'premium-voice');
      }
      return;
    }

    void hapticSuccess();
    setSelectedId(option.id);
    await setSelectedVoiceOptionId(services.storage, option.id);
    await services.repositories.userProfile.updateProfile({
      preferences: {
        ...profile.preferences,
        selectedVoiceOptionId: option.id,
      },
    });
    await refreshProfile();
  };

  const onPreview = async (option: VoiceOption) => {
    void hapticLight();
    await stopCompanionSpeech();
    setLoadingId(option.id);
    try {
      await previewVoiceOption(option);
    } catch {
      Alert.alert(
        'Preview unavailable',
        'Could not play this voice right now. On-device speech is used when cloud TTS is unavailable.',
      );
    } finally {
      setLoadingId(null);
      setPreviewingId(getPreviewingVoiceId());
    }
  };

  const selected = getVoiceOption(selectedId);

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          title="Companion voice"
          subtitle="Choose how Voxa sounds. Speech playback only — not recording."
        />

        <GlassCard style={{ ...styles.current, ...shadows.glow }}>
          <VoxaText variant="caption" color="primarySoft">
            Now speaking as
          </VoxaText>
          <VoxaText variant="subtitle">
            {selected.displayName} — {selected.shortDescription}
          </VoxaText>
          <PremiumButton
            label={previewingId === selected.id ? 'Stop preview' : 'Preview current'}
            variant="ghost"
            onPress={() => void onPreview(selected)}
          />
        </GlassCard>

        {VOICE_OPTIONS.map((option, index) => (
          <VoiceCard
            key={option.id}
            option={option}
            index={index}
            selected={selectedId === option.id}
            locked={option.requiresPro && !isPro && !areAllFeaturesUnlocked()}
            playing={previewingId === option.id}
            loading={loadingId === option.id}
            onSelect={() => void selectVoice(option)}
            onPreview={() => void onPreview(option)}
          />
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  current: { gap: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    minHeight: 96,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardCopy: { flex: 1, gap: 4 },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
});
