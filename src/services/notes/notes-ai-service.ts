import { areAllFeaturesUnlocked } from '../../config/launch-mode';
import { createUuid } from '../../types';
import { Note, NoteAIActionId, NoteAIActionResult, NoteChecklistItem } from '../../types/notes';

/**
 * Quick local note tools (on-device heuristics).
 * These are NOT cloud LLM transforms. Label them honestly in UI.
 * Notes are only sent to Talk / AI context when the user explicitly chooses an action like Discuss.
 */

const BASIC_ACTIONS: NoteAIActionId[] = [
  'summarise',
  'rewrite',
  'improve_clarity',
  'shorter',
  'more_detailed',
  'to_checklist',
  'discuss',
];

const PRO_ACTIONS: NoteAIActionId[] = [
  'extract_tasks',
  'flashcards',
  'quiz',
  'brainstorm',
  'explain',
  'study_plan',
  'to_goal',
  'to_routine',
];

export function listNoteAIActions(isPro: boolean): NoteAIActionId[] {
  if (areAllFeaturesUnlocked() || isPro) return [...BASIC_ACTIONS, ...PRO_ACTIONS];
  return BASIC_ACTIONS;
}

export function isProNoteAction(id: NoteAIActionId): boolean {
  if (areAllFeaturesUnlocked()) return false;
  return PRO_ACTIONS.includes(id);
}

export function noteAIActionLabel(id: NoteAIActionId): string {
  const map: Record<NoteAIActionId, string> = {
    summarise: 'Summarise',
    rewrite: 'Rewrite',
    improve_clarity: 'Improve clarity',
    shorter: 'Make shorter',
    more_detailed: 'Make more detailed',
    to_checklist: 'Turn into checklist',
    extract_tasks: 'Extract tasks',
    flashcards: 'Create flashcards',
    quiz: 'Quiz me',
    brainstorm: 'Brainstorm',
    explain: 'Explain this',
    study_plan: 'Create a study plan',
    to_goal: 'Turn into a goal',
    to_routine: 'Add to routine',
    discuss: 'Discuss with Voxa',
  };
  return map[id];
}

export function noteAIToolsDisclaimer(): string {
  return 'Quick on-device tools. Preview before applying. Your original note is never overwritten automatically.';
}

function localChecklistFromBody(body: string): NoteChecklistItem[] {
  return body
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.)\]]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((text) => ({ id: createUuid(), text, done: false }));
}

/**
 * Preview for a note quick-tool action. Never mutates the note.
 * Offline-safe local transforms only.
 */
export async function runNoteAIAction(input: {
  note: Note;
  actionId: NoteAIActionId;
  isPro: boolean;
}): Promise<NoteAIActionResult> {
  const allowed = listNoteAIActions(input.isPro);
  if (!allowed.includes(input.actionId)) {
    throw new Error('This note tool is available with Voxa Pro.');
  }

  const source = `${input.note.title}\n\n${input.note.body}`.trim() || 'Empty note';
  const { actionId } = input;

  switch (actionId) {
    case 'summarise':
      return {
        actionId,
        previewText:
          source.length <= 240
            ? `Summary:\n${source}`
            : `Summary:\n${source.slice(0, 240).trim()}…`,
        isEstimate: true,
      };
    case 'rewrite':
    case 'improve_clarity':
      return {
        actionId,
        previewText: source.replace(/[ \t]+/g, ' ').trim(),
        isEstimate: true,
      };
    case 'shorter': {
      const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
      return { actionId, previewText: sentences.join(' '), isEstimate: true };
    }
    case 'more_detailed':
      return {
        actionId,
        previewText: `${source}\n\nExpand on:\n- Context\n- Why it matters\n- Next step`,
        isEstimate: true,
      };
    case 'to_checklist':
    case 'extract_tasks':
      return {
        actionId,
        previewText: 'Checklist drafted from your note. Apply to convert this note.',
        checklist: localChecklistFromBody(input.note.body || input.note.title),
        isEstimate: true,
      };
    case 'flashcards':
      return {
        actionId,
        previewText: `Flashcards:\nQ: What is the main idea?\nA: ${source.slice(0, 120)}\n\nQ: What is one next step?\nA: Review and act on the note.`,
        isEstimate: true,
      };
    case 'quiz':
      return {
        actionId,
        previewText: `Quiz:\n1. What is the key takeaway?\n2. What should you do next?\n3. What is still unclear?\n\nBased on:\n${source.slice(0, 200)}`,
        isEstimate: true,
      };
    case 'brainstorm':
      return {
        actionId,
        previewText: `Brainstorm:\n- Angle A: simplify\n- Angle B: expand impact\n- Angle C: collaborate\n\nSeed:\n${source.slice(0, 180)}`,
        isEstimate: true,
      };
    case 'explain':
      return { actionId, previewText: `In plain language:\n${source}`, isEstimate: true };
    case 'study_plan':
      return {
        actionId,
        previewText: `Study plan:\nDay 1 — Read and highlight\nDay 2 — Summarise from memory\nDay 3 — Practice questions\nDay 4 — Teach it back\n\nFocus:\n${source.slice(0, 160)}`,
        isEstimate: true,
      };
    case 'to_goal':
      return {
        actionId,
        previewText: `Suggested goal:\n${input.note.title || 'Work from this note'}\n\nWhy:\n${source.slice(0, 200)}`,
        isEstimate: true,
      };
    case 'to_routine':
      return {
        actionId,
        previewText: `Routine suggestion:\n- Morning: review this note (10 min)\n- Midday: one action from it\n- Evening: tick progress\n\nSource:\n${source.slice(0, 140)}`,
        isEstimate: true,
      };
    case 'discuss':
      return {
        actionId,
        previewText: `I'd like to discuss this note with you:\n\n${source}`,
      };
    default:
      return { actionId, previewText: source, isEstimate: true };
  }
}
