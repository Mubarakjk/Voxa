import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { reflectionPromptsForMode } from '../services/faith/faith-values-context-service';
import { FaithValuesMode } from '../types/faith-values';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'FaithReflection'>;

export function FaithReflectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const [mode, setMode] = useState<Exclude<FaithValuesMode, 'off'>>('general');
  const [prompt, setPrompt] = useState(route.params?.prompt ?? '');
  const [body, setBody] = useState('');
  const [allowMemory, setAllowMemory] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const prefs = await getFaithValuesService(services.storage).getPreferences(profile.id);
    if (prefs.mode === 'off') {
      navigation.replace('FaithValuesSetup');
      return;
    }
    const m = prefs.mode as Exclude<FaithValuesMode, 'off'>;
    setMode(m);
    if (!route.params?.prompt) {
      setPrompt(reflectionPromptsForMode(m)[0] ?? 'What are you grateful for today?');
    }
  }, [navigation, profile, route.params?.prompt, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = async () => {
    if (!profile || !body.trim() || busy) return;
    setBusy(true);
    try {
      const service = getFaithValuesService(services.storage);
      const reflection = await service.saveReflection(profile.id, {
        prompt,
        body,
        mode,
        allowMemory,
      });
      if (allowMemory && profile.preferences.memoryEnabled) {
        await services.repositories.memories.createMemory({
          userId: profile.id,
          title: 'Faith reflection (user approved)',
          content: body.trim().slice(0, 500),
          category: 'faith',
          importance: 3,
          tags: ['faith-values', 'user-approved'],
        });
        await service.markReflectionMemorySaved(profile.id, reflection.id);
      }
      Alert.alert('Saved privately', allowMemory ? 'Voxa may remember this in future conversations.' : 'Only you can see this reflection.');
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const discussWithVoxa = async () => {
    if (!profile || !body.trim()) return;
    await save();
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: {
        starterPrompt: `I'd like to reflect on this privately: "${body.trim().slice(0, 400)}". Please respond supportively without inventing religious references.`,
      },
    });
  };

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader showBack
            title="Private reflection"
            subtitle="Saved on your device. Not shared unless you choose."
          />

          <GlassCard style={styles.promptCard}>
            <VoxaText variant="caption" color="textMuted">
              Prompt
            </VoxaText>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              style={styles.promptInput}
              placeholderTextColor={colors.textMuted}
              multiline
              accessibilityLabel="Reflection prompt"
            />
          </GlassCard>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write freely — this stays private…"
            placeholderTextColor={colors.textMuted}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Reflection text"
          />

          <View style={styles.memoryRow}>
            <View style={styles.memoryCopy}>
              <VoxaText variant="body">Allow Voxa to remember this</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                Off by default. You stay in control.
              </VoxaText>
            </View>
            <Switch
              value={allowMemory}
              onValueChange={setAllowMemory}
              trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
              accessibilityLabel="Allow Voxa to remember this reflection"
            />
          </View>

          <PremiumButton label={busy ? 'Saving…' : 'Save privately'} onPress={() => void save()} disabled={busy || !body.trim()} />
          <Pressable
            style={styles.discussBtn}
            onPress={() => {
              void hapticLight();
              void discussWithVoxa();
            }}
            disabled={!body.trim()}
            accessibilityRole="button"
            accessibilityLabel="Discuss with Voxa">
            <VoxaText variant="caption" color="primarySoft">
              Discuss with Voxa
            </VoxaText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  promptCard: { gap: spacing.sm },
  promptInput: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 44,
  },
  bodyInput: {
    minHeight: 180,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTapTarget,
  },
  memoryCopy: { flex: 1, gap: 2 },
  discussBtn: {
    alignItems: 'center',
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
  },
});
