import { Memory } from '../types';

export const PINNED_MEMORY_TAG = 'pinned';
export const VOICE_MEMORY_TAG = 'voice-memory';
export const AUDIO_REF_PREFIX = 'audio-ref:';

export function isMemoryPinned(memory: Memory): boolean {
  return memory.pinned === true || memory.tags.includes(PINNED_MEMORY_TAG);
}

export function withMemoryPinned(memory: Memory, pinned: boolean): Memory {
  const tags = memory.tags.filter((tag) => tag !== PINNED_MEMORY_TAG);
  if (pinned) tags.unshift(PINNED_MEMORY_TAG);
  return { ...memory, pinned, tags };
}

export function sortMemoriesWithPinnedFirst(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => {
    const aPinned = isMemoryPinned(a);
    const bPinned = isMemoryPinned(b);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function buildAudioMemoryRef(attachmentId: string) {
  return `${AUDIO_REF_PREFIX}${attachmentId}`;
}

export function getAudioMemoryRef(tags: string[]): string | undefined {
  return tags.find((tag) => tag.startsWith(AUDIO_REF_PREFIX))?.slice(AUDIO_REF_PREFIX.length);
}
