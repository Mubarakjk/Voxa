import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  CompositeScreenProps,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Alert,
  Share,
} from 'react-native';

import { SuggestedReplies } from '../components/chat/suggested-replies';
import { TypingIndicator } from '../components/chat/typing-indicator';
import { LimitReachedModal } from '../components/subscription/limit-reached-modal';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ChatEmptyState } from '../components/chat/chat-empty-state';
import { ChatInputBar } from '../components/chat/chat-input-bar';
import { ChatMessageBubble } from '../components/chat/chat-message-bubble';
import { ChatToolsSheet } from '../components/chat/chat-tools-sheet';
import { ADAPTIVE_MODE_LABELS, AdaptiveModeLabel } from '../types/phase3-intelligence';
import {
  ChatExperiencePayload,
  ContextCard,
  ConversationCanvas,
  LivingCompanionState,
  SmartChatAction,
} from '../types/phase4-intelligence';
import { ContextCardsRow } from '../components/phase4/context-cards-row';
import { SmartActionsRow } from '../components/phase4/smart-actions-row';
import { ConversationCanvasCard } from '../components/phase4/conversation-canvas-card';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { getAIProviderInfo } from '../services/ai/create-ai-service';
import { toggleBookmark, listBookmarks, removeBookmark, ChatBookmark } from '../services/chat/chat-bookmarks-service';
import {
  buildConversationStarters,
  buildPostReplyStarters,
} from '../services/chat/conversation-starters-service';
import { getCompanionJournalService } from '../services/journal/companion-journal-service';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { voiceNotePlayerService } from '../services/audio/voice-note-player-service';
import { speakSimple } from '../services/voice/simple-speech-service';
import { recordChatLatency } from '../utils/chat-debug-state';
import { logFeature } from '../utils/feature-logger';
import { recordTiming } from '../utils/performance-metrics';
import { isFeatureVisible } from '../config/feature-status';
import {
  buildAudioMemoryRef,
  isMemoryPinned,
  sortMemoriesWithPinnedFirst,
  VOICE_MEMORY_TAG,
} from '../utils/memory-pinned';
import { ChatMessageView, CompanionModeId, PendingAttachmentInput, createUuid, toChatMessageView } from '../types';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { openVoiceConversation } from '../utils/voice-navigation';
import { LiveCompanionOrb } from '../components/live-companion/live-companion-orb';
import { ChatDateSeparator, formatChatDateLabel } from '../components/phase7/chat-date-separator';
import { ChatContextChips } from '../components/phase7/chat-context-chips';
import { FocusModeBar } from '../components/phase9/focus-mode-bar';
import { buildChatContextChips } from '../services/phase7/chat-context-chips-service';
import { getFocusModeService } from '../services/phase9/focus-wake-service';
import { ComposerAction } from '../types/phase12-experiences';
import { FocusSession } from '../types/phase9-intelligence';

import { ResponseBlocks } from '../components/phase6/response-blocks';
import { MemoryPanel } from '../components/phase6/memory-panel';
import { THINKING_STATUS_LABELS } from '../types/phase6-premium';
import { buildMemoryPanel } from '../services/phase6/phase6-dashboard-service';
import { getConversationDraftsService } from '../services/phase6/conversation-drafts-service';
import { RichReplyPayload } from '../types/phase6-premium';

function capSuggestions(items: string[], max = 3): string[] {
  return items.slice(0, max);
}

