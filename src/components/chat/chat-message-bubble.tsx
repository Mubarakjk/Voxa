import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { ChatMessageView, MessageAttachment } from '../../types';
import { VoxaText } from '../ui/voxa-text';

type ChatMessageBubbleProps = {
  message: ChatMessageView;
  voxaTint: string;
  onRetryUpload?: (attachmentId: string) => void;
  onRemember?: (message: ChatMessageView) => void;
};

function ChatMessageBubbleComponent({ message, voxaTint, onRetryUpload, onRemember }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  return (
    <>
      <Animated.View
        style={[styles.row, isUser && styles.rowUser, { opacity: fade, transform: [{ translateY: slide }] }]}>
        {!isUser ? (
          <View style={[styles.bubbleAvatar, { backgroundColor: `${voxaTint}22` }]}>
            <Ionicons name="sparkles" size={12} color={voxaTint} />
          </View>
        ) : null}
        <Pressable
          onLongPress={() => setActionsOpen(true)}
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleVoxa,
            message.status === 'failed' && styles.failed,
          ]}>
          {message.attachments?.map((attachment) => (
            <AttachmentContent
              key={attachment.id}
              attachment={attachment}
              onRetryUpload={isUser ? onRetryUpload : undefined}
            />
          ))}
          {message.text ? <VoxaText variant="body">{message.text}</VoxaText> : null}
          <View style={styles.footer}>
            {reaction ? <VoxaText variant="caption">{reaction}</VoxaText> : null}
            <VoxaText variant="caption" color="textMuted" style={styles.time}>
              {message.time}
              {message.status === 'failed' ? ' · Failed' : message.status === 'pending' ? ' · Sending…' : ''}
            </VoxaText>
          </View>
        </Pressable>
      </Animated.View>

      <Modal visible={actionsOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setActionsOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ActionRow icon="copy-outline" label="Copy" onPress={() => void Share.share({ message: message.text })} />
            <ActionRow
              icon="sparkles-outline"
              label="Remember this"
              onPress={() => {
                onRemember?.(message);
                setActionsOpen(false);
              }}
            />
            <View style={styles.reactions}>
              {['❤️', '😂', '🙏', '🔥', '👍'].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    setReaction(emoji);
                    setActionsOpen(false);
                  }}
                  style={styles.emojiBtn}>
                  <VoxaText variant="body">{emoji}</VoxaText>
                </Pressable>
              ))}
            </View>
          </Pressable>
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

function AttachmentContent({
  attachment,
  onRetryUpload,
}: {
  attachment: MessageAttachment;
  onRetryUpload?: (attachmentId: string) => void;
}) {
  const uri = attachment.remoteUrl ?? attachment.localUri;

  if (attachment.type === 'image' && uri) {
    return (
      <View style={styles.mediaWrap}>
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        {attachment.uploadStatus === 'uploading' ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.primarySoft} />
          </View>
        ) : null}
        {attachment.uploadStatus === 'failed' && onRetryUpload ? (
          <Pressable style={styles.retryBtn} onPress={() => onRetryUpload(attachment.id)}>
            <Ionicons name="refresh" size={14} color={colors.text} />
            <VoxaText variant="caption">Retry</VoxaText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (attachment.type === 'audio' && uri) {
    return <AudioAttachment attachment={attachment} onRetryUpload={onRetryUpload} />;
  }

  if (attachment.type === 'video' && uri) {
    return <VideoAttachment attachment={attachment} onRetryUpload={onRetryUpload} />;
  }

  return (
    <View style={styles.fileChip}>
      <Ionicons name="document-outline" size={16} color={colors.primarySoft} />
      <VoxaText variant="caption" color="textSecondary">
        {attachment.fileName ?? 'Attachment'}
      </VoxaText>
    </View>
  );
}

function AudioAttachment({
  attachment,
  onRetryUpload,
}: {
  attachment: MessageAttachment;
  onRetryUpload?: (attachmentId: string) => void;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const uri = attachment.remoteUrl ?? attachment.localUri;

  const togglePlayback = async () => {
    if (!uri) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
      await sound.playAsync();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[Voxa] Audio playback failed.', err);
    }
  };

  const label =
    attachment.transcription ??
    attachment.analysisSummary ??
    (attachment.durationSeconds ? `Voice note · ${Math.round(attachment.durationSeconds)}s` : 'Voice note');

  return (
    <View style={styles.audioChip}>
      <Pressable onPress={() => void togglePlayback()} style={styles.playBtn}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.background} />
      </Pressable>
      <VoxaText variant="caption" color="textSecondary" style={styles.audioLabel}>
        {label}
      </VoxaText>
      {attachment.uploadStatus === 'failed' && onRetryUpload ? (
        <Pressable onPress={() => onRetryUpload(attachment.id)}>
          <Ionicons name="refresh" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function VideoAttachment({
  attachment,
  onRetryUpload,
}: {
  attachment: MessageAttachment;
  onRetryUpload?: (attachmentId: string) => void;
}) {
  const [showPlayer, setShowPlayer] = useState(false);
  const uri = attachment.remoteUrl ?? attachment.localUri;
  const thumb = attachment.thumbnailUri ?? uri;

  return (
    <View style={styles.mediaWrap}>
      {showPlayer && uri ? (
        <Video source={{ uri }} style={styles.image} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      ) : thumb ? (
        <Pressable onPress={() => setShowPlayer(true)}>
          <Image source={{ uri: thumb }} style={styles.image} resizeMode="cover" />
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={36} color={colors.text} />
          </View>
        </Pressable>
      ) : null}
      {attachment.uploadStatus === 'failed' && onRetryUpload ? (
        <Pressable style={styles.retryBtn} onPress={() => onRetryUpload(attachment.id)}>
          <Ionicons name="refresh" size={14} color={colors.text} />
          <VoxaText variant="caption">Retry</VoxaText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', gap: spacing.xs },
  rowUser: { justifyContent: 'flex-end' },
  bubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginRight: spacing.xs,
  },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  bubbleVoxa: {
    backgroundColor: colors.chatVoxa,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bubbleUser: { backgroundColor: colors.chatUser, borderBottomRightRadius: 6 },
  failed: { borderWidth: 1, borderColor: colors.danger },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  time: { fontSize: 11 },
  mediaWrap: { borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  image: { width: 220, height: 160, backgroundColor: colors.surface },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  audioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabel: { flex: 1 },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  reactions: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
  emojiBtn: { padding: spacing.sm },
});
