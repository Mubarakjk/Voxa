import { EntityId, ISODateString } from './common';

export type NoteType =
  | 'standard'
  | 'checklist'
  | 'journal'
  | 'study'
  | 'idea'
  | 'meeting';

export type NoteChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type NoteMemoryConsent = 'private' | 'remember' | 'use_in_conversations';

export type Note = {
  id: EntityId;
  userId: EntityId;
  title: string;
  body: string;
  type: NoteType;
  checklist: NoteChecklistItem[];
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  favourite: boolean;
  memoryConsent: NoteMemoryConsent;
  /** Linked explicit memory id when user asked Voxa to remember this note */
  linkedMemoryId?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt?: ISODateString;
};

export type NoteFolder = {
  id: string;
  userId: EntityId;
  name: string;
  /** Accent hex for folder chip / list marker */
  color: string;
  createdAt: ISODateString;
};

export const NOTE_FOLDER_COLORS = [
  '#2DD4BF',
  '#38BDF8',
  '#A78BFA',
  '#F472B6',
  '#FBBF24',
  '#34D399',
] as const;

export type NoteSort = 'updated_desc' | 'updated_asc' | 'title_asc' | 'created_desc';

export type NotesFilter = {
  query?: string;
  folderId?: string | null;
  tag?: string;
  type?: NoteType;
  pinnedOnly?: boolean;
  favouritesOnly?: boolean;
  includeArchived?: boolean;
};

export type NoteAIActionId =
  | 'summarise'
  | 'rewrite'
  | 'improve_clarity'
  | 'shorter'
  | 'more_detailed'
  | 'to_checklist'
  | 'extract_tasks'
  | 'flashcards'
  | 'quiz'
  | 'brainstorm'
  | 'explain'
  | 'study_plan'
  | 'to_goal'
  | 'to_routine'
  | 'discuss';

export type NoteAIActionResult = {
  actionId: NoteAIActionId;
  previewText: string;
  checklist?: NoteChecklistItem[];
  isEstimate?: boolean;
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  standard: 'Note',
  checklist: 'Checklist',
  journal: 'Journal',
  study: 'Study',
  idea: 'Idea',
  meeting: 'Meeting',
};

export const NOTE_TEMPLATES: Record<NoteType, { title: string; body: string }> = {
  standard: { title: '', body: '' },
  checklist: { title: 'Checklist', body: '' },
  journal: { title: 'Journal', body: 'Today I…\n\nI felt…\n\nOne thing I want to remember…' },
  study: { title: 'Study note', body: 'Topic:\n\nKey points:\n\nQuestions:' },
  idea: { title: 'Idea', body: 'The idea:\n\nWhy it matters:\n\nNext step:' },
  meeting: { title: 'Meeting', body: 'Attendees:\n\nNotes:\n\nActions:' },
};
