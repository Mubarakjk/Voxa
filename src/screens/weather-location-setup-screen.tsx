import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getWeatherService } from '../services/weather/weather-service';
import { WeatherFetchResult, WeatherLocationPreference } from '../types/weather';

type Props = NativeStackScreenProps<RootStackParamList, 'WeatherLocationSetup'>;

const PERMISSION_EXPLANATION =
  'Voxa can use your location to provide accurate weather, local suggestions and morning briefings. You can also choose a city manually.';

export function WeatherLocationSetupScreen({ navigation }: Props) {
  const { services } = useVoxa();
  const weather = getWeatherService(services.storage);
  const [preference, setPreference] = useState<WeatherLocationPreference | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState<'device' | 'manual' | 'preview' | null>(null);
  const [preview, setPreview] = useState<WeatherFetchResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const pref = await weather.getPreference();
    setPreference(pref);
    if (pref.cityName && pref.mode === 'manual') setCityQuery(pref.cityName);
    const hasCoords = typeof pref.latitude === 'number' && typeof pref.longitude === 'number';
    if (hasCoords && pref.mode !== 'declined') {
      setLoading('preview');
      try {
        setPreview(await weather.fetchForecast({ force: true }));
      } finally {
        setLoading(null);
      }
    }
  }, [weather]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const useDeviceLocation = async () => {
    setStatusMessage(null);
    setLoading('device');
    try {
      const result = await weather.requestDeviceLocation();
      if (!result.ok) {
        setStatusMessage(result.message);
        setPreference(await weather.getPreference());
        return;
      }
      setPreference(result.preference);
      setPreview(await weather.fetchForecast({ force: true }));
      setStatusMessage('Location saved. Weather is ready when you ask Voxa.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not use device location.');
    } finally {
      setLoading(null);
    }
  };

  const saveManualCity = async () => {
    setStatusMessage(null);
    setLoading('manual');
    try {
      const result = await weather.saveManualCity(cityQuery);
      if (!result.ok) {
        setStatusMessage(result.message);
        return;
      }
      setPreference(result.preference);
      setPreview(await weather.fetchForecast({ force: true }));
      setStatusMessage('City saved. Weather is ready when you ask Voxa.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not save that city.');
    } finally {
      setLoading(null);
    }
  };

  const chooseNotNow = async () => {
    setPreference(await weather.chooseNotNow());
    setStatusMessage('No problem — you can set this up any time in Settings.');
    navigation.goBack();
  };

  const retryPreview = async () => {
    setLoading('preview');
    try {
      setPreview(await weather.fetchForecast({ force: true }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScreenShell padded={false}>
      <LinearGradient colors={['#101022', '#06060C']} style={styles.gradient}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ScreenHeader
              eyebrow="Weather"
              title="Your location"
              subtitle={PERMISSION_EXPLANATION}
            />

            {preference ? (
              <GlassCard style={styles.statusCard}>
                <VoxaText variant="caption" color="primarySoft">Current</VoxaText>
                <VoxaText variant="subtitle">{weather.formatLocationLabel(preference)}</VoxaText>
                {preference.permissionStatus === 'denied' && preference.mode !== 'manual' ? (
                  <VoxaText variant="caption" color="textMuted">
                    Location access is off — manual city works best.
                  </VoxaText>
                ) : null}
              </GlassCard>
            ) : null}

            <GlassCard style={styles.optionCard}>
              <OptionRow
                icon="navigate-outline"
                title="Use precise location"
                subtitle="Best for accurate local weather"
                loading={loading === 'device'}
                onPress={() => void useDeviceLocation()}
              />
              <View style={styles.divider} />
              <View style={styles.manualBlock}>
                <VoxaText variant="subtitle">Choose a city</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  Works even if location access is off
                </VoxaText>
                <TextInput
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder="e.g. London, UK"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => void saveManualCity()}
                />
                <PrimaryButton
                  label={loading === 'manual' ? 'Saving…' : 'Save city'}
                  onPress={() => void saveManualCity()}
                  disabled={loading === 'manual' || !cityQuery.trim()}
                />
              </View>
              <View style={styles.divider} />
              <OptionRow
                icon="time-outline"
                title="Not now"
                subtitle="Skip for now — change anytime in Settings"
                onPress={() => void chooseNotNow()}
              />
            </GlassCard>

            {statusMessage ? (
              <GlassCard style={styles.messageCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primarySoft} />
                <VoxaText variant="body" color="textSecondary" style={styles.flex}>
                  {statusMessage}
                </VoxaText>
              </GlassCard>
            ) : null}

            {loading === 'preview' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primarySoft} />
                <VoxaText variant="caption" color="textMuted">Loading forecast…</VoxaText>
              </View>
            ) : null}

            {preview?.ok ? (
              <GlassCard style={styles.previewCard}>
                <VoxaText variant="caption" color="primarySoft">Preview</VoxaText>
                <VoxaText variant="title">{Math.round(preview.data.current.temperatureC)}°</VoxaText>
                <VoxaText variant="body" color="textSecondary">
                  {preview.data.current.conditionLabel} · {preview.data.locationLabel}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  Humidity {Math.round(preview.data.current.humidityPercent)}% · Wind {Math.round(preview.data.current.windSpeedKmh)} km/h
                </VoxaText>
                {preview.data.fromCache ? (
                  <VoxaText variant="caption" color="textMuted">Showing cached forecast</VoxaText>
                ) : null}
              </GlassCard>
            ) : preview && !preview.ok ? (
              <GlassCard style={styles.messageCard}>
                <VoxaText variant="body" color="textSecondary">{preview.message}</VoxaText>
                {preview.cached ? (
                  <>
                    <VoxaText variant="caption" color="textMuted">
                      Last saved: {Math.round(preview.cached.current.temperatureC)}° · {preview.cached.current.conditionLabel}
                    </VoxaText>
                    <Pressable onPress={() => void retryPreview()}>
                      <VoxaText variant="caption" color="primarySoft">Retry live forecast</VoxaText>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => void retryPreview()}>
                    <VoxaText variant="caption" color="primarySoft">Retry</VoxaText>
                  </Pressable>
                )}
              </GlassCard>
            ) : null}

            <PrimaryButton label="Done" variant="ghost" onPress={() => navigation.goBack()} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ScreenShell>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable style={styles.optionRow} onPress={onPress} disabled={loading}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={20} color={colors.primarySoft} />
      </View>
      <View style={styles.flex}>
        <VoxaText variant="subtitle">{title}</VoxaText>
        <VoxaText variant="caption" color="textMuted">{subtitle}</VoxaText>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primarySoft} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  statusCard: { gap: spacing.xs },
  optionCard: { padding: 0, overflow: 'hidden' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  divider: { height: 1, backgroundColor: colors.glassBorder, marginHorizontal: spacing.lg },
  manualBlock: { gap: spacing.sm, padding: spacing.lg },
  input: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.text,
  },
  messageCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  previewCard: { gap: spacing.xs, alignItems: 'flex-start' },
  loadingRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
});
