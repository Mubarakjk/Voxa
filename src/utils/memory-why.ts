import { Memory } from '../types';
import { MEMORY_CATEGORY_LABELS } from '../constants/memory-categories';

/** Human explanation of why Voxa holds a memory — never invents private chat text. */
export function explainWhyRemembered(memory: Memory): string {
  const parts: string[] = [];
  const category = MEMORY_CATEGORY_LABELS[memory.category] ?? memory.category;

  switch (memory.source) {
    case 'manual':
      parts.push('You asked Voxa to remember this.');
      break;
    case 'check_in':
      parts.push('Saved from a check-in.');
      break;
    case 'image':
      parts.push('Linked to a photo you shared.');
      break;
    case 'voice_call':
    case 'audio':
      parts.push('Captured from a voice conversation.');
      break;
    case 'conversation':
    case 'text':
    default:
      parts.push('Learned from a conversation with you.');
      break;
  }

  parts.push(`Filed under ${category}.`);

  if (memory.importance >= 4) {
    parts.push('Marked as important.');
  } else if (memory.importance <= 2) {
    parts.push('Kept lightly — lower importance.');
  }

  if (memory.useCount > 0) {
    parts.push(`Used in ${memory.useCount} chat${memory.useCount === 1 ? '' : 's'} to stay personal.`);
  } else {
    parts.push('Not yet used in a chat — still available when relevant.');
  }

  if (memory.tags?.includes('remember-this')) {
    parts.push('You tagged this as something to remember.');
  }
  if (memory.tags?.includes('from-note')) {
    parts.push('Linked from a note you chose to remember.');
  }

  return parts.join(' ');
}
