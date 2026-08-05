import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { useFocusEffect } from '@react-navigation/native';

import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { DUA_CATEGORY_LABELS, SavedDuaCategory } from '../types/faith-values';
import { hapticSelection } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'DuaEditor'>;

const CATEGORIES = Object.keys(DUA_CATEGORY_LABELS) as SavedDuaCategory[];

export function DuaEditorScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const duaId = route.params?.duaId;
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [category, setCategory] = useState<SavedDuaCategory>('gratitude');
  const [favourite, setFavourite] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile || !duaId) return;
      void getFaithValuesService(services.storage)
        .getDua(profile.id, duaId)
        .then((dua) => {
          if (!dua) return;
          setTitle(dua.title);
          setText(dua.text);
          setTranslation(dua.translation ?? '');
          setPrivateNote(dua.privateNote ?? '');
          setCategory(dua.category);
          setFavourite(dua.favourite);
        });
    }, [duaId, profile, services.storage]),
  );

  const save = async () => {
    if (!profile || !text.trim() || busy) return;
    setBusy(true);
    try {
      const service = getFaithValuesService(services.storage);
      if (duaId) {
        await service.updateDua(profile.id, duaId, {
          title: title.trim() || 'Untitled dua',
          text: text.trim(),
          translation: translation.trim() || undefined,
          privateNote: privateNote.trim() || undefined,
          category,
          favourite,
        });
      } else {
        await service.createDua(profile.id, {
          title: title.trim() || 'Untitled dua',
          text: text.trim(),
          translation: translation.trim() || undefined,
          privateNote: privateNote.trim() || undefined,
          category,
        });
      }
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!profile || !duaId) return;
    Alert.alert('Delete dua', 'Remove this dua permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void getFaithValuesService(services.storage)
            .deleteDua(profile.id, duaId)
            .then(() => navigation.goBack());
        },
      },
    ]);
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
          <ScreenHeader title={duaId ? 'Edit dua' : 'New dua'} subtitle="Write your own text — kept private." />

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
            accessibilityLabel="Dua title"
          />

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Dua text"
            placeholderTextColor={colors.textMuted}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Dua text"
          />

          <TextInput
            value={translation}
            onChangeText={setTranslation}
            placeholder="Optional translation"
            placeholderTextColor={colors.textMuted}
            style={styles.field}
            multiline
            accessibilityLabel="Optional translation"
          />

          <TextInput
            value={privateNote}
            onChangeText={setPrivateNote}
            placeholder="Private note (optional)"
            placeholderTextColor={colors.textMuted}
            style={styles.field}
            multiline
            accessibilityLabel="Private note"
          />

          <VoxaText variant="label" color="textMuted">
            Category
          </VoxaText>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    void hapticSelection();
                    setCategory(cat);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}>
                  <VoxaText variant="caption" color={selected ? 'primarySoft' : 'textMuted'}>
                    {DUA_CATEGORY_LABELS[cat]}
                  </VoxaText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.favRow}>
            <VoxaText variant="body">Favourite</VoxaText>
            <Switch
              value={favourite}
              onValueChange={setFavourite}
              trackColor={{ false: colors.surfaceStrong, true: colors.primary }}
              accessibilityLabel="Mark as favourite"
            />
          </View>

          <PremiumButton label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} disabled={busy || !text.trim()} />
          {duaId ? (
            <PremiumButton label="Delete" variant="ghost" onPress={remove} />
          ) : null}
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
  titleInput: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  bodyInput: {
    minHeight: 140,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
  },
  field: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 44,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.minTapTarget - 8,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: 'rgba(45, 212, 191, 0.4)',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTapTarget,
  },
});
