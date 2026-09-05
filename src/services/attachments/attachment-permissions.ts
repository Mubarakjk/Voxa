import * as ImagePicker from 'expo-image-picker';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type MediaPermissions = {
  microphone: PermissionState;
  camera: PermissionState;
  mediaLibrary: PermissionState;
};

export async function getMediaPermissions(): Promise<MediaPermissions> {
  const [mic, camera, library] = await Promise.all([
    getRecordingPermissionsAsync(),
    ImagePicker.getCameraPermissionsAsync(),
    ImagePicker.getMediaLibraryPermissionsAsync(),
  ]);

  return {
    microphone: mic.granted ? 'granted' : mic.canAskAgain ? 'undetermined' : 'denied',
    camera: camera.granted ? 'granted' : camera.canAskAgain ? 'undetermined' : 'denied',
    mediaLibrary: library.granted ? 'granted' : library.canAskAgain ? 'undetermined' : 'denied',
  };
}

export async function requestMicrophonePermission(): Promise<boolean> {
  const result = await requestRecordingPermissionsAsync();
  return result.granted;
}

export async function requestCameraPermission(): Promise<boolean> {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return result.granted;
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

export function permissionErrorLabel(kind: keyof MediaPermissions): string {
  switch (kind) {
    case 'microphone':
      return 'Microphone access is required for voice notes. Enable it in Settings.';
    case 'camera':
      return 'Camera access is required to take a photo. Enable it in Settings.';
    case 'mediaLibrary':
      return 'Photo library access is required to pick media. Enable it in Settings.';
  }
}
