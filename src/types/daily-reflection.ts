import { EntityId, ISODateString } from './common';

export type DailyReflectionAnswers = {
  smiled: string;
  challenged: string;
  grateful: string;
};

export type DailyReflectionEntry = {
  id: EntityId;
  userId: EntityId;
  date: string;
  answers: DailyReflectionAnswers;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  xpAwarded?: boolean;
};

export const DAILY_REFLECTION_QUESTIONS: Array<{
  id: keyof DailyReflectionAnswers;
  label: string;
  placeholder: string;
}> = [
  {
    id: 'smiled',
    label: 'What made you smile today?',
    placeholder: 'A moment, person, or small win',
  },
  {
    id: 'challenged',
    label: 'What challenged you today?',
    placeholder: 'Something that tested you',
  },
  {
    id: 'grateful',
    label: 'What are you grateful for?',
    placeholder: 'Even one small thing counts',
  },
];

export const DAILY_REFLECTION_XP = 12;
