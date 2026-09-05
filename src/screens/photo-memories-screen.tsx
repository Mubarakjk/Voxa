import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getPhotoMemoryService } from '../services/phase12/photo-memory-service';
import { PhotoMemory } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoMemories'>;

export function PhotoMemoriesScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getPhotoMemoryService(services.storage);
  const [photos, setPhotos] = useState<PhotoMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setPhotos(await svc.list(profile.id, { includePrivate: true }));
    setLoading(false);
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleFav = async (photo: PhotoMemory) => {
    if (!profile) return;
    await svc.update(profile.id, { ...photo, favourite: !photo.favourite });
    void load();
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading photos..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack title="Photo memories" subtitle="Shared visual moments — Voxa only references stored photos." />
        {photos.length === 0 ? (
          <>
            <EmptyState
              icon="camera-outline"
              title="No photo memories yet"
              message="Take a photo in Talk and save it to Journey to build your gallery."
            />
            <PremiumButton label="Open Talk" onPress={() => navigation.navigate('MainTabs', { screen: 'Talk' })} />
          </>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => {
              const uri = svc.resolveUri(photo);
              return (
                <GlassCard key={photo.id} style={styles.tile}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.placeholder}>
                      <VoxaText variant="caption" color="textMuted">Photo unavailable</VoxaText>
                    </View>
                  )}
                  <Pressable onPress={() => void toggleFav(photo)}>
                    <VoxaText variant="caption" color="primarySoft">{photo.favourite ? '★' : '☆'} {photo.title}</VoxaText>
                  </Pressable>
                  <VoxaText variant="caption" color="textMuted" numberOfLines={2}>{photo.caption || photo.category}</VoxaText>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', gap: spacing.xs, padding: spacing.sm },
  image: { width: '100%', height: 120, borderRadius: 8 },
  placeholder: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a24', borderRadius: 8 },
});
