import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { ChatMessageView } from '../types';

export function ChatScreen() {
  const { profile, companion } = useVoxa();
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const activeMode = profile?.companion.lastUsedMode ?? profile?.companion.defaultMode ?? 'friend';

  const loadChat = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const conversation = await companion.getOrCreateConversation(profile.id, activeMode, 'chat');
      const loadedMessages = await companion.loadChatMessages(conversation.id);
      setConversationId(conversation.id);
      setMessages(loadedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat.');
    } finally {
      setIsLoading(false);
    }
  }, [activeMode, companion, profile]);

  useFocusEffect(
    useCallback(() => {
      loadChat();
    }, [loadChat]),
  );

  useFocusEffect(
    useCallback(() => {
      if (messages.length > 0) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }, [messages, isTyping]),
  );

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || !profile || !conversationId) return;

    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      await companion.sendChatMessage({
        userId: profile.id,
        conversationId,
        content: trimmed,
        mode: activeMode,
      });
      const updatedMessages = await companion.loadChatMessages(conversationId);
      setMessages(updatedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenShell padded={false} glow="blue">
        <LoadingState label="Loading conversation..." />
      </ScreenShell>
    );
  }

  if (error && messages.length === 0) {
    return (
      <ScreenShell padded={false} glow="blue">
        <ErrorState message={error} onRetry={loadChat} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false} glow="blue">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={layout.tabBarHeight}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={18} color={colors.primarySoft} />
          </View>
          <View style={styles.headerCopy}>
            <VoxaText variant="subtitle">Voxa</VoxaText>
            <VoxaText variant="caption" color="safe">
              {isTyping ? 'Typing...' : 'Present · Emotionally aware'}
            </VoxaText>
          </View>
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
            <View style={[styles.row, item.role === 'user' && styles.rowUser]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleVoxa]}>
                <VoxaText variant="body">{item.text}</VoxaText>
                <VoxaText variant="caption" color="textMuted" style={styles.time}>
                  {item.time}
                </VoxaText>
              </View>
            </View>
          )}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typing}>
                <VoxaText variant="caption" color="textMuted">
                  Voxa is thinking...
                </VoxaText>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <GlassCard style={styles.inputCard}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={`Message Voxa, ${profile?.displayName ?? 'friend'}...`}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!isTyping}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || isTyping}
              style={[styles.send, (!input.trim() || isTyping) && styles.sendDisabled]}>
              <Ionicons name="arrow-up" size={16} color={colors.background} />
            </Pressable>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerCopy: { gap: 2 },
  inlineError: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  messages: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  bubbleVoxa: {
    backgroundColor: colors.chatVoxa,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bubbleUser: { backgroundColor: colors.chatUser, borderBottomRightRadius: 6 },
  time: { alignSelf: 'flex-end', fontSize: 11 },
  typing: { marginTop: spacing.sm, paddingHorizontal: layout.screenPadding },
  inputBar: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.md },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: spacing.md,
    paddingRight: 6,
    gap: spacing.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
