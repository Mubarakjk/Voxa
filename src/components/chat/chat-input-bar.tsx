import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, layout, radius, spacing } from '../../constants/theme';
import { PendingAttachmentInput } from '../../types';
import {
  permissionErrorLabel,
  requestCameraPermission,
  requestMediaLibraryPermission,
  requestMicrophonePermission,
} from '../../services/attachments/attachment-permissions';
import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import { VoiceNoteRecorder } from './voice-note-recorder';

type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (attachments: PendingAttachmentInput[]) => void;
  disabled?: boolean;
  voxaName: string;
};

type AttachmentMenuItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => Promise<void>;
};

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled,
  voxaName,
}: ChatInputBarProps) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentInput[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);

  const addAttachment = (attachment: PendingAttachmentInput) => {
    setPendingAttachments((current) => [...current, attachment]);
  };

  const pickImage = async (fromCamera: boolean) => {
    setMenuOpen(false);
    const granted = fromCamera ? await requestCameraPermission() : await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Permission needed', permissionErrorLabel(fromCamera ? 'camera' : 'mediaLibrary'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
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

  const pickVideo = async (fromCamera: boolean) => {
    setMenuOpen(false);
    const granted = fromCamera ? await requestCameraPermission() : await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Permission needed', permissionErrorLabel(fromCamera ? 'camera' : 'mediaLibrary'));
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          videoMaxDuration: 60,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
          videoMaxDuration: 120,
        });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    addAttachment({
      type: 'video',
      localUri: asset.uri,
      mimeType: asset.mimeType ?? 'video/mp4',
      fileName: asset.fileName ?? `video-${Date.now()}.mp4`,
      sizeBytes: asset.fileSize,
      durationSeconds: asset.duration ? asset.duration / 1000 : undefined,
    });
  };

  const startVoiceMode = async () => {
    setMenuOpen(false);
    const granted = await requestMicrophonePermission();
    if (!granted) {
      Alert.alert('Permission needed', permissionErrorLabel('microphone'));
      return;
    }
    setRecordingMode(true);
  };

  const menuItems: AttachmentMenuItem[] = [
    { id: 'photo-lib', label: 'Photo library', icon: 'images-outline', action: () => pickImage(false) },
    { id: 'photo-cam', label: 'Take photo', icon: 'camera-outline', action: () => pickImage(true) },
    { id: 'video-lib', label: 'Video library', icon: 'film-outline', action: () => pickVideo(false) },
    { id: 'video-cam', label: 'Record video', icon: 'videocam-outline', action: () => pickVideo(true) },
    { id: 'voice', label: 'Voice note', icon: 'mic-outline', action: startVoiceMode },
  ];

  const canSend = (value.trim().length > 0 || pendingAttachments.length > 0) && !disabled;

  const handleSend = () => {
    if (!canSend) return;
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
        <Pressable
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          disabled={disabled}>
          <Ionicons name="add" size={22} color={colors.textMuted} />
        </Pressable>

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
          />
          <Pressable onPress={handleSend} disabled={!canSend} style={[styles.send, !canSend && styles.sendDisabled]}>
            <Ionicons name="arrow-up" size={16} color={colors.background} />
          </Pressable>
        </GlassCard>

        {recordingMode ? (
          <VoiceNoteRecorder
            disabled={disabled}
            onCancel={() => setRecordingMode(false)}
            onRecorded={(uri, durationSeconds) => {
              setRecordingMode(false);
              onSend([
                {
                  type: 'audio',
                  localUri: uri,
                  mimeType: 'audio/m4a',
                  fileName: `voice-${Date.now()}.m4a`,
                  durationSeconds,
                },
              ]);
            }}
          />
        ) : (
          <Pressable style={styles.iconBtn} onPress={startVoiceMode} disabled={disabled}>
            <Ionicons name="mic-outline" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        <Pressable style={styles.iconBtn} onPress={() => pickImage(true)} disabled={disabled}>
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <VoxaText variant="subtitle" style={styles.modalTitle}>
              Attach
            </VoxaText>
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.menuRow}
                onPress={() => void item.action()}>
                <Ionicons name={item.icon} size={18} color={colors.primarySoft} />
                <VoxaText variant="body">{item.label}</VoxaText>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inputCard: {
    flex: 1,
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
    gap: spacing.xs,
  },
  modalTitle: { marginBottom: spacing.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
});
