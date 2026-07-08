import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { SuggestedReplies } from '../components/chat/suggested-replies';
import { TypingIndicator } from '../components/chat/typing-indicator';
import { LimitReachedModal } from '../components/subscription/limit-reached-modal';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ChatInputBar } from '../components/chat/chat-input-bar';
import { ChatMessageBubble } from '../components/chat/chat-message-bubble';
import { getChatCompanionModes, getCompanionMode } from '../constants/companion-modes';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { FeatureLimitError } from '../services/billing/subscription-service';
import { ChatMessageView, CompanionModeId, PendingAttachmentInput, createUuid, toChatMessageView } from '../types';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';
import { VoiceOrb } from '../components/ui/voice-orb';

const THINKING_STAGES = [
  'Thinking...',
  'Considering what you said...',
  'Almost there...',
];

function mergeChatViews(loaded: ChatMessageView[], inFlight: ChatMessageView[]): ChatMessageView[] {
  const byId = new Map<string, ChatMessageView>();
  for (const item of loaded) byId.set(item.id, item);
  for (const item of inFlight) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

export function ChatScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList, 'Talk'>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
  const { profile, companion, refreshProfile } = useVoxa();
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<CompanionModeId>('friend');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const listRef = useRef<FlatList>(null);
  const loadedConversationRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  const modeConfig = getCompanionMode(activeMode);

  const loadChat = useCallback(async (force = false) => {
    if (!profile) return;
    if (!force && isTypingRef.current) return;

    const mode = profile.companion.lastUsedMode ?? profile.companion.defaultMode ?? 'friend';
    setActiveMode(mode);
    try {
      const conversation = await companion.getOrCreateConversation(profile.id, mode, 'chat');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat.');
    } finally {
      setIsLoading(false);
    }
  }, [companion, profile, messages.length]);

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
      setThinkingStage((s) => (s + 1) % THINKING_STAGES.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [isTyping, streamingText]);

  useEffect(() => {
    if (!profile || messages.length > 0) return;
    setSuggestions([
      `Hey ${profile.displayName.split(' ')[0]}, how are you?`,
      'What should I focus on today?',
      'Tell me something encouraging',
    ]);
  }, [profile, messages.length]);

  const switchMode = async (mode: CompanionModeId) => {
    if (!profile || isSwitchingMode) return;
    setModePickerOpen(false);
    setIsSwitchingMode(true);
    setError(null);
    try {
      const result = await companion.switchCompanionMode(profile.id, mode);
      setActiveMode(mode);
      setConversationId(result.conversation.id);
      loadedConversationRef.current = result.conversation.id;
      const loadedMessages = await companion.loadChatMessages(result.conversation.id);
      setMessages(loadedMessages);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch mode.');
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const sendMessage = async (attachments: PendingAttachmentInput[] = [], overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if ((!trimmed && attachments.length === 0) || isTyping || !profile || !conversationId) return;

    setInput('');
    setSuggestions([]);
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

      setMessages((current) => {
        const withoutOptimistic = current.filter((m) => m.id !== optimisticId);
        return [
          ...withoutOptimistic,
          toChatMessageView(result.userMessage),
          toChatMessageView(result.voxaMessage),
        ];
      });

      if (result.sideEffect?.type === 'navigate') {
        navigation.navigate(result.sideEffect.tab, {
          action: result.sideEffect.action,
        });
      }
    } catch (err) {
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticId ? { ...item, status: 'failed' as const } : item,
        ),
      );
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

  const retryAttachmentUpload = async (messageId: string, attachmentId: string) => {
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
  };

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
  const voxaTint = getVoxaAvatarTint(profile);

  return (
    <ScreenShell padded={false} glow="blue">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={layout.tabBarHeight}>
        <View style={styles.header}>
          <View style={[styles.avatar, { borderColor: voxaTint }]}>
            <VoiceOrb size={36} tint={voxaTint} active={isTyping} />
          </View>
          <View style={styles.headerCopy}>
            <VoxaText variant="subtitle">{voxaName}</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {modeConfig.shortLabel} · {modeConfig.tone}
            </VoxaText>
          </View>
          <Pressable style={styles.headerAction} onPress={() => navigation.navigate('Voxa', { action: 'music' })}>
            <Ionicons name="musical-notes-outline" size={18} color={colors.primarySoft} />
          </Pressable>
          <Pressable
            onPress={() => setModePickerOpen(true)}
            style={styles.headerAction}
            disabled={isSwitchingMode}>
            <Ionicons name="options-outline" size={18} color={colors.primarySoft} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.inlineError}>
            <VoxaText variant="caption" color="textSecondary">
              {error}
            </VoxaText>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ChatMessageBubble
              message={item}
              voxaTint={voxaTint}
              onRetryUpload={(attachmentId) => void retryAttachmentUpload(item.id, attachmentId)}
            />
          )}
          ListFooterComponent={
            isTyping ? (
              <TypingIndicator
                voxaName={voxaName}
                tint={voxaTint}
                streamingText={streamingText}
                thinkingLabel={THINKING_STAGES[thinkingStage]}
              />
            ) : null
          }
        />

        {!isTyping && suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            <SuggestedReplies
              suggestions={suggestions}
              onSelect={(text) => void sendMessage([], text)}
            />
          </View>
        ) : null}

        <ChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={(attachments) => void sendMessage(attachments)}
          disabled={isTyping}
          voxaName={voxaName}
        />
      </KeyboardAvoidingView>

      <Modal visible={modePickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModePickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <VoxaText variant="subtitle" style={styles.modalTitle}>
              How should Voxa show up?
            </VoxaText>
            {getChatCompanionModes().map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => switchMode(mode.id)}
                style={[styles.modeRow, activeMode === mode.id && styles.modeRowActive]}>
                <View style={styles.modeRowCopy}>
                  <VoxaText variant="body">{mode.shortLabel}</VoxaText>
                  <VoxaText variant="caption" color="textSecondary">
                    {mode.description}
                  </VoxaText>
                </View>
                {activeMode === mode.id ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primarySoft} />
                ) : null}
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
});
