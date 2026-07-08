import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { VOXA_AVATARS, VoxaAvatarId } from '../constants/companion-identity';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { buildStudioSavePayload } from '../services/companion-studio/companion-studio-service';
import { FUTURE_AVATAR_CATEGORIES } from '../types/avatar-appearance';
import { getCompanionIdentity, getVoxaAvatarTint } from '../utils/companion-display';

export function CompanionStudioAppearanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, refreshProfile } = useVoxa();
  const identity = profile ? getCompanionIdentity(profile) : null;

  const [voxaName, setVoxaName] = useState(identity?.voxaName ?? 'Voxa');
  const [avatarId, setAvatarId] = useState<VoxaAvatarId>(identity?.avatarId ?? 'orb_purple');
  const [isSaving, setIsSaving] = useState(false);

  const tint = VOXA_AVATARS.find((a) => a.id === avatarId)?.accent ?? colors.primary;

  const save = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const payload = buildStudioSavePayload({
        profile,
        voxaName,
        avatarId,
        appearance: { avatarId },
      });
      await services.repositories.userProfile.updateProfile(payload);
      await refreshProfile();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Companion Studio
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">Appearance</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Choose how Voxa looks today. More customization is on the way.
        </VoxaText>

        <GlassCard variant="highlight" style={styles.preview}>
          <VoiceOrb size={110} tint={tint} />
          <VoxaText variant="subtitle">{voxaName.trim() || 'Voxa'}</VoxaText>
        </GlassCard>

        <SectionHeader title="Name" />
        <GlassCard style={styles.card}>
          <TextInput
            value={voxaName}
            onChangeText={setVoxaName}
            placeholder="Voxa"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <SectionHeader title="Avatar" />
        <GlassCard style={styles.card}>
          <View style={styles.chipRow}>
            {VOXA_AVATARS.map((avatar) => (
              <Pressable
                key={avatar.id}
                style={[styles.avatarChip, avatarId === avatar.id && { borderColor: avatar.accent }]}
                onPress={() => setAvatarId(avatar.id)}>
                <View style={[styles.avatarDot, { backgroundColor: avatar.accent }]} />
                <VoxaText variant="caption">{avatar.label}</VoxaText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <SectionHeader title="Coming soon" />
        <GlassCard style={styles.card}>
          <VoxaText variant="caption" color="textSecondary" style={styles.futureNote}>
            Architecture ready for 3D avatars — hair, skin tone, eyes, clothes, accessories, animations, expressions, and idle behaviour.
          </VoxaText>
          {FUTURE_AVATAR_CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.futureRow}>
              <VoxaText variant="body" color="textMuted">
                {cat.label}
              </VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Soon
              </VoxaText>
            </View>
          ))}
        </GlassCard>

        <PrimaryButton label={isSaving ? 'Saving…' : 'Save appearance'} onPress={save} disabled={isSaving} loading={isSaving} />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  preview: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  card: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  avatarDot: { width: 12, height: 12, borderRadius: 6 },
  futureNote: { marginBottom: spacing.sm },
  futureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
});
