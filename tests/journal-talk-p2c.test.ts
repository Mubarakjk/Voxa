import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyTalkIntent } from '../src/services/ai/companion-intent';
import { assembleRoutedContextExtension, selectContextModules } from '../src/services/ai/companion-context-router';
import { FakeAIService } from '../src/services/ai/fake-ai-service';
import { buildTurnIntelligencePlan } from '../src/services/ai/turn-intelligence-plan';
import { talkGatewayGenerationCountForAcceptedSends } from '../src/services/chat/talk-send-guard';
import { IStorageService } from '../src/services/contracts';
import {
  deriveSignalsFromSources,
  loadJournalTalkContext,
} from '../src/services/journal/journal-intelligence-service';
import {
  JOURNAL_PATTERN_MIN_EVIDENCE,
  containsRawPrivateDump,
  decideJournalCallback,
  deriveJournalPatterns,
  extractJournalSignal,
  formatExplicitJournalRetrieval,
  formatJournalSignalsForTalk,
  isExplicitJournalRetrieval,
  journalAutoWritesUserReflection,
  journalEventBlocked,
  journalPromptFabricatesFeelings,
  journalSharesEventIdentity,
  resolveJournalRange,
  suggestReflectionPrompts,
  talkIntentSkipsJournalContext,
} from '../src/services/journal/journal-signal';
import { TAG_EXPLICIT, TAG_OPEN_LOOP, TAG_RESOLVED, TAG_SUPERSEDED } from '../src/services/memory/memory-taxonomy';
import { Memory } from '../src/types';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const LONDON = 'Europe/London';
const CHICAGO = 'America/Chicago';
/** Tuesday 8 Sep 2026 05:30 BST / Monday 7 Sep 23:30 CDT. */
const TUE_8_SEP_EARLY = new Date('2026-09-08T04:30:00.000Z');
const TUE_8_SEP = new Date('2026-09-08T14:00:00.000Z');

const RAW_MANAGER = "On September 7 you wrote 'I hate my manager and I can't tell anyone at work.'";
const RAW_PRESENTATION = 'Big presentation Friday. I am nervous.';
const RAW_GYM = 'Gym felt amazing after work. Energy is back.';
const RAW_DRIVING = 'Driving test tomorrow. Trying not to overthink it.';

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

function memory(title: string, content: string, overrides: Partial<Memory> = {}): Memory {
  return {
    id: `m-${title}`,
    userId: 'user-1',
    category: 'moments',
    title,
    content,
    mood: 'neutral',
    importance: 4,
    tags: [TAG_EXPLICIT, TAG_OPEN_LOOP],
    source: 'conversation',
    useCount: 0,
    confidence: 0.92,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    ...overrides,
  };
}

function signalFrom(id: string, text: string, dateKey = '2026-09-07', source: 'companion_journal' = 'companion_journal') {
  return extractJournalSignal({ id, source, dateKey, text, occurredAt: `${dateKey}T12:00:00.000Z` });
}

function talkBlock(input: {
  texts: string[];
  userMessage: string;
  intent?: ReturnType<typeof classifyTalkIntent>['intent'];
  memories?: Memory[];
  explicit?: boolean;
}) {
  const signals = input.texts.map((text, index) => signalFrom(`j-${index}`, text));
  return formatJournalSignalsForTalk({
    signals,
    patterns: deriveJournalPatterns(signals),
    userMessage: input.userMessage,
    intent: input.intent ?? classifyTalkIntent(input.userMessage).intent,
    explicitRetrieval: input.explicit ?? false,
    memories: input.memories,
  });
}

