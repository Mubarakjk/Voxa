import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { voiceNoteAudioLock } from '../services/voice-notes/voice-note-audio-lock';
import { audioSessionManager } from '../services/audio/audio-session-manager';
import {
  formatSafeRecorderStatus,
  getVoiceNoteRecordingDiagnostics,
} from '../services/voice-notes/voice-note-recording-diagnostics';
import { voiceNoteRecordingService } from '../services/voice-notes/voice-note-recording-service';

export function VoiceNoteRecorderDiagnosticScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [diag, setDiag] = useState(getVoiceNoteRecordingDiagnostics());
  const [rawStatus, setRawStatus] = useState('recorder=null');
  const [permissionLabel, setPermissionLabel] = useState('unknown');
  const [busy, setBusy] = useState(false);

  const [liveFields, setLiveFields] = useState({
    canRecord: '—',
    isRecording: '—',
    durationMillis: '—',
    mediaServicesDidReset: '—',
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setDiag(getVoiceNoteRecordingDiagnostics());
      const status = voiceNoteRecordingService.getRawRecorderStatus();
      setRawStatus(formatSafeRecorderStatus(status));
      setLiveFields({
        canRecord: status ? String(status.canRecord) : '—',
        isRecording: status ? String(status.isRecording) : '—',
        durationMillis: status ? String(status.durationMillis) : '—',
        mediaServicesDidReset: status ? String(status.mediaServicesDidReset) : '—',
      });
      void getRecordingPermissionsAsync().then((result) => {
        setPermissionLabel(`${result.status}${result.granted ? ' · granted' : ''}`);
      });
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">Back</VoxaText>
        </Pressable>

        <VoxaText variant="title">Voice note recorder diagnostic</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Raw native status polled every 250ms. Duration comes from expo-audio getStatus() only.
        </VoxaText>

        <View style={styles.panel}>
          <VoxaText variant="subtitle">Live native status (250ms poll)</VoxaText>
          <Row label="canRecord" value={liveFields.canRecord} />
          <Row label="isRecording" value={liveFields.isRecording} />
          <Row label="durationMillis" value={liveFields.durationMillis} />
          <Row label="mediaServicesDidReset" value={liveFields.mediaServicesDidReset} />
          <Row label="audio owner (voice-note lock)" value={voiceNoteAudioLock.getOwner() ?? 'idle'} />
          <Row label="expo-av session lock" value={audioSessionManager.getLockOwner()} />
          <Row label="voice call active" value={String(audioSessionManager.voiceCallActive)} />
          <VoxaText variant="caption" color="textMuted">{rawStatus}</VoxaText>
        </View>

        <View style={styles.panel}>
          <VoxaText variant="subtitle">Start sequence</VoxaText>
          <Row label="Last step" value={diag.lastStep} />
          <Row label="Step detail" value={diag.lastStepDetail ?? '—'} />
          <Row label="Flow stopped at" value={diag.flowStoppedAt ?? '—'} />
          <Row label="Permission status" value={permissionLabel} />
          <Row label="Permission granted" value={String(diag.permissionGranted ?? 'unknown')} />
          <Row label="Audio mode configured" value={String(diag.audioModeConfigured)} />
          <Row label="Recorder created" value={String(diag.recorderCreated)} />
          <Row label="Prepare status" value={diag.prepareStatus} />
          <Row label="record() called" value={String(diag.recordCalled)} />
          <Row label="Start status" value={diag.startStatus} />
          <Row label="Start error" value={diag.startError ?? 'none'} />
          <Row label="Last native error" value={diag.lastNativeError ?? 'none'} />
          <Row label="Audio owner" value={voiceNoteAudioLock.getOwner() ?? 'idle'} />
          <Row label="App state" value={diag.appState} />
          <Row label="Service state" value={voiceNoteRecordingService.getSnapshot().state} />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Request permission" disabled={busy} onPress={() => void run(() => voiceNoteRecordingService.requestPermission().then(() => undefined))} />
          <PrimaryButton label="Start recording" disabled={busy} onPress={() => void run(() => voiceNoteRecordingService.start())} />
          <PrimaryButton label="Stop recording" disabled={busy} onPress={() => void run(async () => { await voiceNoteRecordingService.stop(); })} />
          <PrimaryButton label="Reset" variant="ghost" disabled={busy} onPress={() => void run(() => voiceNoteRecordingService.reset())} />
        </View>

        <View style={styles.panel}>
          <VoxaText variant="subtitle">Recent samples</VoxaText>
          {diag.samples.slice(0, 12).map((sample) => (
            <VoxaText key={sample.at} variant="caption" color="textMuted">
              {sample.at.slice(11, 19)} · canRecord={String(sample.canRecord)} · isRecording={String(sample.isRecording)} · durationMillis={sample.durationMillis} · reset={String(sample.mediaServicesDidReset)}
            </VoxaText>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <VoxaText variant="caption" color="textMuted">{label}</VoxaText>
      <VoxaText variant="caption" color="textSecondary" style={styles.rowValue}>{value}</VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  panel: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actions: { gap: spacing.sm },
  row: { gap: 2 },
  rowValue: { fontFamily: 'Menlo' },
});
