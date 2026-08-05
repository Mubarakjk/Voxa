import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { DUA_CATEGORY_LABELS, SavedDua } from '../types/faith-values';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedDuas'>;

export function SavedDuasScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const [duas, setDuas] = useState<SavedDua[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const items = await getFaithValuesService(services.storage).listDuas(profile.id);
    setDuas(items);
  }, [profile, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmDelete = (dua: SavedDua) => {
    Alert.alert('Delete dua', `Remove "${dua.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!profile) return;
          void getFaithValuesService(services.storage)
            .deleteDua(profile.id, dua.id)
            .then(load);
        },
      },
    ]);
  };

  return (
    <ScreenShell padded={false}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Saved duas"
          subtitle="Your private collection — no built-in religious text."
          right={
            <PremiumButton
              label="Add"
              onPress={() => navigation.navigate('DuaEditor', {})}
            />
          }
        />
      </View>

      {duas.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState
            icon="bookmark-outline"
            title="No saved duas yet"
            message="Save duas that matter to you — written by you, kept privately."
            actionLabel="Add a dua"
            onAction={() => navigation.navigate('DuaEditor', {})}
          />
        </View>
      ) : (
        <FlatList
          data={duas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                void hapticLight();
                navigation.navigate('DuaEditor', { duaId: item.id });
              }}
              onLongPress={() => confirmDelete(item)}
              accessibilityRole="button"
              accessibilityHint="Long press to delete">
              <View style={styles.rowBody}>
                <View style={styles.titleLine}>
                  {item.favourite ? (
                    <Ionicons name="heart" size={14} color={colors.warning} />
                  ) : null}
                  <VoxaText variant="subtitle" numberOfLines={1} style={styles.title}>
                    {item.title}
                  </VoxaText>
                </View>
                <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                  {item.text}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {DUA_CATEGORY_LABELS[item.category]}
                </VoxaText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTapTarget + 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowBody: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1 },
});
