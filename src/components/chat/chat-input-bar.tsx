import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFeatureVisible } from '../../config/feature-status';
import { isMicrophoneChatEnabled, isVoiceNotesEnabled } from '../../config/release-voice';
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
  const insets = useSafeAreaInsets();
  const { profile, services } = useVoxa();
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachmentInput[]>([]);
  const [recordingMode, setRecordingMode] = useState(false);
  const [voiceNoteBusy, setVoiceNoteBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const showCamera = isFeatureVisible('cameraPhoto');
  const showVoiceNote = isVoiceNotesEnabled() && isMicrophoneChatEnabled() && isFeatureVisible('voiceNote');
  const showGallery = isFeatureVisible('galleryPicker');

  useEffect(() => {
    if (showVoiceNote) {
      voiceNoteLog('BUTTON_RENDERED');
    }
  }, [showVoiceNote]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  // When the keyboard is open it covers the home indicator — don't keep that inset
  // under the composer (it created a large dead zone above the keyboard).
  const bottomPad = keyboardVisible ? spacing.xs : Math.max(insets.bottom, spacing.sm);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <AttachmentPreviewTray
        attachments={pendingAttachments}
        onRemove={(index) =>
          setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
        }
      />

      <View style={styles.inputBar}>
        {recordingMode ? (
          <View style={styles.composerShell}>
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
          </View>
        ) : (
          <View style={[styles.composerShell, focused && styles.composerFocused]}>
            {onOpenTools ? (
              <Pressable
                style={({ pressed }) => [styles.inlineIcon, pressed && styles.iconPressed]}
                onPress={onOpenTools}
                disabled={disabled}
                hitSlop={6}
                accessibilityLabel="Open chat tools">
                <Ionicons name="add" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}

            {showCamera ? (
              <Pressable
                style={({ pressed }) => [styles.inlineIcon, pressed && styles.iconPressed]}
                onPress={() => void takePhoto()}
                disabled={disabled}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Take a photo">
                <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            ) : null}

            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={`Message ${voxaName}…`}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!disabled}
              multiline
              maxFontSizeMultiplier={1.35}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />

            {showVoiceNote ? (
              <Pressable
                style={({ pressed }) => [styles.inlineIcon, pressed && styles.iconPressed]}
                onPress={() => void startVoiceMode()}
                disabled={disabled || voiceNoteBusy}
                hitSlop={6}
                accessibilityLabel="Record voice note">
                <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendBtn,
                canSend ? styles.sendReady : styles.sendDisabled,
                pressed && canSend && styles.sendPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !canSend }}>
              <Ionicons
                name="arrow-up"
                size={18}
                color={canSend ? colors.background : colors.textMuted}
              />
            </Pressable>
          </View>
        )}
      </View>

      {showGallery && !recordingMode && !keyboardVisible ? (
        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.iconPressed]}
            onPress={() => void pickFromGallery()}
            disabled={disabled}
            accessibilityLabel="Choose from gallery">
            <Ionicons name="images-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
  },
  composerShell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: layout.composerMinHeight,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceQuiet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  composerFocused: {
    borderColor: `${colors.primarySoft}55`,
    backgroundColor: colors.surfaceStrong,
  },
  inlineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconPressed: { opacity: 0.65 },
  secondaryRow: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
  },
  secondaryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    marginLeft: 2,
  },
  sendReady: {
    backgroundColor: colors.primary,
  },
  sendDisabled: {
    backgroundColor: 'transparent',
  },
  sendPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
