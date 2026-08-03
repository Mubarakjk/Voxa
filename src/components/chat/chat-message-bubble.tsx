import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { isFeatureVisible } from '../../config/feature-status';
import { colors, radius, spacing } from '../../constants/theme';
import { ChatMessageView } from '../../types';
import { VoxaText } from '../ui/voxa-text';
import { ChatMarkdownText } from '../phase11/chat-markdown-text';
import { LiveCompanionOrb } from '../live-companion/live-companion-orb';
import { VoiceNoteAttachment } from './voice-note-attachment';

type ChatMessageBubbleProps = {
  message: ChatMessageView;
  voxaTint: string;
  voxaName?: string;
  bookmarked?: boolean;
  isSpeaking?: boolean;
  onRetryUpload?: (attachmentId: string) => void;
  onRemember?: (message: ChatMessageView) => void;
  onBookmark?: (message: ChatMessageView) => void;
  onDelete?: (message: ChatMessageView) => void;
  onRetrySend?: (message: ChatMessageView) => void;
  onRegenerate?: (message: ChatMessageView) => void;
  onPlayAloud?: (message: ChatMessageView) => void;
  onSavePhotoMemory?: (message: ChatMessageView) => void;
  onSaveVoiceMemory?: (message: ChatMessageView) => void;
  onCopyTranscript?: (message: ChatMessageView) => void;
};

function ChatMessageBubbleComponent({
  message,
  voxaTint,
  voxaName = 'Voxa',
  bookmarked,
  isSpeaking,
  onRetryUpload,
  onRemember,
  onBookmark,
  onDelete,
  onRetrySend,
  onRegenerate,
  onPlayAloud,
  onSavePhotoMemory,
  onSaveVoiceMemory,
  onCopyTranscript,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  const audioAttachment = message.attachments?.find((item) => item.type === 'audio');
  const hasPhoto = message.attachments?.some((item) => item.type === 'image');
  const hasVoice = Boolean(audioAttachment);
  const transcript = audioAttachment?.transcription ?? message.text;

  const copyText = async () => {
    const text = transcript?.trim();
    if (!text) return;
    await Share.share({ message: text });
    setActionsOpen(false);
  };

  return (
    <>
      <Animated.View
        style={[styles.row, isUser && styles.rowUser, { opacity: fade, transform: [{ translateY: slide }] }]}>
        {!isUser ? (
          <View style={styles.bubbleAvatar}>
            <LiveCompanionOrb size={26} tint={voxaTint} active mood="calm" state="idle" intensity={0.45} />
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            if (message.status === 'failed' && isUser && onRetrySend) {
              onRetrySend(message);
            }
          }}
          onLongPress={() => setActionsOpen(true)}
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleVoxa,
            message.status === 'failed' && styles.failed,
            bookmarked && styles.bookmarked,
            hasVoice && styles.voiceBubble,
          ]}>
          {message.attachments?.map((attachment) => {
            if (attachment.type === 'image' && (attachment.remoteUrl ?? attachment.localUri)) {
              return (
                <Image
                  key={attachment.id}
                  source={{ uri: attachment.remoteUrl ?? attachment.localUri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              );
            }
            if (attachment.type === 'audio') {
              return (
                <VoiceNoteAttachment
                  key={attachment.id}
                  attachment={attachment}
                  onRetryUpload={
                    attachment.uploadStatus === 'failed' && onRetryUpload
                      ? () => onRetryUpload(attachment.id)
                      : undefined
                  }
                />
              );
            }
            return null;
          })}
          {message.text && !hasVoice ? (
            isUser ? (
              <VoxaText variant="body" style={styles.messageText}>
                {message.text}
              </VoxaText>
            ) : (
              <ChatMarkdownText text={message.text} />
            )
          ) : null}
          <View style={styles.footer}>
            {bookmarked ? <Ionicons name="bookmark" size={12} color={colors.primarySoft} /> : null}
            <VoxaText variant="caption" color="textMuted" style={styles.time}>
              {message.time}
              {message.status === 'failed' ? ' · Failed — tap to retry' : message.status === 'pending' ? ' · Sending…' : ''}
            </VoxaText>
            {!isUser && isFeatureVisible('playAloud') && message.text ? (
              <Pressable
                onPress={() => onPlayAloud?.(message)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isSpeaking ? 'Stop speaking' : `Play ${voxaName} aloud`}
                style={styles.speakBtn}>
                <Ionicons
                  name={isSpeaking ? 'stop-circle' : 'volume-medium'}
                  size={18}
                  color={isSpeaking ? colors.primary : colors.primarySoft}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>

      <Modal visible={actionsOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setActionsOpen(false)}>
          <View style={styles.sheet}>
            {hasVoice && onCopyTranscript ? (
              <ActionRow
                icon="copy-outline"
                label="Copy transcript"
                onPress={() => {
                  onCopyTranscript(message);
                  setActionsOpen(false);
                }}
              />
            ) : (
              <ActionRow icon="copy-outline" label="Copy" onPress={() => void copyText()} />
            )}
            {onRemember ? (
              <ActionRow
                icon="sparkles-outline"
                label="Remember this"
                onPress={() => {
                  onRemember(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {hasVoice && onSaveVoiceMemory ? (
              <ActionRow
                icon="bookmark-outline"
                label="Save to Journey"
                onPress={() => {
                  onSaveVoiceMemory(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {hasPhoto && onSavePhotoMemory ? (
              <ActionRow
                icon="images-outline"
                label="Save to Journey"
                onPress={() => {
                  onSavePhotoMemory(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {hasVoice && audioAttachment?.uploadStatus === 'failed' && onRetryUpload ? (
              <ActionRow
                icon="cloud-upload-outline"
                label="Retry upload"
                onPress={() => {
                  onRetryUpload(audioAttachment.id);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {onBookmark ? (
              <ActionRow
                icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
                label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                onPress={() => {
                  onBookmark(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {!isUser && onRegenerate ? (
              <ActionRow
                icon="refresh-outline"
                label="Regenerate"
                onPress={() => {
                  onRegenerate(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {transcript && onPlayAloud && isFeatureVisible('playAloud') ? (
              <ActionRow
                icon="volume-high-outline"
                label="Play aloud transcript"
                onPress={() => {
                  onPlayAloud(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
            {isUser && onDelete ? (
              <ActionRow
                icon="trash-outline"
                label="Delete"
                onPress={() => {
                  onDelete(message);
                  setActionsOpen(false);
                }}
              />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.primarySoft} />
      <VoxaText variant="body">{label}</VoxaText>
    </Pressable>
  );
}

export const ChatMessageBubble = memo(ChatMessageBubbleComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  rowUser: { justifyContent: 'flex-end' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  voiceBubble: { minWidth: 250 },
  bubbleVoxa: {
    backgroundColor: colors.chatVoxa,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bubbleUser: {
    backgroundColor: colors.chatUser,
    borderBottomRightRadius: 6,
  },
  bookmarked: { borderColor: colors.primarySoft },
  failed: { borderWidth: 1, borderColor: colors.danger },
  messageText: { lineHeight: 22, fontSize: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  speakBtn: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 11 },
  image: { width: 220, height: 160, borderRadius: radius.md, backgroundColor: colors.surface },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#12121E',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
