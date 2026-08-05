import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { isFeatureVisible } from '../src/config/feature-status';
import { isFreeLaunchMode, isPaywallEnabled } from '../src/config/launch-mode';
import {
  isMicrophoneChatEnabled,
  isRealtimeVoiceEnabled,
  isVoiceNotesEnabled,
} from '../src/config/release-voice';
import {
  buildFaithValuesPromptBlock,
  ISLAM_PROMPT_SAFETY,
  isFaithAnalyticsSafe,
  reflectionPromptsForMode,
} from '../src/services/faith/faith-values-context-service';
import {
  FaithValuesService,
  getFaithValuesService,
  resetFaithValuesServiceForTests,
} from '../src/services/faith/faith-values-service';
import { createDefaultFaithValuesPreferences } from '../src/types/faith-values';
import type { IStorageService } from '../src/services/contracts';

class MemoryStorage implements IStorageService {
  private data = new Map<string, unknown>();
  async getItem<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null;
  }
  async setItem<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((key) => this.data.delete(key));
  }
}

describe('Faith & Values', () => {
  beforeEach(() => {
    resetFaithValuesServiceForTests();
  });

  it('is disabled by default', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    const prefs = await service.getPreferences('user-a');
    assert.equal(prefs.enabled, false);
    assert.equal(prefs.mode, 'off');
    assert.equal(prefs.onboardingCompleted, false);
  });

  it('supports mode selection and disabling', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.setMode('user-a', 'islam');
    let prefs = await service.getPreferences('user-a');
    assert.equal(prefs.mode, 'islam');
    assert.equal(prefs.enabled, true);
    await service.disableCompletely('user-a');
    prefs = await service.getPreferences('user-a');
    assert.equal(prefs.mode, 'off');
    assert.equal(prefs.enabled, false);
  });

  it('defaults reflections to private without memory consent', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.setMode('user-a', 'general');
    const reflection = await service.saveReflection('user-a', {
      prompt: 'Gratitude',
      body: 'Private thought',
      mode: 'general',
    });
    assert.equal(reflection.allowMemory, false);
    assert.equal(reflection.memorySaved, false);
    const approved = await service.listMemoryApprovedReflections('user-a');
    assert.equal(approved.length, 0);
  });

  it('includes only memory-approved reflections in prompt context', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.setMode('user-a', 'islam');
    await service.updatePreferences('user-a', { faithAwareLanguage: true });
    await service.saveReflection('user-a', {
      prompt: 'Private',
      body: 'Should not appear',
      mode: 'islam',
      allowMemory: false,
    });
    await service.saveReflection('user-a', {
      prompt: 'Approved',
      body: 'May appear briefly',
      mode: 'islam',
      allowMemory: true,
    });
    const block = buildFaithValuesPromptBlock(await service.getPreferences('user-a'), {
      todayIntention: 'Stay patient',
      approvedReflectionSnippet: 'May appear briefly',
      prayerDay: { date: '2026-08-04', completed: { fajr: true }, updatedAt: '' },
    });
    assert.match(block, /Islam/);
    assert.match(block, /May appear briefly/);
    assert.match(block, /qualified scholar/);
    assert.doesNotMatch(block, /Should not appear/);
  });

  it('tracks prayer manually with undo', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    const first = await service.togglePrayer('user-a', 'fajr');
    assert.equal(first.completed.fajr, true);
    const second = await service.togglePrayer('user-a', 'fajr');
    assert.equal(second.completed.fajr, false);
  });

  it('supports saved dua CRUD', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    const created = await service.createDua('user-a', {
      title: 'Morning',
      text: 'My personal dua',
      category: 'gratitude',
    });
    const list = await service.listDuas('user-a');
    assert.equal(list.length, 1);
    await service.updateDua('user-a', created.id, { favourite: true });
    const updated = await service.getDua('user-a', created.id);
    assert.equal(updated?.favourite, true);
    await service.deleteDua('user-a', created.id);
    assert.equal((await service.listDuas('user-a')).length, 0);
  });

  it('isolates data per user', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.createDua('user-a', { title: 'A', text: 'alpha', category: 'custom' });
    await service.createDua('user-b', { title: 'B', text: 'beta', category: 'custom' });
    assert.equal((await service.listDuas('user-a')).length, 1);
    assert.equal((await service.listDuas('user-b')).length, 1);
    assert.notEqual((await service.listDuas('user-a'))[0]?.text, 'beta');
  });

  it('deletes all faith data for a user', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.setMode('user-a', 'personal');
    await service.createDua('user-a', { title: 'X', text: 'y', category: 'custom' });
    await service.saveReflection('user-a', { prompt: 'p', body: 'b', mode: 'personal' });
    await service.deleteAllData('user-a');
    const prefs = await service.getPreferences('user-a');
    assert.equal(prefs.mode, 'off');
    assert.equal((await service.listDuas('user-a')).length, 0);
    assert.equal((await service.listReflections('user-a')).length, 0);
  });

  it('export includes labelled faith section', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    await service.setMode('user-a', 'general');
    const payload = await service.buildExport('user-a');
    assert.ok(payload.preferences);
    assert.ok(payload.exportedAt);
    assert.ok(Array.isArray(payload.duas));
  });

  it('does not inject prompt when disabled or faith-aware off', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    const offBlock = buildFaithValuesPromptBlock(createDefaultFaithValuesPreferences(), {});
    assert.equal(offBlock, '');
    await service.setMode('user-a', 'islam');
    const prefs = await service.getPreferences('user-a');
    prefs.faithAwareLanguage = false;
    assert.equal(buildFaithValuesPromptBlock(prefs, {}), '');
  });

  it('blocks faith text keys in analytics props', () => {
    assert.equal(isFaithAnalyticsSafe({ mode: 'islam', enabled: true }), true);
    assert.equal(isFaithAnalyticsSafe({ reflection_body: 'secret' }), false);
    assert.equal(isFaithAnalyticsSafe({ dua_text: 'secret' }), false);
  });

  it('includes Islamic safety boundaries in Islam mode prompt', () => {
    assert.match(ISLAM_PROMPT_SAFETY, /NEVER invent Quran verses/);
    assert.match(ISLAM_PROMPT_SAFETY, /qualified scholar/);
  });

  it('uses neutral prompts for general mode', () => {
    const prompts = reflectionPromptsForMode('general');
    assert.ok(prompts[0]?.includes('grateful'));
    assert.ok(!prompts[0]?.includes('Allah'));
  });

  it('does not invent prayer times in service', async () => {
    const storage = new MemoryStorage();
    const service = new FaithValuesService(storage);
    const day = await service.getPrayerDay('user-a');
    assert.equal(Object.keys(day.completed).length, 0);
    const block = buildFaithValuesPromptBlock(
      { ...createDefaultFaithValuesPreferences(), enabled: true, mode: 'islam', faithAwareLanguage: true },
      { prayerDay: day },
    );
    assert.doesNotMatch(block, /\b\d{1,2}:\d{2}\b/);
    assert.doesNotMatch(block, /adhan|athan/i);
  });

  it('home summary returns null when disabled or hidden', async () => {
    const storage = new MemoryStorage();
    const service = getFaithValuesService(storage);
    assert.equal(await service.getHomeSummary('user-a'), null);
    await service.setMode('user-a', 'general');
    await service.updatePreferences('user-a', { hideFromHome: true });
    assert.equal(await service.getHomeSummary('user-a'), null);
  });

  it('feature flag faithValues is visible in production config', () => {
    assert.equal(isFeatureVisible('faithValues'), true);
  });

  it('free launch keeps paywall and voice gates off', () => {
    assert.equal(isFreeLaunchMode(), true);
    assert.equal(isPaywallEnabled(), false);
    assert.equal(isRealtimeVoiceEnabled(), false);
    assert.equal(isVoiceNotesEnabled(), false);
    assert.equal(isMicrophoneChatEnabled(), false);
  });
});
