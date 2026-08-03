import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VoxaText } from '../ui/voxa-text';
import { colors, layout, radius, spacing } from '../../constants/theme';
import { useVoxa } from '../../context/voxa-context';
import { getNotesService } from '../../services/notes/notes-service';
import { CommandBarResult, searchCommandBar } from '../../services/life-os/command-bar-service';
import { getRoutineCoachService } from '../../services/routine/routine-coach-service';
import { hapticSelection } from '../../utils/haptics';
import { isFeatureVisible } from '../../config/feature-status';

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (result: CommandBarResult) => void;
};

const KIND_ICON: Record<CommandBarResult['kind'], keyof typeof Ionicons.glyphMap> = {
  note: 'document-text-outline',
  memory: 'heart-outline',
  goal: 'flag-outline',
  conversation: 'chatbubbles-outline',
  routine: 'repeat-outline',
  route: 'compass-outline',
  talk: 'mic-outline',
};

export function CommandBarSheet({ visible, onClose, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, services, companion } = useVoxa();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandBarResult[]>([]);
  const [loading, setLoading] = useState(false);

  const notesService = useMemo(() => getNotesService(services.storage), [services.storage]);
  const routineCoach = useMemo(
    () => getRoutineCoachService(services.storage, services.repositories),
    [services.storage, services.repositories],
  );

  const runSearch = useCallback(
    async (q: string) => {
      if (!profile) {
        setResults(searchCommandBar({ query: q }));
        return;
      }
      setLoading(true);
      try {
        const [notes, memories, goals, conversations, schedule] = await Promise.all([
          isFeatureVisible('notes') ? notesService.list(profile.id) : Promise.resolve([]),
          companion.listMemories(profile.id).catch(() => []),
          services.repositories.goals.listGoals(profile.id).catch(() => []),
          services.repositories.conversations.listConversations(profile.id).catch(() => []),
          routineCoach.getTodaySchedule(profile.id).catch(() => null),
        ]);
        const routineTitles = (schedule?.blocks ?? []).map((b) => b.title).filter(Boolean);
        setResults(
          searchCommandBar({
            query: q,
            notes,
            memories,
            goals,
            conversations: conversations.map((c) => ({
              id: c.id,
              title: c.title,
              summary: c.summary,
            })),
            routineTitles,
          }),
        );
      } finally {
        setLoading(false);
      }
    },
    [profile, notesService, companion, services.repositories, routineCoach],
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      return;
    }
    void runSearch('');
  }, [visible, runSearch]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => void runSearch(query), 220);
    return () => clearTimeout(t);
  }, [query, visible, runSearch]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close search" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.inputRow}>
            <Ionicons name="search" size={20} color={colors.primarySoft} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search your life…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Search your life"
              returnKeyType="search"
            />
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <VoxaText variant="caption" color="textMuted" style={styles.hint}>
            {loading ? 'Searching…' : 'Notes, memories, goals, routines, and places in Voxa'}
          </VoxaText>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            style={styles.list}
            ListEmptyComponent={
              <VoxaText variant="body" color="textSecondary" style={styles.empty}>
                Nothing matched. Try “notes”, “timeline”, or a goal name.
              </VoxaText>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => {
                  void hapticSelection();
                  onNavigate(item);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.subtitle ?? ''}`}>
                <View style={styles.iconWrap}>
                  <Ionicons name={KIND_ICON[item.kind] ?? 'ellipse-outline'} size={18} color={colors.primarySoft} />
                </View>
                <View style={styles.rowCopy}>
                  <VoxaText variant="body" numberOfLines={1}>
                    {item.title}
                  </VoxaText>
                  {item.subtitle ? (
                    <VoxaText variant="caption" color="textMuted" numberOfLines={1}>
                      {item.subtitle}
                    </VoxaText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'flex-start',
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxHeight: '78%',
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  hint: { paddingHorizontal: spacing.xs },
  list: { marginTop: spacing.xs },
  empty: { padding: spacing.lg, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowPressed: { opacity: 0.75, backgroundColor: colors.surface },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  rowCopy: { flex: 1, gap: 2 },
});