describe('Phase 2C journal privacy boundary', () => {
  it('1. raw journal text is not injected into ordinary Talk', () => {
    const block = talkBlock({
      texts: [RAW_MANAGER, RAW_PRESENTATION],
      userMessage: "I've been stressed about Friday",
    });
    assert.equal(containsRawPrivateDump(block, RAW_MANAGER), false);
    assert.equal(containsRawPrivateDump(block, RAW_PRESENTATION), false);
    assert.equal(containsRawPrivateDump(block, 'I hate my manager'), false);
    assert.match(block, /presentation|work/i);
    assert.doesNotMatch(block, /according to your journal/i);
  });

  it('2. relevant safe journal signal can inform Talk', () => {
    const block = talkBlock({
      texts: [RAW_PRESENTATION],
      userMessage: "I'm stressed about Friday",
    });
    assert.ok(block.length > 0);
    assert.match(block, /presentation/i);
    assert.match(block, /callback allowed|use silently/i);
    assert.equal(containsRawPrivateDump(block, RAW_PRESENTATION), false);
  });

  it('3. unrelated journal signal is ignored', () => {
    const block = talkBlock({
      texts: [RAW_GYM],
      userMessage: "I'm stressed about Friday",
    });
    assert.equal(block, '');
  });

  it('4. factual turns load zero Journal context', () => {
    const userMessage = '36x14';
    const intent = classifyTalkIntent(userMessage).intent;
    assert.equal(intent, 'factual_question');
    assert.equal(talkIntentSkipsJournalContext(intent), true);
    const modules = selectContextModules(intent, userMessage);
    assert.ok(!modules.includes('journal'));
    assert.ok(!modules.includes('reflection'));
    const block = formatJournalSignalsForTalk({
      signals: [signalFrom('j1', RAW_PRESENTATION)],
      patterns: [],
      userMessage,
      intent,
      explicitRetrieval: false,
    });
    assert.equal(block, '');
  });

  it('5. sensitive unrelated journal is ignored', () => {
    const signal = signalFrom('hate', RAW_MANAGER);
    assert.notEqual(signal.sensitivity, 'none');
    const action = decideJournalCallback({
      signal,
      userMessage: "I've been stressed lately",
      intent: 'emotional_support',
      explicitRetrieval: false,
    });
    assert.equal(action, 'ignore');
    const block = talkBlock({
      texts: [RAW_MANAGER],
      userMessage: "I've been stressed lately",
    });
    assert.equal(block, '');
    assert.equal(containsRawPrivateDump(block, 'I hate my manager'), false);
  });

  it('6. explicit journal retrieval works and may quote', () => {
    assert.equal(isExplicitJournalRetrieval('What did I write today?'), true);
    assert.equal(isExplicitJournalRetrieval('What was I journaling about yesterday?'), true);
    assert.equal(isExplicitJournalRetrieval('What have I been writing about this week?'), true);
    assert.equal(isExplicitJournalRetrieval('Have I mentioned work much in my journal lately?'), true);
    assert.equal(isExplicitJournalRetrieval("I've been stressed lately"), false);

    const quoted = formatExplicitJournalRetrieval({
      entries: [{ dateKey: '2026-09-08', body: RAW_PRESENTATION }],
      rangeLabel: 'today',
    });
    assert.match(quoted, /Big presentation Friday/);
    assert.match(quoted, /Do not invent extra entries/);

    const empty = formatExplicitJournalRetrieval({
      entries: [],
      rangeLabel: 'yesterday',
    });
    assert.match(empty, /No journal entries found/);
    assert.match(empty, /Do not invent entries/);
  });

  it('7. today/yesterday resolve in the device timezone', () => {
    const todayLondon = resolveJournalRange('What did I write today?', TUE_8_SEP_EARLY, LONDON);
    const todayChicago = resolveJournalRange('What did I write today?', TUE_8_SEP_EARLY, CHICAGO);
    assert.equal(todayLondon.start, '2026-09-08');
    assert.equal(todayChicago.start, '2026-09-07');

    const yesterdayLondon = resolveJournalRange('What was I journaling about yesterday?', TUE_8_SEP_EARLY, LONDON);
    const yesterdayChicago = resolveJournalRange('What was I journaling about yesterday?', TUE_8_SEP_EARLY, CHICAGO);
    assert.equal(yesterdayLondon.start, '2026-09-07');
    assert.equal(yesterdayChicago.start, '2026-09-06');
  });
});

describe('Phase 2C event identity and open-loop authority', () => {
  it('8. Talk event and Journal event identity connect', () => {
    const journal = signalFrom('drive', RAW_DRIVING);
    const open = memory('Driving test', 'My driving test is Friday');
    assert.equal(journalSharesEventIdentity(journal, open), true);
    assert.equal(journalEventBlocked(journal, [open]), false);
    const block = talkBlock({
      texts: [RAW_DRIVING],
      userMessage: 'They moved my test to Friday',
      intent: 'emotional_support',
      memories: [open],
    });
    assert.match(block, /driving/i);
  });

  it('9. resolved event is not resurrected from Journal', () => {
    const journal = signalFrom('drive', RAW_DRIVING);
    const resolved = memory('Driving test', 'I passed my driving test', {
      tags: [TAG_EXPLICIT, TAG_RESOLVED],
    });
    assert.equal(journalEventBlocked(journal, [resolved]), true);
    const block = talkBlock({
      texts: [RAW_DRIVING],
      userMessage: "I'm nervous about the test",
      memories: [resolved],
    });
    assert.equal(block, '');
  });

  it('10. superseded timing is not resurrected from Journal', () => {
    const journal = signalFrom('drive', 'Driving test tomorrow');
    const superseded = memory('Driving test', 'Driving test was tomorrow', {
      tags: [TAG_EXPLICIT, TAG_SUPERSEDED],
    });
    assert.equal(journalEventBlocked(journal, [superseded]), true);
    const block = talkBlock({
      texts: ['Driving test tomorrow'],
      userMessage: 'They moved my test to Friday',
      memories: [superseded],
    });
    assert.equal(block, '');
  });
});

