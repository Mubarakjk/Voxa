import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { selectContextModules } from '../src/services/ai/companion-context-router';
import { resolveTurnSuggestionPrompts } from '../src/services/chat/contextual-suggestions-service';
import { talkPerf } from '../src/utils/talk-perf';

describe('Talk performance QA guards', () => {
  it('DEV talkPerf logs stage timings without payload text', () => {
    const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    const lines: string[] = [];
    const originalLog = console.log;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    try {
      talkPerf('gateway', 2900);
      talkPerf('total-visible-response', 3640);
      assert.equal(lines.length, 2);
      assert.equal(lines[0], '[TALK PERF] gateway: 2900ms');
      assert.equal(lines[1], '[TALK PERF] total-visible-response: 3640ms');
    } finally {
      console.log = originalLog;
      (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
  });

  it('talkPerf is silent outside __DEV__', () => {
    const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    const lines: string[] = [];
    const originalLog = console.log;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    try {
      talkPerf('gateway', 12);
      assert.deepEqual(lines, []);
    } finally {
      console.log = originalLog;
      (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
  });

  it('simple factual turns do not load life-dashboard context modules', () => {
    const modules = selectContextModules('factual_question', "What's 17 x 8?");
    assert.deepEqual(modules, ['phase4_quality', 'phase9_plan']);
    assert.ok(!modules.includes('phase11_dashboard'));
    assert.ok(!modules.includes('nutrition'));
    assert.ok(!modules.includes('weather'));
    assert.ok(!modules.includes('notes'));
    assert.ok(!modules.includes('faith'));
  });

  it('empty contextual suggestions stay empty instead of stale coach chips', () => {
    const prompts = resolveTurnSuggestionPrompts({
      contextual: [],
      fallback: ['Hold me accountable gently', 'Break that into steps'],
    });
    assert.deepEqual(prompts, []);
  });
});
