import { Goal } from './goal';
import { Reminder } from './reminder';

export type DailyBriefing = {
  greeting: string;
  personalMessage: string;
  suggestedAction: string;
  checkInsToday: Reminder[];
  activeGoals: Goal[];
};
