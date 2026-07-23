import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { MessageAttachment } from '../../types';
import { voiceNotePlaybackService } from '../../services/voice-notes/voice-note-playback-service';
import { VoxaText } from '../ui/voxa-text';
import { VoiceNoteWaveform } from './voice-note-waveform';

type VoiceNoteAttachmentProps = {
  attachment: MessageAttachment;
  onRetryUpload?: () => void;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceNoteAttachment({ attachment, onRetryUpload }: VoiceNoteAttachmentProps) {
  const uri = attachment.remoteUrl ?? attachment.localUri;
  const [playback, setPlayback] = useState<{
    isPlaying: boolean;
    positionMs: number;
    durationMs: number;
  } | null>(null);

  useEffect(() => {
    return voiceNotePlaybackService.subscribe((state) => {
      if (!state || state.attachmentId !== attachment.id) {
        setPlayback(null);
        return;
      }
      setPlayback({
        isPlaying: state.isPlaying,
        positionMs: state.positionMs,
        durationMs: state.durationMs,
      });
    });
  }, [attachment.id]);

  const durationSeconds =
    attachment.durationSeconds ??
    (playback?.durationMs ? Math.max(1, Math.round(playback.durationMs / 1000)) : 0);
  const progress =
    playback && playback.durationMs > 0 ? playback.positionMs / playback.durationMs : 0;
  const isPlaying = playback?.isPlaying ?? false;

  const togglePlay = async () => {
    if (!uri) {
      Alert.alert('Playback unavailable', 'This voice note file is missing.');
      return;
    }
    try {
      await voiceNotePlaybackService.play(attachment.id, uri);
    } catch (err) {
      Alert.alert('Playback failed', err instanceof Error ? err.message : 'Could not play voice note.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.playerRow}>
        <Pressable style={styles.playBtn} onPress={() => void togglePlay()} disabled={!uri}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.background} />
        </Pressable>
        <VoiceNoteWaveform active={isPlaying} level={isPlaying ? 0.75 : 0.25} barCount={10} />
        <VoxaText variant="caption" color="textMuted" style={styles.duration}>
          {formatDuration(durationSeconds || 0)}
        </VoxaText>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>

      {attachment.uploadStatus === 'failed' && onRetryUpload ? (
        <Pressable onPress={onRetryUpload}>
          <VoxaText variant="caption" color="danger">
            Upload failed · Retry
          </VoxaText>
        </Pressable>
      ) : null}

      {attachment.transcription ? (
        <VoxaText variant="caption" color="textSecondary" style={styles.transcript}>
          {attachment.transcription}
        </VoxaText>
      ) : (
        <VoxaText variant="caption" color="textMuted" style={styles.transcript}>
          Transcription pending
        </VoxaText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    minWidth: 220,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: { minWidth: 36, textAlign: 'right' },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
  },
  transcript: { lineHeight: 18, marginTop: 2 },
});
