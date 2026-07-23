import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { isFeatureVisible } from '../../config/feature-status';
import { colors, layout, radius, spacing } from '../../constants/theme';
import { useVoxa } from '../../context/voxa-context';
import { PendingAttachmentInput } from '../../types';
import {
  permissionErrorLabel,
  requestCameraPermission,
  requestMediaLibraryPermission,
} from '../../services/attachments/attachment-permissions';
import { getUpgradeCopy } from '../../services/billing/feature-registry';
import { checkVoiceNoteGate } from '../../services/voice-notes/voice-note-access';
import { voiceNotePlaybackService } from '../../services/voice-notes/voice-note-playback-service';
import { voiceNoteLog } from '../../services/voice-notes/voice-note-logger';
import { voiceNoteRecordingService } from '../../services/voice-notes/voice-note-recording-service';
import { GlassCard } from '../ui/glass-card';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import { VoiceNoteRecorder } from './voice-note-recorder';

type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (attachments: PendingAttachmentInput[]) => void;
  disabled?: boolean;
  voxaName: string;
  onOpenTools?: () => void;
  onVoiceNoteLimit?: (message: string) => void;
};

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled,
  voxaName,
  onOpenTools,
  onVoiceNoteLimit,
}: ChatInputBarProps) {
  const { profile, services } = useVoxa();
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentInput[]>([]);
  const [recordingMode, setRecordingMode] = useState(false);
  const [voiceNoteBusy, setVoiceNoteBusy] = useState(false);

  const showCamera = isFeatureVisible('cameraPhoto');
  const showVoiceNote = isFeatureVisible('voiceNote');
  const showGallery = isFeatureVisible('galleryPicker');

  useEffect(() => {
    if (showVoiceNote) {
      voiceNoteLog('BUTTON_RENDERED');
    }
  }, [showVoiceNote]);

  const addAttachment = (attachment: PendingAttachmentInput) => {
    setPendingAttachments((current) => [...current, attachment]);
  };

  const takePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission needed', permissionErrorLabel('camera'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    addAttachment({
      type: 'image',
      localUri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
      sizeBytes: asset.fileSize,
    });
  };

  const pickFromGallery = async () => {
    const granted = await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Permission needed', permissionErrorLabel('mediaLibrary'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    addAttachment({
      type: 'image',
      localUri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
      sizeBytes: asset.fileSize,
    });
  };

  const closeVoicePanel = () => {
    voiceNoteLog('PANEL_CLOSE');
    setRecordingMode(false);
    void voiceNoteRecordingService.reset();
    void voiceNotePlaybackService.stop();
  };

  const startVoiceMode = async () => {
    if (disabled || voiceNoteBusy) return;
    voiceNoteLog('BUTTON_TAP');
    setVoiceNoteBusy(true);
    try {
      if (profile) {
        const gate = await checkVoiceNoteGate({
          userId: profile.id,
          subscription: services.subscription,
          featureGate: services.featureGate,
          usageTracking: services.usageTracking,
        });
        if (!gate.allowed) {
          const message = gate.reason ?? getUpgradeCopy('voice_note');
          onVoiceNoteLimit?.(message);
          return;
        }
      }
      await voiceNotePlaybackService.stop();
      voiceNoteLog('PANEL_OPEN');
      setRecordingMode(true);
    } finally {
      setVoiceNoteBusy(false);
    }
  };

  const canSend = (value.trim().length > 0 || pendingAttachments.length > 0) && !disabled && !recordingMode;

  const handleSend = () => {
    if (!canSend) return;
    const hasVoiceNote = pendingAttachments.some((item) => item.type === 'audio');
    if (hasVoiceNote) {
      voiceNoteLog('SEND_SUCCESS');
    }
    onSend(pendingAttachments);
    setPendingAttachments([]);
    setRecordingMode(false);
  };

  return (
    <View style={styles.wrap}>
      <AttachmentPreviewTray
        attachments={pendingAttachments}
        onRemove={(index) =>
          setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
        }
      />

      <View style={styles.inputBar}>
        {onOpenTools && !recordingMode ? (
          <Pressable
            style={styles.iconBtn}
            onPress={onOpenTools}
            disabled={disabled}
            accessibilityLabel="Open chat tools">
            <Ionicons name="add" size={22} color={colors.primarySoft} />
          </Pressable>
        ) : null}

        {showCamera && !recordingMode ? (
          <Pressable style={styles.iconBtn} onPress={() => void takePhoto()} disabled={disabled}>
            <Ionicons name="camera-outline" size={22} color={colors.primarySoft} />
          </Pressable>
        ) : null}

        {recordingMode ? (
          <VoiceNoteRecorder
            disabled={disabled}
            onCancel={closeVoicePanel}
            onRecorded={(result) => {
              voiceNoteLog('PREVIEW_READY');
              setRecordingMode(false);
              addAttachment({
                type: 'audio',
                localUri: result.uri,
                mimeType: result.mimeType,
                fileName: `voice-${Date.now()}.m4a`,
                durationSeconds: Math.max(1, Math.round(result.durationMs / 1000)),
                sizeBytes: result.sizeBytes,
              });
            }}
          />
        ) : (
          <>
            <GlassCard style={styles.inputCard}>
              <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={`Message ${voxaName}...`}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                editable={!disabled}
                multiline
              />
            </GlassCard>

            {showVoiceNote ? (
              <Pressable
                style={styles.iconBtn}
                onPress={() => void startVoiceMode()}
                disabled={disabled || voiceNoteBusy}
                accessibilityLabel="Record voice note">
                <Ionicons name="mic-outline" size={22} color={colors.primarySoft} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[styles.sendBtn, !canSend && styles.sendDisabled]}
              accessibilityLabel="Send message">
              <Ionicons name="arrow-up" size={16} color={colors.background} />
            </Pressable>
          </>
        )}
      </View>

      {showGallery && !recordingMode ? (
        <View style={styles.secondaryRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => void pickFromGallery()} disabled={disabled}>
            <Ionicons name="images-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inputCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.xl,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 6,
    maxHeight: 140,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