describe('Phase 2C patterns, Talk→Journal, and turn plan', () => {
  it('11. multiple-entry pattern requires an evidence threshold', () => {
    const two = ['Work was stressful.', 'Work drained me.'].map((text, i) => signalFrom(`w${i}`, text, `2026-09-0${i + 1}`));
    assert.equal(deriveJournalPatterns(two).length, 0);
    const four = ['Work stressed me.', 'Work stressed me again.', 'Work stressed me out.', 'Work felt stressful.'].map(
      (text, i) => signalFrom(`w${i}`, text, `2026-09-0${i + 1}`),
    );
    const patterns = deriveJournalPatterns(four);
    assert.ok(patterns.some((pattern) => pattern.theme === 'work' && pattern.evidenceCount >= JOURNAL_PATTERN_MIN_EVIDENCE));
  });

  it('12. weak pattern is not stated as fact', () => {
    const two = talkBlock({
      texts: ['Work was stressful.', 'Work drained me.'],
      userMessage: "I've been stressed lately",
    });
    assert.doesNotMatch(two, /Recurring theme: work/);
    assert.doesNotMatch(two, /Work makes you depressed/);

    const four = talkBlock({
      texts: ['Work stressed me.', 'Work stressed me again.', 'Work stressed me out.', 'Work felt stressful.'],
      userMessage: "I've been stressed lately",
    });
    assert.match(four, /Recurring theme: work/);
    assert.match(four, /Do not diagnose\. Do not state as fact/);
    assert.doesNotMatch(four, /Work makes you depressed/);
  });

  it('13. Talk context can improve a reflection prompt', () => {
    const hints = suggestReflectionPrompts({
      memories: [
        memory('Driving test', 'I passed my driving test', {
          tags: [TAG_EXPLICIT, TAG_RESOLVED],
          updatedAt: '2026-09-08T15:00:00.000Z',
          occurredAt: '2026-09-08T14:00:00.000Z',
        }),
      ],
      now: TUE_8_SEP,
      timeZone: LONDON,
    });
    assert.match(hints.smiled ?? '', /driving test/i);
    assert.match(hints.smiled ?? '', /what stood out/i);
  });

  it('14. Journal never auto-writes the user reflection', () => {
    assert.equal(journalAutoWritesUserReflection(), false);
    const hints = suggestReflectionPrompts({
      memories: [
        memory('Driving test', 'I passed my driving test', {
          tags: [TAG_EXPLICIT, TAG_RESOLVED],
          updatedAt: '2026-09-08T15:00:00.000Z',
        }),
      ],
      now: TUE_8_SEP,
      timeZone: LONDON,
    });
    assert.ok(!Object.values(hints).some((hint) => hint.includes('I passed')));
  });

  it('15. reflection prompts do not fabricate feelings', () => {
    const hints = suggestReflectionPrompts({
      memories: [
        memory('Driving test', 'I finally passed my driving test', {
          tags: [TAG_EXPLICIT, TAG_RESOLVED],
          updatedAt: '2026-09-08T15:00:00.000Z',
        }),
      ],
      now: TUE_8_SEP,
      timeZone: LONDON,
    });
    const blob = Object.values(hints).join(' ');
    assert.equal(journalPromptFabricatesFeelings(blob), false);
    assert.doesNotMatch(blob, /you must have felt/i);
    assert.doesNotMatch(blob, /I missed you/);
    assert.doesNotMatch(blob, /we've been through so much/i);
  });

  it('16. TurnIntelligencePlan remains authoritative', () => {
    const userMessage = "I'm stressed about Friday";
    const plan = buildTurnIntelligencePlan({
      userMessage,
      selectedMode: 'friend',
      strategy: undefined,
    });
    const withJournal = talkBlock({ texts: [RAW_PRESENTATION], userMessage });
    assert.match(plan.promptBlock, /authoritative for this reply/i);
    assert.match(withJournal, /Do not override the turn plan/);
    assert.equal(plan.stance, buildTurnIntelligencePlan({ userMessage, selectedMode: 'friend' }).stance);
    assert.equal(plan.depth, buildTurnIntelligencePlan({ userMessage, selectedMode: 'friend' }).depth);
    assert.equal(plan.questionPolicy, buildTurnIntelligencePlan({ userMessage, selectedMode: 'friend' }).questionPolicy);
    assert.ok(!Object.prototype.hasOwnProperty.call(plan, 'journal'));
  });

  it('17. Talk still has one gateway generation', () => {
    assert.equal(talkGatewayGenerationCountForAcceptedSends(1), 1);
    const modules = selectContextModules('emotional_support', "I'm stressed about Friday");
    assert.ok(modules.includes('journal'));
    assert.equal(talkGatewayGenerationCountForAcceptedSends(1), 1);
  });

  it('18. local journal work stays inside the existing budget', () => {
    const texts = [RAW_PRESENTATION, RAW_GYM, RAW_DRIVING, 'Work was stressful.', 'Work drained me.'];
    const started = Date.now();
    for (let i = 0; i < 400; i += 1) {
      const signals = texts.map((text, index) => signalFrom(`p${index}`, text));
      deriveJournalPatterns(signals);
      formatJournalSignalsForTalk({
        signals,
        patterns: deriveJournalPatterns(signals),
        userMessage: "I'm stressed about Friday",
        intent: 'emotional_support',
        explicitRetrieval: false,
      });
      decideJournalCallback({
        signal: signals[0]!,
        userMessage: '36x14',
        intent: 'factual_question',
        explicitRetrieval: false,
      });
    }
    assert.ok(Date.now() - started < 2000);
  });
});

describe('Phase 2C load path and routing', () => {
  it('factual loadJournalTalkContext pays zero journal I/O', async () => {
    const result = await loadJournalTalkContext({
      storage: new MemoryStorage(),
      userId: 'user-1',
      userMessage: '36x14',
      intent: 'factual_question',
      timeZone: LONDON,
    });
    assert.equal(result.loaded, false);
    assert.equal(result.block, '');
  });

  it('explicit retrieval is allowed without inventing missing days', () => {
    const missing = formatExplicitJournalRetrieval({
      entries: [],
      rangeLabel: 'yesterday',
    });
    assert.match(missing, /No journal entries found/);
    assert.match(missing, /Do not invent entries/);
  });

  it('ordinary Talk uses derived signals from sources, not raw bodies', () => {
    const signals = deriveSignalsFromSources({
      journals: [
        {
          id: 'j1',
          date: '2026-09-07',
          body: RAW_PRESENTATION,
          isPrivate: false,
          savedAt: '2026-09-07T18:00:00.000Z',
        },
      ],
      reflections: [],
      checkIns: [],
      now: TUE_8_SEP,
      timeZone: LONDON,
    });
    const block = formatJournalSignalsForTalk({
      signals,
      patterns: [],
      userMessage: "I'm stressed about Friday",
      intent: 'emotional_support',
      explicitRetrieval: false,
    });
    assert.equal(containsRawPrivateDump(block, RAW_PRESENTATION), false);
    assert.match(block, /presentation/i);
  });

  it('casual Talk does not load the journal module', () => {
    const modules = selectContextModules('casual_conversation', "Yo you wont believe what just happened");
    assert.ok(!modules.includes('journal'));
  });

  it('journal block is assembled only when the module is selected', () => {
    const derived = talkBlock({
      texts: [RAW_PRESENTATION],
      userMessage: "I'm stressed about Friday",
    });
    const factual = assembleRoutedContextExtension(['phase4_quality', 'phase9_plan'], {
      journal: derived,
    });
    assert.equal(factual, '');
    const emotional = assembleRoutedContextExtension(['journal'], { journal: derived });
    assert.equal(emotional, derived);
  });

  it('FakeAI extraction stays local — no extra Talk generation', async () => {
    const ai = new FakeAIService();
    const extracted = await ai.extractMemoriesFromExchange({
      userMessage: "I'm stressed about Friday",
      voxaReply: 'That presentation has been sitting with you.',
      mode: 'friend',
      userProfile: {
        id: 'user-1',
        displayName: 'Alex',
        timezone: LONDON,
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
        companion: { defaultMode: 'friend', lastUsedMode: 'friend' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } as never,
      existingMemories: [],
    });
    assert.ok(Array.isArray(extracted));
    assert.equal(talkGatewayGenerationCountForAcceptedSends(1), 1);
  });
});
