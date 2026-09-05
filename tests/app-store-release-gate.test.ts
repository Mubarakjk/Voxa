import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { isPaywallEnabled } from '../src/config/launch-mode';
import { isExperimentalFeaturesEnabled, isFeatureVisible, getRoadmapFeatures } from '../src/config/feature-status';
import { getReleaseVoiceGateSnapshot } from '../src/config/release-voice';

const appJson = JSON.parse(readFileSync(join(process.cwd(), 'app.json'), 'utf8')) as {
  expo: {
    version: string;
    ios: {
      bundleIdentifier: string;
      infoPlist: Record<string, unknown>;
      privacyManifests?: {
        NSPrivacyTracking?: boolean;
        NSPrivacyAccessedAPITypes?: Array<{
          NSPrivacyAccessedAPIType: string;
          NSPrivacyAccessedAPITypeReasons: string[];
        }>;
      };
    };
    plugins: unknown[];
  };
};

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  expo?: { autolinking?: { exclude?: string[] } };
};

function pluginName(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
  return '';
}

function pluginProps(name: string): Record<string, unknown> | undefined {
  const match = appJson.expo.plugins.find((entry) => pluginName(entry) === name);
  if (Array.isArray(match) && match[1] && typeof match[1] === 'object') {
    return match[1] as Record<string, unknown>;
  }
  return undefined;
}

describe('V1 App Store release gate', () => {
  it('keeps production identity and free-launch feature gates', () => {
    assert.equal(appJson.expo.version, '1.0.0');
    assert.equal(appJson.expo.ios.bundleIdentifier, 'app.voxa.companion');
    assert.equal(isPaywallEnabled(), false);
    assert.equal(isExperimentalFeaturesEnabled(), false);
    const voice = getReleaseVoiceGateSnapshot();
    assert.equal(voice.realtimeVoice, false);
    assert.equal(voice.scheduledCalls, false);
    assert.equal(voice.voiceNotes, false);
    assert.equal(voice.microphoneChat, false);
    assert.equal(isFeatureVisible('voiceCall'), false);
    assert.equal(isFeatureVisible('musicRecognition'), false);
    assert.equal(isFeatureVisible('voiceNote'), false);
  });

  it('does not declare microphone usage for disabled V1 recording features', () => {
    assert.equal('NSMicrophoneUsageDescription' in appJson.expo.ios.infoPlist, false);
    assert.equal(pluginProps('expo-image-picker')?.microphonePermission, false);
    assert.equal(pluginProps('expo-audio')?.microphonePermission, false);
    assert.ok(!appJson.expo.plugins.some((entry) => pluginName(entry) === 'expo-av'));
    assert.ok(!appJson.expo.plugins.some((entry) => pluginName(entry) === '@config-plugins/react-native-webrtc'));
    assert.ok(packageJson.expo?.autolinking?.exclude?.includes('react-native-webrtc'));
    assert.ok(!('expo-av' in (packageJson.dependencies ?? {})));
  });

  it('keeps camera, photos, and location purpose strings for working V1 features', () => {
    const plist = appJson.expo.ios.infoPlist;
    assert.match(String(plist.NSCameraUsageDescription), /photo/i);
    assert.doesNotMatch(String(plist.NSCameraUsageDescription), /video/i);
    assert.match(String(plist.NSPhotoLibraryUsageDescription), /photo/i);
    assert.match(String(plist.NSLocationWhenInUseUsageDescription), /weather/i);
    assert.equal(plist.ITSAppUsesNonExemptEncryption, false);
    assert.deepEqual(plist.UIBackgroundModes, ['audio']);
  });

  it('copies required-reason API codes from installed dependency privacy manifests', () => {
    const manifests = appJson.expo.ios.privacyManifests;
    assert.equal(manifests?.NSPrivacyTracking, false);
    const types = manifests?.NSPrivacyAccessedAPITypes ?? [];
    const byCategory = Object.fromEntries(types.map((item) => [item.NSPrivacyAccessedAPIType, item.NSPrivacyAccessedAPITypeReasons]));
    assert.deepEqual(byCategory.NSPrivacyAccessedAPICategoryUserDefaults, ['CA92.1']);
    assert.ok(byCategory.NSPrivacyAccessedAPICategoryFileTimestamp.includes('C617.1'));
    assert.ok(byCategory.NSPrivacyAccessedAPICategoryFileTimestamp.includes('0A2A.1'));
    assert.ok(byCategory.NSPrivacyAccessedAPICategoryFileTimestamp.includes('3B52.1'));
    assert.ok(byCategory.NSPrivacyAccessedAPICategoryDiskSpace.includes('E174.1'));
    assert.ok(byCategory.NSPrivacyAccessedAPICategoryDiskSpace.includes('85F4.1'));
  });

  it('does not advertise disabled V1 voice/music features as coming soon', () => {
    const keys = getRoadmapFeatures().map((item) => item.key);
    assert.ok(!keys.includes('voiceCall'));
    assert.ok(!keys.includes('musicRecognition'));
    assert.ok(!keys.includes('galleryPicker'));
    assert.ok(keys.includes('documents'));
  });
});
