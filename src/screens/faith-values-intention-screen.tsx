import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';

type Props = NativeStackScreenProps<RootStackParamList, 'FaithValuesIntention'>;

export function FaithValuesIntentionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void getFaithValuesService(services.storage)
        .getTodayIntention(profile.id)
        .then((row) => setText(row?.text ?? ''));
    }, [profile, services.storage]),
  );

  const save = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      await getFaithValuesService(services.storage).setTodayIntention(profile.id, text);
      navigation.goBack();
    } finally {
      setBusy(false);
    }
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
            title="Today's intention"
            subtitle="A gentle focus — private to you."
          />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What matters most today?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Today's intention"
          />
          <VoxaText variant="caption" color="textMuted">
            This may appear in Talk only if you enable faith-aware conversations.
          </VoxaText>
          <PremiumButton label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} disabled={busy} />
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
  input: {
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
  },
});
