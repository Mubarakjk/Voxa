import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assessMemoryWrite } from '../src/services/memory/memory-write-policy';
import { isSupersededMemory, TAG_SUPERSEDED } from '../src/services/memory/memory-taxonomy';
import { Memory } from '../src/types';

describe('P4 product polish', () => {
  it('hides superseded memories from user-facing active lists', () => {
    const memory: Memory = {
      id: 'm1',
      userId: 'u1',
      category: 'preferences',
      title: 'Old',
      content: 'Morning gym',
      mood: 'neutral',
      importance: 3,
      tags: [TAG_SUPERSEDED],
      source: 'conversation',
      useCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    assert.equal(isSupersededMemory(memory), true);
  });

  it('writes durable conversational preferences without debug metadata', () => {
    const decision = assessMemoryWrite('Keep your replies short from now on.');
    assert.ok(decision?.shouldPersist);
    assert.ok(decision?.tags.includes('conversational_preference'));
    assert.ok(!decision?.tags.includes('debug'));
  });
});
