import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, layout, radius, spacing } from '../../constants/theme';
import { WeatherBundle } from '../../types/weather';

type Props = {
  bundle: WeatherBundle;
  onPress: () => void;
};

export function HomeWeatherCard({ bundle, onPress }: Props) {
  const today = bundle.daily[0];
  const updated = new Date(bundle.fetchedAt);
  const updatedLabel = Number.isNaN(updated.getTime())
    ? ''
    : `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Weather in ${bundle.locationLabel}, ${Math.round(bundle.current.temperatureC)} degrees`}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <GlassCard style={styles.card}>
        <View style={styles.top}>
          <View style={styles.left}>
            <VoxaText variant="caption" color="primarySoft">
              Weather
            </VoxaText>
            <VoxaText variant="subtitle">{bundle.locationLabel}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {bundle.current.conditionLabel}
            </VoxaText>
          </View>
          <View style={styles.tempBlock}>
            <VoxaText variant="title">{Math.round(bundle.current.temperatureC)}°</VoxaText>
            {today ? (
              <VoxaText variant="caption" color="textMuted">
                H {Math.round(today.tempMaxC)}° · L {Math.round(today.tempMinC)}°
              </VoxaText>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta icon="thermometer-outline" label={`Feels ${Math.round(bundle.current.apparentTemperatureC)}°`} />
          <Meta icon="water-outline" label={`${bundle.current.humidityPercent}%`} />
          <Meta icon="flag-outline" label={`${Math.round(bundle.current.windSpeedKmh)} km/h`} />
          {typeof bundle.current.uvIndex === 'number' ? (
            <Meta icon="sunny-outline" label={`UV ${Math.round(bundle.current.uvIndex)}`} />
          ) : null}
        </View>

        <View style={styles.footer}>
          <VoxaText variant="caption" color="textMuted">
            {bundle.fromCache ? 'Cached · ' : ''}
            {updatedLabel}
            {bundle.provider ? ` · ${bundle.provider}` : ''}
          </VoxaText>
          <Ionicons name="chevron-forward" size={layout.iconSm} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <VoxaText variant="caption" color="textMuted">
        {label}
      </VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  card: { gap: spacing.md12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  left: { flex: 1, gap: spacing.xs },
  tempBlock: { alignItems: 'flex-end', gap: spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
});
