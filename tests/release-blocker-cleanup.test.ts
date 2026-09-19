import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { getTodayQuickActionStarter } from '../src/constants/today-quick-actions';
import { shouldApplyTalkMessageLoad } from '../src/services/chat/talk-load-apply';
import {
  composerTextAfterDraftRestore,
  composerTextAfterStarterPrefill,
} from '../src/services/chat/talk-starter-prefill';
import { resolveGreetingFirstName } from '../src/utils/greeting-name';

describe('VOXA 1.0 release-blocker cleanup', () => {
  it('Talk hides thinkingAbout strip once a conversation has messages', () => {
    const source = readFileSync('src/screens/chat-screen.tsx', 'utf8');
    assert.match(source, /messages\.length === 0 && livingCompanion\?\.thinkingAbout/);
    assert.ok(!source.includes('autoSend: true'));
  });

  it('Home quick-action starters exist and prefill helper is one-shot / non-destructive', () => {
    for (const id of ['brainstorm', 'explain', 'plan_day'] as const) {
      const starter = getTodayQuickActionStarter(id);
      assert.ok(starter && starter.trim().length > 10, id);
    }

    const empty = composerTextAfterStarterPrefill({
      pendingStarter: "Let's brainstorm.",
      currentComposer: '',
    });
    assert.equal(empty.nextComposer, "Let's brainstorm.");
    assert.equal(empty.consumed, true);

    const typed = composerTextAfterStarterPrefill({
      pendingStarter: "Let's brainstorm.",
      currentComposer: 'I already started typing',
    });
    assert.equal(typed.nextComposer, 'I already started typing');
    assert.equal(typed.consumed, true);

    const overDraft = composerTextAfterStarterPrefill({
      pendingStarter: 'Help me plan today.',
      currentComposer: 'old draft',
      restoredDraft: 'old draft',
    });
    assert.equal(overDraft.nextComposer, 'Help me plan today.');
    assert.equal(overDraft.consumed, true);

    const none = composerTextAfterStarterPrefill({
      pendingStarter: null,
      currentComposer: '',
    });
    assert.equal(none.consumed, false);

    const draftRace = composerTextAfterDraftRestore({
      currentComposer: '',
      draft: 'saved draft',
      pendingStarter: 'Explain something clearly for me.',
    });
    assert.equal(draftRace.nextComposer, 'Explain something clearly for me.');
    assert.equal(draftRace.clearStarter, true);
  });

  it('stale loadChat does not apply over in-flight or post-send epochs', () => {
    assert.equal(
      shouldApplyTalkMessageLoad({
        loadSeq: 1,
        currentLoadSeq: 1,
        sendEpochAtLoadStart: 0,
        currentSendEpoch: 0,
        sendInFlight: false,
      }),
      true,
    );
    assert.equal(
      shouldApplyTalkMessageLoad({
        loadSeq: 1,
        currentLoadSeq: 2,
        sendEpochAtLoadStart: 0,
        currentSendEpoch: 0,
        sendInFlight: false,
      }),
      false,
    );
    assert.equal(
      shouldApplyTalkMessageLoad({
        loadSeq: 1,
        currentLoadSeq: 1,
        sendEpochAtLoadStart: 0,
        currentSendEpoch: 1,
        sendInFlight: false,
      }),
      false,
    );
    assert.equal(
      shouldApplyTalkMessageLoad({
        loadSeq: 1,
        currentLoadSeq: 1,
        sendEpochAtLoadStart: 0,
        currentSendEpoch: 0,
        sendInFlight: true,
      }),
      false,
    );

    const chatSource = readFileSync('src/screens/chat-screen.tsx', 'utf8');
    assert.match(chatSource, /sendEpochRef/);
    assert.match(chatSource, /shouldApplyTalkMessageLoad/);
    assert.match(chatSource, /setError\(formatTalkErrorForUser\(err\)\)/);
  });

  it('greeting first-name sanitization rejects hey/hi/hello and placeholders', () => {
    for (const junk of ['hey', 'Hi', 'HELLO', 'test', 'user', 'unknown', 'null', 'undefined', ' ', '\t']) {
      assert.equal(resolveGreetingFirstName(junk), null, junk);
    }
    assert.equal(resolveGreetingFirstName('Mubarak'), 'Mubarak');
    assert.equal(resolveGreetingFirstName('Alex Rivera'), 'Alex');
  });
});