function mergeChatViews(loaded: ChatMessageView[], inFlight: ChatMessageView[]): ChatMessageView[] {
  const byId = new Map<string, ChatMessageView>();
  for (const item of loaded) byId.set(item.id, item);
  for (const item of inFlight) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function messageSearchText(message: ChatMessageView): string {
  const parts = [message.text];
  for (const attachment of message.attachments ?? []) {
    if (attachment.transcription) parts.push(attachment.transcription);
    if (attachment.analysisSummary) parts.push(attachment.analysisSummary);
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function userMessageSendText(message: ChatMessageView): string {
  const audio = message.attachments?.find((item) => item.type === 'audio');
  if (audio?.transcription?.trim()) return audio.transcription.trim();
  return message.text?.trim() ?? '';
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Talk'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ChatScreen() {
  const route = useRoute<BottomTabScreenProps<MainTabParamList, 'Talk'>['route']>();
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, 'Talk'>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { profile, companion, refreshProfile, services } = useVoxa();
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<CompanionModeId>('friend');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [adaptiveModeLabel, setAdaptiveModeLabel] = useState<AdaptiveModeLabel>('friend');
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<ChatBookmark[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [smartActions, setSmartActions] = useState<SmartChatAction[]>([]);
  const [canvas, setCanvas] = useState<ConversationCanvas | null>(null);
  const [canvasExpanded, setCanvasExpanded] = useState(false);
  const [livingCompanion, setLivingCompanion] = useState<LivingCompanionState | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [memoryPanelItems, setMemoryPanelItems] = useState<import('../types/phase6-premium').MemoryPanelItem[]>([]);
  const [orbState, setOrbState] = useState<import('../components/live-companion/live-companion-orb').CompanionOrbState>('idle');
  const [orbMood, setOrbMood] = useState<import('../components/live-companion/live-companion-orb').CompanionOrbMood>('calm');
  const [contextChips, setContextChips] = useState<import('../components/phase7/chat-context-chips').ContextChip[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [focusProgress, setFocusProgress] = useState(0);
  const [composerFavourites, setComposerFavourites] = useState<import('../types/phase12-experiences').ComposerActionId[]>([]);
  const [richReplies, setRichReplies] = useState<Record<string, RichReplyPayload>>({});
  const [chatEmptyGreeting, setChatEmptyGreeting] = useState('Hey there');
  const [chatEmptyLine, setChatEmptyLine] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const pendingStarterRef = useRef<{ text: string; autoSend: boolean } | null>(null);
  const listRef = useRef<FlatList>(null);
  const loadedConversationRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);
  const thinkingStageInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    if (!thinkingStageInterval.current && isTyping) {
      thinkingStageInterval.current = setInterval(() => {
        setThinkingStage((s) => (s + 1) % THINKING_STATUS_LABELS.length);
      }, 2400);
    }
    if (!isTyping && thinkingStageInterval.current) {
      clearInterval(thinkingStageInterval.current);
      thinkingStageInterval.current = null;
    }
    return () => {
      if (thinkingStageInterval.current) clearInterval(thinkingStageInterval.current);
    };
  }, [isTyping]);

  useEffect(() => {
    if (!profile || !conversationId) return;
    void getConversationDraftsService(services.storage).get(profile.id, conversationId).then((draft) => {
      if (draft && !input) setInput(draft);
    });
  }, [profile?.id, conversationId]);

  useEffect(() => {
    if (!profile || !conversationId) return;
    const timer = setTimeout(() => {
      void getConversationDraftsService(services.storage).save(profile.id, conversationId, input);
    }, 400);
    return () => clearTimeout(timer);
  }, [input, profile?.id, conversationId, services.storage]);

  useEffect(() => {
    if (!profile) return;
    void companion.getHomeDashboard(profile.id).then((d) => {
      setMemoryPanelItems(
        buildMemoryPanel({
          memories: d.memories,
          goals: d.activeGoals,
          routine: d.routineSummary,
          journalInsight: d.phase2.dailyCoach.focus,
        }),
      );
      const living = d.phase7.livingCompanion;
      setOrbMood(living.mood);
      setOrbState(isTyping ? 'thinking' : living.state);
      setContextChips(
        buildChatContextChips({
          goals: d.activeGoals,
          memories: d.memories,
          routine: d.routineSummary,
          thinkingAbout: d.phase4.livingCompanion.thinkingAbout,
        }),
      );
    });
  }, [profile, companion, messages.length, isTyping]);

  const adaptiveDisplay = ADAPTIVE_MODE_LABELS[adaptiveModeLabel];

  const loadChat = useCallback(async (force = false) => {
    if (!profile) {
      setIsLoading(false);
      return;
    }
    if (!force && isTypingRef.current) return;

    const paramConversationId = route.params?.conversationId;
    const mode = profile.companion.lastUsedMode ?? profile.companion.defaultMode ?? 'friend';
    setActiveMode(mode);
    const loadStarted = Date.now();
    logFeature('chat.load', 'start');
    try {
      let conversation;
      if (paramConversationId) {
        conversation = await services.repositories.conversations.getConversation(paramConversationId);
        if (!conversation) {
          setError('Conversation not found.');
          setIsLoading(false);
          return;
        }
        setActiveMode(conversation.mode);
      }
      if (!conversation) {
        conversation = await companion.getOrCreateConversation(profile.id, mode, 'chat');
      }
      if (!force && loadedConversationRef.current === conversation.id && messages.length > 0) {
        setConversationId(conversation.id);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      const loadedMessages = await companion.loadChatMessages(conversation.id);
      setConversationId(conversation.id);
      setMessages((current) => {
        const inFlight = current.filter(
          (item) => item.status === 'pending' || item.status === 'failed',
        );
        return mergeChatViews(loadedMessages, inFlight);
      });
      loadedConversationRef.current = conversation.id;
      const experience = await companion.getChatExperience(profile.id, conversation.id).catch(() => null);
      if (experience) {
        setContextCards(experience.contextCards);
        setLivingCompanion(experience.livingCompanion);
        setCanvas(experience.canvas);
      }
      logFeature('chat.load', 'success', undefined, Date.now() - loadStarted);
      recordTiming('chat.load', Date.now() - loadStarted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat.';
      logFeature('chat.load', 'failure', message, Date.now() - loadStarted);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [companion, profile, messages.length, route.params?.conversationId, services.repositories.conversations]);

  useFocusEffect(
    useCallback(() => {
      if (!isTypingRef.current) {
        void loadChat();
      }
    }, [loadChat]),
  );

  useFocusEffect(
    useCallback(() => {
      if (messages.length > 0) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }, [messages, isTyping]),
  );

  useEffect(() => {
    if (!isTyping || streamingText) return;
    const timer = setInterval(() => {
      setThinkingStage((s) => (s + 1) % THINKING_STATUS_LABELS.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [isTyping, streamingText]);

  useEffect(() => {
    if (!profile || messages.length > 0) return;
    void (async () => {
      const [goals, memories, journal] = await Promise.all([
        services.repositories.goals.listActiveGoals(profile.id),
        services.repositories.memories.listMemories(profile.id),
        getCompanionJournalService(services.storage, services.repositories).getTodayEntry(),
      ]);
      const routine = await getRoutineCoachService(services.storage, services.repositories).getTodaySchedule(
        profile.id,
      );
      const sorted = sortMemoriesWithPinnedFirst(memories);
      const dashboard = await companion.getHomeDashboard(profile.id).catch(() => null);
      if (dashboard?.phase3.adaptiveModeLabel) {
        setAdaptiveModeLabel(dashboard.phase3.adaptiveModeLabel);
      }
      if (dashboard?.phase4.contextCards.length) {
        setContextCards(dashboard.phase4.contextCards);
      }
      if (dashboard?.phase4.livingCompanion) {
        setLivingCompanion(dashboard.phase4.livingCompanion);
      }
      setSuggestions(
        capSuggestions(
          buildConversationStarters({
            profile,
            routine,
            activeGoals: goals,
            latestJournal: journal,
            recentMoodLabel: dashboard?.wowExperience.moodLabel ?? null,
            continuePreview: dashboard?.wowExperience.continueConversation?.preview ?? null,
            pinnedMemories: sorted.filter((memory) => isMemoryPinned(memory)),
            recentMemory: sorted[0] ?? null,
            calendar: dashboard?.phase8.calendar ?? null,
            dailyPlan: dashboard?.phase9.dailyPlan ?? null,
            relationshipIntel: dashboard?.phase9.relationshipIntel ?? null,
            premiumStarters: dashboard?.phase9.quickPrompts,
          }),
        ),
      );
      if (dashboard?.phase9.quickPrompts) setQuickPrompts(dashboard.phase9.quickPrompts);
      if (dashboard?.phase11) {
        setChatEmptyGreeting(dashboard.phase11.rhythm.greeting);
        setChatEmptyLine(dashboard.phase11.emotionalMessage);
        setOrbMood(dashboard.phase11.mood);
      }
      if (dashboard?.phase12?.composerPrefs) {
        setComposerFavourites(dashboard.phase12.composerPrefs.favouriteActionIds);
      }
      if (dashboard?.phase9.activeFocus && profile) {
        setFocusSession(dashboard.phase9.activeFocus);
        setFocusProgress(getFocusModeService(services.storage).progressPercent(dashboard.phase9.activeFocus));
      }
    })();
  }, [profile, messages.length, services, companion]);

  useEffect(() => () => {
    void voiceNotePlayerService.stop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void listBookmarks().then(setBookmarks);
    }, []),
  );

  const sendMessage = async (attachments: PendingAttachmentInput[] = [], overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if ((!trimmed && attachments.length === 0) || isTyping || !profile || !conversationId) return;

    setInput('');
    setSuggestions([]);
    setSuggestionsDismissed(false);
    setIsTyping(true);
    setStreamingText(null);
    setThinkingStage(0);
    setError(null);

    const optimisticId = createUuid();
    const optimisticMessage: ChatMessageView = {
      id: optimisticId,
      role: 'user',
      text: trimmed || (attachments.length ? 'Sent an attachment' : ''),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      status: 'pending',
      attachments: attachments.length
        ? attachments.map((item, index) => ({
            id: `pending-${index}`,
            type: item.type,
            localUri: item.localUri,
            mimeType: item.mimeType,
            fileName: item.fileName,
            uploadStatus: 'uploading' as const,
            createdAt: new Date().toISOString(),
          }))
        : undefined,
    };
    setMessages((current) => [...current, optimisticMessage]);
    const started = Date.now();
    logFeature('chat.send', 'start');

    try {
      const result = await companion.sendChatMessage(
        {
          userId: profile.id,
          conversationId,
          content: trimmed,
          mode: activeMode,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        {
          onStreamChunk: (chunk) => setStreamingText((current) => (current ?? '') + chunk),
        },
      );

      if (result.sideEffect?.type === 'switch_mode') {
        setActiveMode(result.sideEffect.mode);
        setConversationId(result.sideEffect.conversationId);
        loadedConversationRef.current = result.sideEffect.conversationId;
        await refreshProfile();
      }

      if (result.adaptiveModeLabel) {
        setAdaptiveModeLabel(result.adaptiveModeLabel);
      }
      if (result.voxaMessage.mode) {
        setActiveMode(result.voxaMessage.mode);
      }

      if (result.chatExperience) {
        setContextCards(result.chatExperience.contextCards);
        setSmartActions(result.chatExperience.smartActions);
        setCanvas(result.chatExperience.canvas);
        setLivingCompanion(result.chatExperience.livingCompanion);
      }

      if (result.richReply) {
        setRichReplies((prev) => ({ ...prev, [result.voxaMessage.id]: result.richReply! }));
        if (result.richReply.followUpChips.length > 0) {
          setSuggestions(capSuggestions(result.richReply.followUpChips));
          setSuggestionsDismissed(false);
        }
      }

      if (profile && conversationId) {
        void getConversationDraftsService(services.storage).clear(profile.id, conversationId);
      }

      setMessages((current) => {
        const withoutOptimistic = current.filter((m) => m.id !== optimisticId);
        return [
          ...withoutOptimistic,
          toChatMessageView(result.userMessage),
          toChatMessageView(result.voxaMessage),
        ];
      });

      recordChatLatency(Date.now() - started, getAIProviderInfo().label);
      recordTiming('chat.send', Date.now() - started);
      logFeature('chat.send', 'success', undefined, Date.now() - started);
      const reply = result.voxaMessage.content;
      if (result.phase9Suggestions?.length) {
        setSuggestions(capSuggestions(result.phase9Suggestions.map((s) => s.prompt)));
        setSuggestionsDismissed(false);
      } else if (reply) {
        setSuggestions(capSuggestions(buildPostReplyStarters(reply, activeMode)));
        setSuggestionsDismissed(false);
      }

      if (result.sideEffect?.type === 'open_voice_conversation') {
        const stackNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
        if (stackNav) {
          openVoiceConversation(stackNav, {
            safe: result.sideEffect.safe,
            autoStart: result.sideEffect.autoStart,
          });
        }
      }
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      if (conversationId) {
        try {
          const reloaded = await companion.loadChatMessages(conversationId);
          setMessages(reloaded);
        } catch {
          // Keep reload failure secondary to send error
        }
      }
      logFeature('chat.send', 'failure', err instanceof Error ? err.message : 'send failed', Date.now() - started);
      if (err instanceof FeatureLimitError) {
        setLimitMessage(err.message);
        setLimitModalVisible(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message.');
      }
    } finally {
      setIsTyping(false);
      setStreamingText(null);
    }
  };

  const retryAttachmentUpload = useCallback(
    async (messageId: string, attachmentId: string) => {
      if (!profile || !conversationId) return;
      try {
        await companion.retryMessageAttachmentUpload({
          userId: profile.id,
          conversationId,
          messageId,
          attachmentId,
        });
        const updatedMessages = await companion.loadChatMessages(conversationId);
        setMessages((current) => {
          const inFlight = current.filter(
            (item) => item.status === 'pending' || item.status === 'failed',
          );
          return mergeChatViews(updatedMessages, inFlight);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload retry failed.');
      }
    },
    [profile, conversationId, companion],
  );

  useEffect(() => {
    const paramConversationId = route.params?.conversationId;
    if (!paramConversationId) return;
    if (loadedConversationRef.current === paramConversationId) return;
    void loadChat(true);
    navigation.setParams({ conversationId: undefined } as MainTabParamList['Talk']);
  }, [route.params?.conversationId, loadChat, navigation]);

  useEffect(() => {
    const starter = route.params?.starterPrompt;
    if (!starter) return;
    pendingStarterRef.current = { text: starter, autoSend: true };
    if (route.params?.mode) setActiveMode(route.params.mode);
    navigation.setParams({ starterPrompt: undefined, mode: undefined } as MainTabParamList['Talk']);
  }, [route.params?.starterPrompt, route.params?.mode, navigation]);

  useEffect(() => {
    const pending = pendingStarterRef.current;
    if (!pending?.autoSend || !conversationId || isLoading || isTyping) return;
    pendingStarterRef.current = null;
    void sendMessage([], pending.text);
  }, [conversationId, isLoading, isTyping]);

  const rememberMessage = useCallback(
    async (message: ChatMessageView) => {
      const audio = message.attachments?.find((item) => item.type === 'audio');
      const text = audio?.transcription?.trim() || message.text.trim();
      if (!profile || !text) return;
      try {
        await services.repositories.memories.createMemory({
          userId: profile.id,
          category: 'moments',
          title: audio ? 'Voice note' : 'Remember this',
          content: text,
          importance: 5,
          emotionalSignificance: 5,
          tags: ['remember-this', message.role, ...(audio ? [VOICE_MEMORY_TAG] : [])],
          source: audio ? 'audio' : 'conversation',
          relatedMode: activeMode,
          occurredAt: new Date().toISOString(),
        });
        if (audio) {
          const { getAchievementTriggersService } = await import('../services/phase10/achievement-triggers-service');
          void getAchievementTriggersService(services.storage).onVoiceNoteSaved(profile.id);
        }
        Alert.alert('Saved', 'Voxa will remember this moment.');
      } catch (err) {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
      }
    },
    [profile, services.repositories.memories, services.storage, activeMode],
  );

  const voxaTint = profile ? getVoxaAvatarTint(profile) : colors.primary;

  const handlePlayAloud = useCallback(
    async (message: ChatMessageView) => {
      if (!profile) return;
      const audio = message.attachments?.find((item) => item.type === 'audio');
      const text = audio?.transcription?.trim() || message.text?.trim();
      if (!text) return;
      try {
        await speakSimple(text, profile);
      } catch {
        Alert.alert('Playback failed', 'Could not play this message aloud.');
      }
    },
    [profile],
  );

  const handleCopyTranscript = useCallback(async (message: ChatMessageView) => {
    const audio = message.attachments?.find((item) => item.type === 'audio');
    const text = audio?.transcription?.trim() || message.text?.trim();
    if (!text) return;
    await Share.share({ message: text });
  }, []);

  const handleSaveVoiceMemory = useCallback(
    async (message: ChatMessageView) => {
      if (!profile) return;
      const audio = message.attachments?.find((item) => item.type === 'audio');
      const transcript = audio?.transcription?.trim();
      if (!transcript) {
        Alert.alert('No transcript', 'This voice note does not have a transcript yet.');
        return;
      }
      try {
        await services.repositories.memories.createMemory({
          userId: profile.id,
          category: 'moments',
          title: 'Voice memory',
          content: transcript,
          importance: 5,
          emotionalSignificance: 4,
          tags: [VOICE_MEMORY_TAG, buildAudioMemoryRef(audio!.id)],
          source: 'audio',
          relatedMode: activeMode,
          occurredAt: new Date().toISOString(),
        });
        Alert.alert('Saved', 'Voice memory added to Journey.');
      } catch (err) {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
      }
    },
    [profile, services.repositories.memories, activeMode],
  );

  const handleBookmark = useCallback(
    async (message: ChatMessageView) => {
      if (!conversationId || !message.text) return;
      try {
        await toggleBookmark({
          messageId: message.id,
          conversationId,
          text: message.text,
          role: message.role,
        });
        setBookmarks(await listBookmarks());
      } catch (err) {
        Alert.alert('Bookmark failed', err instanceof Error ? err.message : 'Could not save bookmark.');
      }
    },
    [conversationId],
  );

  const handleDelete = useCallback(
    async (message: ChatMessageView) => {
      try {
        await services.repositories.messages.deleteMessage(message.id);
        await removeBookmark(message.id);
        setMessages((current) => current.filter((m) => m.id !== message.id));
        setBookmarks(await listBookmarks());
      } catch {
        Alert.alert('Delete failed', 'Could not remove this message.');
      }
    },
    [services.repositories.messages],
  );

  const handleRegenerate = useCallback(
    async (voxaMessage: ChatMessageView) => {
      const index = messages.findIndex((m) => m.id === voxaMessage.id);
      if (index <= 0) return;
      const priorUser = [...messages.slice(0, index)].reverse().find((m) => m.role === 'user');
      const sendText = priorUser ? userMessageSendText(priorUser) : '';
      if (!sendText) return;
      try {
        await services.repositories.messages.deleteMessage(voxaMessage.id);
        setMessages((current) => current.filter((m) => m.id !== voxaMessage.id));
        await sendMessage([], sendText);
      } catch (err) {
        Alert.alert('Regenerate failed', err instanceof Error ? err.message : 'Could not regenerate reply.');
      }
    },
    [messages, services.repositories.messages, sendMessage],
  );

  const handleRetrySend = useCallback(
    async (message: ChatMessageView) => {
      const text = userMessageSendText(message);
      if (!text) return;
      setMessages((current) => current.filter((m) => m.id !== message.id));
      await sendMessage([], text);
    },
    [sendMessage],
  );

  const startNewConversation = async () => {
    if (!profile) return;
    try {
      const conv = await services.repositories.conversations.createConversation({
        userId: profile.id,
        mode: activeMode,
        channel: 'chat',
        title: 'New chat',
      });
      setConversationId(conv.id);
      loadedConversationRef.current = conv.id;
      setMessages([]);
      setSuggestions(capSuggestions([
        `Hey ${profile.displayName.split(' ')[0]}, what's on your mind?`,
        'Help me plan today',
        'I need to talk',
      ]));
    } catch (err) {
      Alert.alert('Could not start chat', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const handleSavePhotoMemory = useCallback(
    async (message: ChatMessageView) => {
      if (!profile) return;
      const image = message.attachments?.find((a) => a.type === 'image');
      const summary =
        image?.analysisSummary ??
        message.text?.trim() ??
        'A meaningful photo moment';
      try {
        await services.repositories.memories.createMemory({
          userId: profile.id,
          category: 'moments',
          title: 'Photo memory',
          content: summary,
          importance: 5,
          emotionalSignificance: 4,
          tags: ['photo-memory', message.role],
          source: 'image',
          relatedMode: activeMode,
          occurredAt: new Date().toISOString(),
        });
        Alert.alert('Saved', 'Photo memory added to Journey.');
      } catch (err) {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
      }
    },
    [profile, services.repositories.memories, activeMode],
  );

  const searchResults = searchQuery.trim()
    ? messages.filter((m) => messageSearchText(m).includes(searchQuery.toLowerCase()))
    : [];

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessageView; index: number }) => {
      const prev = messages[index - 1];
      const showDate =
        !prev || formatChatDateLabel(item.createdAt) !== formatChatDateLabel(prev.createdAt);
      return (
        <View>
          {showDate ? <ChatDateSeparator label={formatChatDateLabel(item.createdAt)} /> : null}
          <ChatMessageBubble
          message={item}
          voxaTint={voxaTint}
          voxaName={profile ? getVoxaDisplayName(profile) : 'Voxa'}
          bookmarked={bookmarks.some((b) => b.messageId === item.id)}
          onRetryUpload={(attachmentId) => void retryAttachmentUpload(item.id, attachmentId)}
          onRemember={(message) => void rememberMessage(message)}
          onBookmark={(message) => void handleBookmark(message)}
          onDelete={(message) => void handleDelete(message)}
          onRetrySend={(message) => void handleRetrySend(message)}
          onRegenerate={(message) => void handleRegenerate(message)}
          onPlayAloud={(message) => void handlePlayAloud(message)}
          onSavePhotoMemory={(message) => void handleSavePhotoMemory(message)}
          onSaveVoiceMemory={(message) => void handleSaveVoiceMemory(message)}
          onCopyTranscript={(message) => void handleCopyTranscript(message)}
        />
        {item.role === 'voxa' && richReplies[item.id]?.blocks?.length ? (
          <ResponseBlocks blocks={richReplies[item.id].blocks} />
        ) : null}
        </View>
      );
    },
    [
      voxaTint,
      profile,
      bookmarks,
      rememberMessage,
      retryAttachmentUpload,
      handleBookmark,
      handleDelete,
      handleRetrySend,
      handleRegenerate,
      handlePlayAloud,
      handleSavePhotoMemory,
      handleSaveVoiceMemory,
      handleCopyTranscript,
      richReplies,
      messages,
    ],
  );

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index < 0) return;
    setSearchOpen(false);
    setSearchQuery('');
    setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 120);
  };

  const handleContextCard = (card: ContextCard) => {
    void sendMessage([], card.prompt);
  };

  const handleSmartAction = async (action: SmartChatAction) => {
    if (!profile || !conversationId || isTyping) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const lastVoxa = [...messages].reverse().find((m) => m.role === 'voxa');
    const sourceText = lastUser ? userMessageSendText(lastUser) : '';
    const result = await companion.executeSmartChatAction({
      userId: profile.id,
      conversationId,
      action,
      mode: activeMode,
      sourceText: action.payload?.text ?? sourceText,
      messageId: lastVoxa?.id,
    });
    setActionFeedback(result.message);
    if (action.id === 'explain_differently') {
      void sendMessage([], 'Explain that differently');
    } else if (action.id === 'challenge_thinking') {
      void sendMessage([], 'Challenge my thinking on this');
    } else if (action.id === 'break_into_tasks') {
      void sendMessage([], 'Break this into tasks for me');
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleComposerAction = (action: ComposerAction) => {
    if (action.navigateTo === 'FocusMode') {
      navigation.navigate('FocusMode');
      return;
    }
    if (action.navigateTo === 'CreateReminder') {
      navigation.navigate('CreateReminder');
      return;
    }
    if (action.navigateTo === 'ScheduledCheckIns') {
      navigation.navigate('ScheduledCheckIns');
      return;
    }
    if (action.navigateTo === 'CompanionChallenges') {
      navigation.navigate('CompanionChallenges');
      return;
    }
    if (action.navigateTo === 'ConversationWorlds') {
      navigation.navigate('ConversationWorlds');
      return;
    }
    void sendMessage([], action.instruction);
  };

  const keyExtractor = useCallback((item: ChatMessageView) => item.id, []);

  if (isLoading) {
    return (
      <ScreenShell padded={false} glow="blue">
        <LoadingState label="Opening conversation..." />
      </ScreenShell>
    );
  }

  if (error && messages.length === 0) {
    return (
      <ScreenShell padded={false} glow="blue">
        <ErrorState message={error} onRetry={() => loadChat(true)} />
      </ScreenShell>
    );
  }

  const voxaName = getVoxaDisplayName(profile);
  const headerOrbState = isTyping ? 'thinking' : orbState;

  return (
    <ScreenShell padded={false} glow="blue">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={layout.tabBarHeight}>
        <View style={styles.header}>
          <View style={[styles.avatar, { borderColor: voxaTint }]}>
            <LiveCompanionOrb size={36} tint={voxaTint} active mood={orbMood} state={headerOrbState} intensity={0.55} />
          </View>
          <View style={styles.headerCopy}>
            <VoxaText variant="subtitle">{voxaName}</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {adaptiveDisplay}
            </VoxaText>
          </View>
          <Pressable style={styles.headerAction} onPress={() => setMemoryPanelOpen(true)} accessibilityLabel="Memory and context">
            <Ionicons name="layers-outline" size={18} color={colors.primarySoft} />
          </Pressable>
          <Pressable style={styles.headerAction} onPress={() => setHeaderMenuOpen(true)} accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.primarySoft} />
          </Pressable>
        </View>

        {livingCompanion?.thinkingAbout ? (
          <View style={styles.contextThought}>
            <VoxaText variant="caption" color="textSecondary" numberOfLines={1}>
              {livingCompanion.thinkingAbout}
            </VoxaText>
          </View>
        ) : null}

        {error ? (
          <View style={styles.inlineError}>
            <VoxaText variant="caption" color="textSecondary">
              {error}
            </VoxaText>
          </View>
        ) : null}

        {__DEV__ && contextCards.length > 0 ? (
          <ContextCardsRow
            cards={contextCards}
            thinkingAbout={livingCompanion?.thinkingAbout}
            onSelect={handleContextCard}
          />
        ) : null}

        {__DEV__ && contextChips.length > 0 ? (
          <ChatContextChips
            chips={contextChips}
            onSelect={(chip) => {
              if (chip.kind === 'goal') void sendMessage([], `Let's talk about my goal: ${chip.label}`);
              else if (chip.kind === 'memory') void sendMessage([], `Tell me more about "${chip.label}"`);
              else if (chip.kind === 'routine') void sendMessage([], chip.label);
              else void sendMessage([], chip.label);
            }}
          />
        ) : null}

        {__DEV__ && canvas ? (
          <ConversationCanvasCard
            canvas={canvas}
            expanded={canvasExpanded}
            onToggle={() => setCanvasExpanded((v) => !v)}
          />
        ) : null}

        {actionFeedback ? (
          <View style={styles.inlineError}>
            <VoxaText variant="caption" color="primarySoft">
              {actionFeedback}
            </VoxaText>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          removeClippedSubviews
          maxToRenderPerBatch={12}
          windowSize={9}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 200);
          }}
          ListEmptyComponent={
            !isTyping ? (
              <ChatEmptyState
                voxaName={voxaName}
                tint={voxaTint}
                greeting={chatEmptyGreeting}
                emotionalLine={chatEmptyLine}
                orbMood={orbMood}
                orbState={orbState}
                starters={messages.length === 0 ? capSuggestions(quickPrompts, 3) : []}
                onSelectStarter={(text) => void sendMessage([], text)}
              />
            ) : null
          }
          ListFooterComponent={
            isTyping ? (
              <TypingIndicator
                voxaName={voxaName}
                tint={voxaTint}
                streamingText={streamingText}
                thinkingLabel={THINKING_STATUS_LABELS[thinkingStage]}
              />
            ) : null
          }
        />

        {!isTyping && smartActions.length > 0 && __DEV__ ? (
          <SmartActionsRow actions={smartActions} onSelect={(action) => void handleSmartAction(action)} />
        ) : null}

        {!isTyping &&
        !suggestionsDismissed &&
        !input.trim() &&
        suggestions.length > 0 &&
        messages.length > 0 ? (
          <View style={styles.suggestions}>
            <SuggestedReplies
              suggestions={capSuggestions(suggestions)}
              onSelect={(text) => void sendMessage([], text)}
              onDismiss={() => setSuggestionsDismissed(true)}
            />
          </View>
        ) : null}

        {focusSession ? (
          <FocusModeBar
            session={focusSession}
            progressPercent={focusProgress}
            onEnd={() => {
              if (!profile) return;
              void getFocusModeService(services.storage).complete(profile.id);
              setFocusSession(null);
            }}
          />
        ) : null}

        <ChatInputBar
          value={input}
          onChangeText={(text) => {
            setInput(text);
            if (text.trim()) {
              setSuggestions([]);
              setSuggestionsDismissed(true);
            }
          }}
          onSend={(attachments) => void sendMessage(attachments)}
          disabled={isTyping}
          voxaName={voxaName}
          onOpenTools={() => setToolsSheetOpen(true)}
          onVoiceNoteLimit={(message) => {
            setLimitMessage(message);
            setLimitModalVisible(true);
          }}
        />
      </KeyboardAvoidingView>

      <ChatToolsSheet
        visible={toolsSheetOpen}
        onClose={() => setToolsSheetOpen(false)}
        onAction={handleComposerAction}
      />

      <MemoryPanel
        visible={memoryPanelOpen}
        items={memoryPanelItems}
        onClose={() => setMemoryPanelOpen(false)}
        onToggleInclude={() => undefined}
      />

      <Modal visible={headerMenuOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setHeaderMenuOpen(false)}>
          <View style={[styles.menuSheet, { top: layout.tabBarHeight + 56 }]}>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                void startNewConversation();
              }}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primarySoft} />
              <VoxaText variant="body">New conversation</VoxaText>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => { setHeaderMenuOpen(false); setSearchOpen(true); }}>
              <Ionicons name="search-outline" size={18} color={colors.primarySoft} />
              <VoxaText variant="body">Search conversation</VoxaText>
            </Pressable>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setHeaderMenuOpen(false);
                navigation.navigate('ConversationHistory');
              }}>
              <Ionicons name="time-outline" size={18} color={colors.primarySoft} />
              <VoxaText variant="body">History</VoxaText>
            </Pressable>
            {isFeatureVisible('musicRecognition') ? (
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setHeaderMenuOpen(false);
                  navigation.navigate('Music');
                }}>
                <Ionicons name="musical-notes-outline" size={18} color={colors.primarySoft} />
                <VoxaText variant="body">Music</VoxaText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={searchOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSearchOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <VoxaText variant="subtitle">Search conversation</VoxaText>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            <VoxaText variant="caption" color="textMuted">
              {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
            </VoxaText>
            {searchResults.slice(0, 8).map((item) => (
              <Pressable key={item.id} style={styles.searchRow} onPress={() => scrollToMessage(item.id)}>
                <VoxaText variant="caption" color="primarySoft">{item.role === 'user' ? 'You' : voxaName}</VoxaText>
                <VoxaText variant="body" numberOfLines={2}>{item.text || 'Attachment'}</VoxaText>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <LimitReachedModal
        visible={limitModalVisible}
        message={limitMessage}
        onUpgrade={() => {
          setLimitModalVisible(false);
          navigation.navigate('Paywall', { source: 'chat-limit' });
        }}
        onContinueFree={() => setLimitModalVisible(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: { flex: 1, gap: 2 },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inlineError: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  contextThought: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  messages: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  suggestions: { paddingHorizontal: layout.screenPadding },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: layout.screenPadding,
    paddingBottom: layout.tabBarHeight,
  },
  modalCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginVertical: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  modeRowActive: { backgroundColor: 'rgba(139, 124, 246, 0.08)' },
  modeRowCopy: { flex: 1, gap: 2 },
  menuSheet: {
    position: 'absolute',
    right: layout.screenPadding,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.sm,
    minWidth: 220,
    gap: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: 2,
  },
});
