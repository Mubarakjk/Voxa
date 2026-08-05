import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getNotesService } from '../services/notes/notes-service';
import {
  isProNoteAction,
  listNoteAIActions,
  noteAIActionLabel,
  noteAIToolsDisclaimer,
  runNoteAIAction,
} from '../services/notes/notes-ai-service';
import { trackEvent } from '../services/analytics/analytics-service';
import { navigateToPaywall } from '../utils/paywall-navigation';
import {
  Note,
  NoteAIActionId,
  NoteAIActionResult,
  NoteChecklistItem,
  NoteMemoryConsent,
  NoteType,
  NOTE_TYPE_LABELS,
} from '../types/notes';
import { createUuid } from '../types';
import { usePlanStatus } from '../hooks/use-plan-status';
import { hapticSelection, hapticWarning } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEditor'>;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TYPES: NoteType[] = ['standard', 'checklist', 'journal', 'study', 'idea', 'meeting'];

export function NoteEditorScreen({ navigation, route }: Props) {
  const { noteId } = route.params;
  const { profile, services } = useVoxa();
  const { isPro } = usePlanStatus();
  const insets = useSafeAreaInsets();
  const notesService = useMemo(() => getNotesService(services.storage), [services.storage]);

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>([]);
  const [type, setType] = useState<NoteType>('standard');
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const [memoryConsent, setMemoryConsent] = useState<NoteMemoryConsent>('private');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPreview, setAiPreview] = useState<NoteAIActionResult | null>(null);

  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    title,
    body,
    tagsText,
    checklist,
    type,
    pinned,
    archived,
    favourite,
    memoryConsent,
  });

  latestRef.current = {
    title,
    body,
    tagsText,
    checklist,
    type,
    pinned,
    archived,
    favourite,
    memoryConsent,
  };

  const persist = useCallback(async () => {
    if (!profile || !noteId) return;
    const current = latestRef.current;
    setSaveState('saving');
    try {
      const tags = current.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await notesService.update(profile.id, noteId, {
        title: current.title,
        body: current.body,
        tags,
        checklist: current.checklist,
        type: current.type,
        pinned: current.pinned,
        archived: current.archived,
        favourite: current.favourite,
        memoryConsent: current.memoryConsent,
      });
      if (updated) {
        let next = updated;
        if (current.memoryConsent === 'remember' && !updated.linkedMemoryId) {
          const memory = await services.repositories.memories.createMemory({
            userId: profile.id,
            category: 'moments',
            title: `Note: ${updated.title.trim() || 'Untitled'}`,
            content: (updated.body || updated.title).slice(0, 500),
            source: 'manual',
            tags: ['from-note', updated.id],
            importance: 3,
          });
          next = (await notesService.update(profile.id, noteId, { linkedMemoryId: memory.id })) ?? updated;
        }
        if (current.memoryConsent === 'private' && updated.linkedMemoryId) {
          try {
            await services.repositories.memories.deleteMemory(updated.linkedMemoryId);
          } catch {
            // Memory may already be gone
          }
          next =
            (await notesService.update(profile.id, noteId, {
              linkedMemoryId: undefined,
            })) ?? updated;
        }
        setNote(next);
        dirtyRef.current = false;
        setSaveState('saved');
        trackEvent('note_edited', { type: next.type });
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  }, [profile, noteId, notesService, services.repositories.memories]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState('idle');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, 650);
  }, [persist]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const loaded = await notesService.get(profile.id, noteId);
    if (!loaded) {
      setLoading(false);
      Alert.alert('Note missing', 'This note could not be found.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    setNote(loaded);
    setTitle(loaded.title);
    setBody(loaded.body);
    setTagsText(loaded.tags.join(', '));
    setChecklist(loaded.checklist);
    setType(loaded.type);
    setPinned(loaded.pinned);
    setArchived(loaded.archived);
    setFavourite(loaded.favourite);
    setMemoryConsent(loaded.memoryConsent);
    setLoading(false);
  }, [profile, noteId, notesService, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        if (dirtyRef.current) void persist();
      };
    }, [load, persist]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && dirtyRef.current) void persist();
    });
    return () => sub.remove();
  }, [persist]);

  const mark = (updater: () => void) => {
    updater();
    scheduleSave();
  };

  const toggleChecklistItem = (id: string) => {
    void hapticSelection();
    mark(() =>
      setChecklist((items) =>
        items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      ),
    );
  };

  const addChecklistItem = () => {
    mark(() =>
      setChecklist((items) => [...items, { id: createUuid(), text: '', done: false }]),
    );
  };

  const runAi = async (actionId: NoteAIActionId) => {
    if (!note || !profile) return;
    if (isProNoteAction(actionId) && !isPro) {
      const show = await services.entitlementAccess.shouldShowContextualPaywall(profile.id);
      if (show) {
        await services.entitlementAccess.markPaywallShown(profile.id, 'note-ai');
        navigateToPaywall(navigation, 'note-ai');
      }
      return;
    }

    if (actionId === 'discuss') {
      await persist();
      const attached = `${title.trim() || 'Untitled'}\n\n${body}`.trim();
      navigation.navigate('MainTabs', {
        screen: 'Talk',
        params: {
          starterPrompt: `I'd like to discuss this note with you. Treat the following as attached context (do not claim you read private notes beyond this):\n\n${attached}`,
        },
      });
      trackEvent('note_ai_action_completed', { action: actionId });
      return;
    }

    setAiBusy(true);
    trackEvent('note_ai_action_started', { action: actionId });
    try {
      const result = await runNoteAIAction({
        note: { ...note, title, body, checklist, type },
        actionId,
        isPro,
      });
      setAiPreview(result);
      trackEvent('note_ai_action_completed', { action: actionId });
    } catch (err) {
      Alert.alert('Note tool', err instanceof Error ? err.message : 'Could not run action.');
    } finally {
      setAiBusy(false);
    }
  };

  const applyPreview = async (mode: 'replace' | 'insert' | 'new') => {
    if (!aiPreview || !profile) return;
    if (aiPreview.checklist?.length) {
      mark(() => {
        setType('checklist');
        setChecklist(aiPreview.checklist!);
        if (!body.trim()) setBody(aiPreview.previewText);
      });
    } else if (mode === 'replace') {
      mark(() => setBody(aiPreview.previewText));
    } else if (mode === 'insert') {
      mark(() => setBody((current) => `${current.trim()}\n\n${aiPreview.previewText}`.trim()));
    } else {
      const created = await notesService.create(profile.id, {
        title: `${title || 'Note'} — AI`,
        body: aiPreview.previewText,
        type: 'standard',
      });
      trackEvent('note_created', { type: created.type, source: 'ai' });
      setAiPreview(null);
      setAiOpen(false);
      navigation.replace('NoteEditor', { noteId: created.id });
      return;
    }
    setAiPreview(null);
    setAiOpen(false);
  };

  const confirmDelete = () => {
    Alert.alert('Delete note?', 'This removes the note from your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!profile || !note) return;
          await persist();
          if (note.linkedMemoryId) {
            try {
              await services.repositories.memories.deleteMemory(note.linkedMemoryId);
            } catch {
              // ignore
            }
          }
          await notesService.softDelete(profile.id, noteId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading || !note) {
    return (
      <ScreenShell>
        <LoadingState label="Opening note..." />
      </ScreenShell>
    );
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Edits autosave';

  return (
    <ScreenShell padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title={title.trim() || 'Untitled'}
            subtitle={saveLabel}
            right={
              <Pressable
                onPress={() => {
                  if (dirtyRef.current) void persist();
                  navigation.goBack();
                }}
                hitSlop={10}
                accessibilityLabel="Close note">
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            }
          />

          <TextInput
            value={title}
            onChangeText={(value) => mark(() => setTitle(value))}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
            accessibilityLabel="Note title"
          />

          {type === 'checklist' ? (
            <GlassCard style={styles.card}>
              {checklist.map((item) => (
                <View key={item.id} style={styles.checkRow}>
                  <Pressable onPress={() => toggleChecklistItem(item.id)} hitSlop={8}>
                    <Ionicons
                      name={item.done ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={colors.primarySoft}
                    />
                  </Pressable>
                  <TextInput
                    value={item.text}
                    onChangeText={(text) =>
                      mark(() =>
                        setChecklist((items) =>
                          items.map((row) => (row.id === item.id ? { ...row, text } : row)),
                        ),
                      )
                    }
                    placeholder="Checklist item"
                    placeholderTextColor={colors.textMuted}
                    style={styles.checkInput}
                  />
                </View>
              ))}
              <PremiumButton label="Add item" variant="ghost" onPress={addChecklistItem} />
            </GlassCard>
          ) : (
            <TextInput
              value={body}
              onChangeText={(value) => mark(() => setBody(value))}
              placeholder="Start writing…"
              placeholderTextColor={colors.textMuted}
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note body"
            />
          )}

          <GlassCard style={styles.card}>
            <VoxaText variant="caption" color="textMuted">
              Type
            </VoxaText>
            <View style={styles.chipRow}>
              {TYPES.map((id) => (
                <Pressable
                  key={id}
                  style={[styles.chip, type === id && styles.chipActive]}
                  onPress={() => mark(() => setType(id))}>
                  <VoxaText variant="caption">{NOTE_TYPE_LABELS[id]}</VoxaText>
                </Pressable>
              ))}
            </View>

            <VoxaText variant="caption" color="textMuted">
              Tags (comma separated)
            </VoxaText>
            <TextInput
              value={tagsText}
              onChangeText={(value) => mark(() => setTagsText(value))}
              placeholder="ideas, work"
              placeholderTextColor={colors.textMuted}
              style={styles.metaInput}
            />

            <View style={styles.actionsRow}>
              <PremiumButton
                label={pinned ? 'Unpin' : 'Pin'}
                variant="ghost"
                onPress={() => mark(() => setPinned((v) => !v))}
              />
              <PremiumButton
                label={favourite ? 'Unfavourite' : 'Favourite'}
                variant="ghost"
                onPress={() => mark(() => setFavourite((v) => !v))}
              />
              <PremiumButton
                label={archived ? 'Unarchive' : 'Archive'}
                variant="ghost"
                onPress={() => mark(() => setArchived((v) => !v))}
              />
            </View>

            <VoxaText variant="caption" color="textMuted">
              Memory
            </VoxaText>
            {(
              [
                { id: 'private' as const, label: 'Keep private' },
                { id: 'remember' as const, label: 'Ask Voxa to remember this' },
                { id: 'use_in_conversations' as const, label: 'Use in future conversations' },
              ] as const
            ).map((option) => (
              <Pressable
                key={option.id}
                style={[styles.option, memoryConsent === option.id && styles.optionActive]}
                onPress={() => mark(() => setMemoryConsent(option.id))}>
                <VoxaText variant="body">{option.label}</VoxaText>
              </Pressable>
            ))}
          </GlassCard>

          <PremiumButton label="Quick tools" onPress={() => setAiOpen(true)} />
          <View style={styles.actionsRow}>
            <PremiumButton
              label="Duplicate"
              variant="ghost"
              onPress={async () => {
                if (!profile) return;
                await persist();
                const copy = await notesService.duplicate(profile.id, noteId);
                if (copy) navigation.replace('NoteEditor', { noteId: copy.id });
              }}
            />
            <PremiumButton label="Delete" variant="ghost" onPress={confirmDelete} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={aiOpen} animationType="slide" transparent onRequestClose={() => setAiOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <VoxaText variant="subtitle">Quick note tools</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {noteAIToolsDisclaimer()}
            </VoxaText>
            <ScrollView style={styles.modalScroll}>
              {listNoteAIActions(true).map((actionId) => {
                const locked = isProNoteAction(actionId) && !isPro;
                return (
                  <Pressable
                    key={actionId}
                    style={styles.option}
                    disabled={aiBusy}
                    onPress={() => void runAi(actionId)}>
                    <VoxaText variant="body">
                      {noteAIActionLabel(actionId)}
                      {locked ? ' · Pro' : ''}
                    </VoxaText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {aiPreview ? (
              <GlassCard style={styles.previewCard}>
                <VoxaText variant="caption" color="primarySoft">
                  Preview{aiPreview.isEstimate ? ' · on-device' : ''}
                </VoxaText>
                <VoxaText variant="body">{aiPreview.previewText}</VoxaText>
                <View style={styles.actionsRow}>
                  <PremiumButton label="Replace" onPress={() => void applyPreview('replace')} />
                  <PremiumButton label="Insert" variant="ghost" onPress={() => void applyPreview('insert')} />
                  <PremiumButton label="New note" variant="ghost" onPress={() => void applyPreview('new')} />
                  <PremiumButton
                    label="Share"
                    variant="ghost"
                    onPress={() => void Share.share({ message: aiPreview.previewText })}
                  />
                </View>
              </GlassCard>
            ) : null}
            <PremiumButton
              label="Close"
              variant="ghost"
              onPress={() => {
                setAiOpen(false);
                setAiPreview(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  titleInput: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
    minHeight: 48,
  },
  bodyInput: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 220,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  card: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  metaInput: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: spacing.xs,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkInput: { flex: 1, color: colors.text, fontSize: 16, minHeight: 44 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '88%',
  },
  modalScroll: { maxHeight: 280 },
  previewCard: { gap: spacing.sm },
});
