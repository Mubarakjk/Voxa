import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type VoiceNoteRecorderProps = {
  onRecorded: (uri: string, durationSeconds: number) => void;
  onCancel: () => void;
  disabled?: boolean;
};

export function VoiceNoteRecorder({ onRecorded, onCancel, disabled }: VoiceNoteRecorderProps) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isRecording) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setElapsed(0);
      setIsRecording(true);
    } catch (err) {
      console.warn('[Voxa] Failed to start recording.', err);
    }
  };

  const stopRecording = async (send: boolean) => {
    const recording = recordingRef.current;
    if (!recording || !isRecording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (send && uri) {
        onRecorded(uri, Math.max(1, elapsed));
      } else {
        onCancel();
      }
    } catch (err) {
      console.warn('[Voxa] Failed to stop recording.', err);
      setIsRecording(false);
      onCancel();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <Pressable
        onPress={startRecording}
        disabled={disabled}
        style={[styles.micBtn, disabled && styles.disabled]}>
        <Ionicons name="mic" size={20} color={colors.primarySoft} />
      </Pressable>
    );
  }

  return (
    <View style={styles.recordingBar}>
      <View style={styles.recordingDot} />
      <VoxaText variant="caption" color="primarySoft">
        {formatTime(elapsed)}
      </VoxaText>
      <Pressable onPress={() => void stopRecording(false)} style={styles.actionBtn}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
      <Pressable onPress={() => void stopRecording(true)} style={[styles.actionBtn, styles.sendBtn]}>
        <Ionicons name="arrow-up" size={16} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  disabled: { opacity: 0.45 },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sendBtn: { backgroundColor: colors.primary },
});
