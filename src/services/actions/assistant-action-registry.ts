import { AssistantActionId, AssistantActionResult } from '../../types';
import { ASSISTANT_ACTIONS, getAssistantAction } from '../../constants/assistant-actions';

/**
 * Registry for assistant actions — structure for future AI-driven execution.
 */
export class AssistantActionRegistry {
  listActions() {
    return ASSISTANT_ACTIONS;
  }

  getAction(actionId: AssistantActionId) {
    return getAssistantAction(actionId);
  }

  /** Placeholder execution — returns guidance until AI wiring is added. */
  async execute(actionId: AssistantActionId): Promise<AssistantActionResult> {
    const action = getAssistantAction(actionId);
    if (!action) {
      return { actionId, success: false, message: 'Unknown action.' };
    }

    if (action.status === 'coming_soon') {
      return {
        actionId,
        success: false,
        message: `${action.label} is coming soon.`,
      };
    }

    return {
      actionId,
      success: true,
      message: `${action.label}: ${action.description}`,
    };
  }
}

export const assistantActionRegistry = new AssistantActionRegistry();
