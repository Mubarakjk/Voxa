import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { getCompanionMode } from '../src/constants/companion-modes';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { REMINDER_KIND_OPTIONS } from '../src/constants/reminder-options';
import { parseChatMarkdownBlocks, splitBoldSegments, visibleMarkdownText } from '../src/components/phase11/chat-markdown';
import { buildVoxaSystemPrompt } from '../src/services/ai/voxa-system-prompt';
import { buildUserTurnContent } from '../src/services/ai/gateway-context-budget';
import { ActionIntentParser } from '../src/services/actions/action-intent-parser';
import {
  CHAT_IMAGE_TARGET_MAX_BYTES,
  CHAT_IMAGE_VISION_CAP_BYTES,
  ChatImageSaver,
  ChatImageTooLargeError,
  RemoteChatImageError,
  prepareChatImageWithSaver,
} from '../src/services/attachments/prepare-chat-image-plan';
import { createDefaultSubscription } from '../src/types/subscription';
import { UserProfile } from '../src/types';
import {
  ABUSE_LIMITS,
  validateVisionImageDataUrl,
} from '../supabase/functions/_shared/usage-guard.ts';

const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

function makeProfile(mode: 'friend' | 'coach'): UserProfile {
  return {
    id: 'user-1',
    displayName: 'Alex',
    email: 'alex@example.com',
    timezone: 'UTC',
    onboardingComplete: true,
    preferences: {
      voicePersonality: 'warm_calm',
      memoryEnabled: true,
      checkInStyle: 'gentle',
      proactiveVoiceCalls: false,
      hapticsEnabled: true,
      ambientGlowEnabled: true,
      selectedVoiceOptionId: 'aurora',
    },
    companion: { defaultMode: mode, lastUsedMode: mode },
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function saverFor(
  inspected: { width: number; height: number },
  sizes: Array<number | undefined>,
): { saver: ChatImageSaver; calls: Array<{ width: number; height: number; compress: number }> } {
  const calls: Array<{ width: number; height: number; compress: number }> = [];
  let index = 0;
  return {
    calls,
    saver: {
      async inspect() {
        return inspected;
      },
      async saveJpeg(input) {
        calls.push({ width: input.width, height: input.height, compress: input.compress });
        const sizeBytes = sizes[Math.min(index, sizes.length - 1)];
        index += 1;
        return {
          uri: 'file:///cache/prepared.jpg',
          width: input.width,
          height: input.height,
          sizeBytes,
        };
      },
    },
  };
}

describe('v1 image preparation', () => {
  it('turns a large photo into a JPEG with the longest edge constrained', async () => {
    const { saver, calls } = saverFor({ width: 4032, height: 3024 }, [900_000]);
    const prepared = await prepareChatImageWithSaver(
      { localUri: 'file:///var/mobile/IMG_0001.JPG', mimeType: 'image/jpeg', fileName: 'IMG_0001.JPG' },
      saver,
    );
    assert.equal(prepared.mimeType, 'image/jpeg');
    assert.equal(prepared.fileName, 'IMG_0001.jpg');
    assert.equal(calls[0]?.width, 1280);
    assert.equal(calls[0]?.height, 960);
    assert.ok(Math.max(prepared.width, prepared.height) <= 1280);
    assert.equal(calls[0]?.compress, 0.7);
    assert.ok((prepared.sizeBytes ?? 0) <= CHAT_IMAGE_TARGET_MAX_BYTES);
    assert.ok((prepared.sizeBytes ?? 0) < CHAT_IMAGE_VISION_CAP_BYTES);
  });

  it('preserves portrait aspect ratio', async () => {
    const { saver, calls } = saverFor({ width: 3000, height: 4000 }, [800_000]);
    const prepared = await prepareChatImageWithSaver(
      { localUri: 'file:///photo.png', fileName: 'photo.png' },
      saver,
    );
    assert.equal(calls[0]?.width, 960);
    assert.equal(calls[0]?.height, 1280);
    assert.equal(prepared.mimeType, 'image/jpeg');
  });

  it('transcodes HEIC and HEIF sources to JPEG', async () => {
    const heic = saverFor({ width: 4032, height: 3024 }, [700_000]);
    const preparedHeic = await prepareChatImageWithSaver(
      {
        localUri: 'file:///var/mobile/IMG_0001.HEIC',
        mimeType: 'image/heic',
        fileName: 'IMG_0001.HEIC',
      },
      heic.saver,
    );
    assert.equal(preparedHeic.mimeType, 'image/jpeg');
    assert.equal(preparedHeic.fileName, 'IMG_0001.jpg');
    assert.equal(heic.calls[0]?.width, 1280);

    const heif = saverFor({ width: 2000, height: 1000 }, [500_000]);
    const preparedHeif = await prepareChatImageWithSaver(
      { localUri: 'file:///photo.heif', mimeType: 'image/heif', fileName: 'photo.heif' },
      heif.saver,
    );
    assert.equal(preparedHeif.mimeType, 'image/jpeg');
    assert.equal(preparedHeif.fileName, 'photo.jpg');
  });

  it('steps quality down until the file is under the target, and rejects files over the vision cap', async () => {
    const stepped = saverFor({ width: 4000, height: 3000 }, [2_000_000, 1_200_000]);
    const prepared = await prepareChatImageWithSaver(
      { localUri: 'file:///big.jpg', fileName: 'big.jpg' },
      stepped.saver,
    );
    assert.deepEqual(
      stepped.calls.map((call) => call.compress),
      [0.7, 0.55],
    );
    assert.ok((prepared.sizeBytes ?? 0) <= CHAT_IMAGE_TARGET_MAX_BYTES);

    const tooBig = saverFor({ width: 4000, height: 3000 }, [5 * 1024 * 1024]);
    await assert.rejects(
      () => prepareChatImageWithSaver({ localUri: 'file:///huge.jpg' }, tooBig.saver),
      ChatImageTooLargeError,
    );
    assert.equal(CHAT_IMAGE_VISION_CAP_BYTES, 4 * 1024 * 1024);
    assert.equal(CHAT_IMAGE_VISION_CAP_BYTES, ABUSE_LIMITS.maxVisionImageBytes);
  });

  it('sends one vision image_url and still rejects remote URLs', async () => {
    const content = buildUserTurnContent({
      userProfile: makeProfile('friend'),
      mode: 'friend',
      userMessage: 'What do you see?',
      conversationHistory: [],
      memories: [],
      imageUrlForVision: TINY_JPEG,
    });
    assert.ok(Array.isArray(content));
    const images = content.filter((part) => part.type === 'image_url');
    assert.equal(images.length, 1);

    const remote = validateVisionImageDataUrl('https://example.com/photo.jpg');
    assert.equal(remote.allowed, false);
    assert.equal(remote.code, 'invalid_image');

    let inspected = false;
    await assert.rejects(
      () =>
        prepareChatImageWithSaver(
          { localUri: 'https://example.com/photo.jpg' },
          {
            async inspect() {
              inspected = true;
              return { width: 10, height: 10 };
            },
            async saveJpeg() {
              throw new Error('should not save');
            },
          },
        ),
      RemoteChatImageError,
    );
    assert.equal(inspected, false);
  });
});

describe('v1 friend and coach mode', () => {
  it('persists coach and friend on defaultMode and lastUsedMode', () => {
    const relationship = readFileSync('src/screens/relationship-profile-screen.tsx', 'utf8');
    assert.match(relationship, /defaultMode: mode/);
    assert.match(relationship, /lastUsedMode: mode/);
    assert.match(relationship, /refreshProfile\(\)/);
    assert.match(relationship, /companionModeForRelationshipFraming/);

    const coach = { companion: { defaultMode: 'friend' as const, lastUsedMode: 'friend' as const } };
    const coachFields = { defaultMode: 'coach' as const, lastUsedMode: 'coach' as const };
    const updatedCoach = { ...coach, companion: { ...coach.companion, ...coachFields } };
    assert.equal(updatedCoach.companion.defaultMode, 'coach');
    assert.equal(updatedCoach.companion.lastUsedMode, 'coach');
    assert.equal(getCompanionMode(updatedCoach.companion.lastUsedMode).shortLabel, 'Coach');

    const friendFields = { defaultMode: 'friend' as const, lastUsedMode: 'friend' as const };
    const updatedFriend = { companion: { defaultMode: 'coach' as const, lastUsedMode: 'coach' as const, ...friendFields } };
    assert.equal(updatedFriend.companion.defaultMode, 'friend');
    assert.equal(updatedFriend.companion.lastUsedMode, 'friend');
    assert.equal(getCompanionMode(updatedFriend.companion.lastUsedMode).shortLabel, 'Friend');
  });

  it('puts the selected mode in the Talk header and system prompt without a restart', () => {
    const chat = readFileSync('src/screens/chat-screen.tsx', 'utf8');
    assert.match(chat, /getCompanionMode\(activeMode\)\.shortLabel/);
    assert.doesNotMatch(chat, /adaptiveDisplay/);
    assert.match(chat, /profile\?\.companion\.lastUsedMode \?\? profile\?\.companion\.defaultMode/);
    assert.match(chat, /setActiveMode\(mode\)/);
    assert.match(chat, /mode: activeMode/);

    const coachPrompt = buildVoxaSystemPrompt({
      userProfile: makeProfile('coach'),
      mode: 'coach',
      memories: [],
      turnIntelligenceBlock: 'Selected mode: coach — honour this.',
    });
    assert.match(coachPrompt, /Mode: Coach Mode/);
    assert.match(coachPrompt, /Selected mode: coach — honour this\./);

    const friendPrompt = buildVoxaSystemPrompt({
      userProfile: makeProfile('friend'),
      mode: 'friend',
      memories: [],
      turnIntelligenceBlock: 'Selected mode: friend — honour this.',
    });
    assert.match(friendPrompt, /Mode: Friend Mode/);
    assert.match(friendPrompt, /Selected mode: friend — honour this\./);
  });
});

describe('v1 markdown bold', () => {
  it('renders **Title** as bold text without literal asterisks', () => {
    const segments = splitBoldSegments('**Title**');
    assert.deepEqual(segments, [{ text: 'Title', bold: true }]);
    assert.equal(visibleMarkdownText('**Title**'), 'Title');
    assert.equal(visibleMarkdownText('**Title**').includes('**'), false);

    const renderer = readFileSync('src/components/phase11/chat-markdown-text.tsx', 'utf8');
    assert.match(renderer, /splitBoldSegments/);
    assert.match(renderer, /fontWeight: '700'/);
  });

  it('leaves lists, numbered lists, and code fences unchanged', () => {
    const bullets = parseChatMarkdownBlocks('- one\n- two');
    assert.equal(bullets[0]?.type, 'bullets');
    if (bullets[0]?.type === 'bullets') assert.deepEqual(bullets[0].items, ['one', 'two']);

    const numbered = parseChatMarkdownBlocks('1. first\n2. second');
    assert.equal(numbered[0]?.type, 'numbered');
    if (numbered[0]?.type === 'numbered') {
      assert.deepEqual(numbered[0].items, ['1. first', '2. second']);
    }

    const code = parseChatMarkdownBlocks('```\n**Title**\n```');
    assert.equal(code[0]?.type, 'code');
    if (code[0]?.type === 'code') assert.match(code[0].text, /\*\*Title\*\*/);
  });
});

describe('v1 reminders without a real alarm', () => {
  it('still creates reminders and natural-language reminders, with no alarm API', () => {
    const parser = new ActionIntentParser();
    const reminder = parser.parse('remind me to drink water at 5pm');
    assert.equal(reminder?.action, 'set_reminder');
    assert.equal(parser.parse('set an alarm for 7am'), null);

    const screen = readFileSync('src/screens/create-reminder-screen.tsx', 'utf8');
    assert.match(screen, /createScheduledReminder/);
    assert.match(screen, /requestedKind === 'alarm' \? 'reminder'/);
    assert.equal(
      REMINDER_KIND_OPTIONS.some((option) => option.label === 'Alarm'),
      false,
    );

    const executor = readFileSync('src/services/actions/chat-action-executor.ts', 'utf8');
    assert.match(executor, /kind: 'reminder'/);
    assert.doesNotMatch(executor, /kind: 'alarm'/);

    const notifications = readFileSync('src/services/notifications/notification-service.ts', 'utf8');
    assert.match(notifications, /scheduleReminderFromEntity/);
    assert.doesNotMatch(notifications, /scheduleAlarm/);

    const modes = readFileSync('src/constants/companion-modes.ts', 'utf8');
    assert.doesNotMatch(modes, /Reminders & alarms/);
  });
});

describe('v1 tab bar', () => {
  it('keeps five routes and drops the raised centre offset', () => {
    const bar = readFileSync('src/navigation/premium-tab-bar.tsx', 'utf8');
    for (const route of ['Home', 'Talk', 'Voxa', 'Journey', 'You']) {
      assert.match(bar, new RegExp(`${route}:`));
    }
    assert.doesNotMatch(bar, /marginTop:\s*-10/);
    assert.doesNotMatch(bar, /width:\s*52/);
    assert.doesNotMatch(bar, /center:\s*true/);
  });
});

describe('v1 image pipeline wiring', () => {
  it('prepares images before pending attachments and uploads storage in the background', () => {
    const input = readFileSync('src/components/chat/chat-input-bar.tsx', 'utf8');
    const prepareAt = input.indexOf('prepareChatImage');
    const attachAt = input.indexOf('addAttachment({');
    assert.ok(prepareAt > 0);
    assert.ok(attachAt > prepareAt);

    const companion = readFileSync('src/services/voxa-companion-service.ts', 'utf8');
    const uploadAt = companion.indexOf('processor.uploadAll');
    const replyAt = companion.indexOf('this.ai.generateReply');
    assert.ok(uploadAt > 0);
    assert.ok(replyAt > uploadAt);
    assert.match(companion, /void persistUserRemote/);
    assert.doesNotMatch(companion, /await persistUserRemote/);
  });
});
