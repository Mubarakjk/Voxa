import { CompanionModeId } from '../../types';
import { SmartChatAction, SmartChatActionId } from '../../types/phase4-intelligence';

export type SuggestActionsInput = {
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
  hasExistingMemory?: boolean;
  isLargeTopic?: boolean;
  goalMentioned?: boolean;
  emotional?: boolean;
};

export class SmartChatActionsService {
  suggest(input: SuggestActionsInput): SmartChatAction[] {
    const lower = `${input.userMessage} ${input.voxaReply}`.toLowerCase();
    const actions: SmartChatAction[] = [];

    const add = (id: SmartChatActionId, label: string, payload?: Record<string, string>) => {
      if (!actions.some((a) => a.id === id)) actions.push({ id, label, payload });
    };

    if (input.userMessage.trim().length >= 12) {
      add('remember_this', 'Remember this', { text: input.userMessage.slice(0, 200) });
    }

    if (/goal|achieve|want to|plan to|working toward/.test(lower) || input.goalMentioned) {
      add('create_goal', 'Create goal');
    }

    if (/step|task|break down|how do i start|overwhelm/.test(lower) || input.isLargeTopic) {
      add('break_into_tasks', 'Break into tasks');
      add('open_canvas', 'Open workspace');
    }

    if (/challenge|30 day|habit|streak|commit/.test(lower)) {
      add('create_challenge', 'Create challenge');
    }

    if (/remind|tomorrow|next week|at \d|schedule/.test(lower)) {
      add('schedule_reminder', 'Schedule reminder');
    }

    if (/feel|reflect|journal|today was|grateful/.test(lower) || input.emotional) {
      add('save_to_journal', 'Save to journal');
    }

    if (/travel|trip|someday|bucket|dream|visit/.test(lower)) {
      add('add_to_bucket_list', 'Add to bucket list');
    }

    if (/vision|dream life|future|imagine|manifest/.test(lower)) {
      add('save_to_vision_board', 'Save to vision board');
    }

    if (input.hasExistingMemory) {
      add('pin_memory', 'Pin memory');
    }

    if (input.voxaReply.length > 120) {
      add('explain_differently', 'Explain differently');
    }

    if (/idea|think|strategy|business|startup/.test(lower)) {
      add('challenge_thinking', 'Challenge my thinking');
      add('open_debate', 'Open debate mode');
    }

    if (/should i|decide|decision|accept the job|move to|university/.test(lower)) {
      add('simulate_decision', 'Simulate decision');
    }

    if (/dream|nightmare|slept|woke up/.test(lower)) {
      add('log_dream', 'Log dream');
    }

    add('continue_tomorrow', 'Continue tomorrow');
    add('favourite_reply', 'Favourite reply');

    return actions.slice(0, 6);
  }
}

export const smartChatActionsService = new SmartChatActionsService();
