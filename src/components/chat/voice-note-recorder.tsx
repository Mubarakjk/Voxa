import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import {
  voiceNoteRecordingService,
  type VoiceNoteRecordingSnapshot,
} from '../../services/voice-notes/voice-note-recording-service';
import { voiceNotePlaybackService } from '../../services/voice-notes/voice-note-playback-service';
import { PrimaryButton } from '../ui/buttons';
import { VoxaText } from '../ui/voxa-text';
import { VoiceNoteWaveform } from './voice-note-waveform';

export type VoiceNoteRecordingResult = {
  uri: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: 'audio/m4a';
};

type VoiceNoteRecorderProps = {
  onRecorded: (result: VoiceNoteRecordingResult) => void;
  onCancel: () => void;
  disabled?: boolean;
};

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceNoteRecorder({ onRecorded, onCancel, disabled }: VoiceNoteRecorderProps) {
  const [snap, setSnap] = useState<VoiceNoteRecordingSnapshot>(() => voiceNoteRecordingService.getSnapshot());
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = voiceNoteRecordingService.subscribe((next) => {
      if (mountedRef.current) setSnap(next);
    });
    const unsubPlayback = voiceNotePlaybackService.subscribe((state) => {
      if (!mountedRef.current) return;
      setPreviewPlaying(Boolean(state?.attachmentId === 'preview' && state.isPlaying));
    });
    return () => {
      mountedRef.current = false;
      unsub();
      unsubPlayback();
      void voiceNoteRecordingService.reset();
    };
  }, []);

  const handleRecord = () => {
    if (disabled) return;
    void voiceNoteRecordingService.start();
  };

  const handleStop = () => {
    void voiceNoteRecordingService.stop();
  };

  const handleCancel = () => {
    void voiceNoteRecordingService.cancel().then(onCancel);
  };

  const handleRetry = () => {
    void voiceNoteRecordingService.reset();
    setSnap(voiceNoteRecordingService.getSnapshot());
  };

  const handlePreviewToggle = async () => {
    if (!snap.uri) return;
    if (previewPlaying) {
      await voiceNotePlaybackService.stop();
      return;
    }
    await voiceNotePlaybackService.playPreview(snap.uri);
  };

  const handleSend = () => {
    if (!snap.uri || !snap.sizeBytes) return;
    onRecorded({
      uri: snap.uri,
      durationMs: snap.durationMs,
      sizeBytes: snap.sizeBytes,
      mimeType: 'audio/m4a',
    });
    void voiceNoteRecordingService.reset();
  };

  const handleDeleteReady = () => {
    void voiceNoteRecordingService.reset();
  };

  if (snap.state === 'failed') {
    return (
      <View style={styles.bar}>
        <VoxaText variant="caption" color="danger" style={styles.flexText}>
          {snap.errorMessage ?? 'Microphone could not start'}
        </VoxaText>
        <PrimaryButton label="Retry" onPress={handleRetry} />
        <Pressable onPress={handleCancel} style={styles.iconBtn} accessibilityLabel="Cancel">
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  if (snap.state === 'ready' && snap.uri) {
    return (
      <View style={styles.bar}>
        <VoxaText variant="caption" color="primarySoft">{formatTime(snap.durationMs)}</VoxaText>
        <Pressable onPress={() => void handlePreviewToggle()} style={styles.iconBtn}>
          <Ionicons name={previewPlaying ? 'pause' : 'play'} size={16} color={colors.primarySoft} />
        </Pressable>
        <Pressable onPress={handleDeleteReady} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={handleSend} style={[styles.iconBtn, styles.sendBtn]}>
          <Ionicons name="checkmark" size={16} color={colors.background} />
        </Pressable>
        <Pressable onPress={handleCancel} style={styles.iconBtn}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  const isRecording = snap.state === 'recording' || snap.state === 'paused';
  const isBusy = snap.state === 'preparing' || snap.state === 'requesting_permission' || snap.state === 'stopping';

  if (!isRecording) {
    return (
      <View style={styles.bar}>
        <VoxaText variant="caption" color="textMuted" style={styles.flexText}>
          Tap Record to begin
        </VoxaText>
        <PrimaryButton label={isBusy ? 'Starting…' : 'Record'} onPress={handleRecord} disabled={disabled || isBusy} />
        <Pressable onPress={handleCancel} style={styles.iconBtn} accessibilityLabel="Cancel">
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.recordingDot} />
      <VoxaText variant="caption" color="primarySoft" style={styles.timer}>
        {formatTime(snap.durationMs)}
      </VoxaText>
      <VoiceNoteWaveform active={snap.state === 'recording'} level={snap.metering} barCount={14} />
      {Platform.OS === 'ios' ? (
        <VoxaText variant="caption" color="textMuted" style={styles.hint}>
          Device mic recommended
        </VoxaText>
      ) : null}
      <Pressable onPress={handleCancel} style={styles.iconBtn}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        onPress={() => (snap.state === 'paused' ? voiceNoteRecordingService.resume() : voiceNoteRecordingService.pause())}
        style={styles.iconBtn}>
        <Ionicons name={snap.state === 'paused' ? 'play' : 'pause'} size={16} color={colors.textSecondary} />
      </Pressable>
      <Pressable onPress={handleStop} style={[styles.iconBtn, styles.sendBtn]}>
        <Ionicons name="stop" size={14} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 48,
  },
  flexText: { flex: 1 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  timer: { minWidth: 36 },
  hint: { fontSize: 10, maxWidth: 64 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sendBtn: { backgroundColor: colors.primary },
});
