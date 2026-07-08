import { CompanionModeId } from './companion-mode';

export type AssistantActionId =
  | 'set_reminder'
  | 'create_goal'
  | 'start_safe_call'
  | 'start_voice_call'
  | 'switch_mode'
  | 'add_memory'
  | 'summarize_day'
  | 'create_routine'
  | 'routine_help'
  | 'move_routine';

export type AssistantActionStatus = 'available' | 'planned' | 'coming_soon';

/**
 * Declarative action the assistant may suggest or execute in future versions.
 */
export type AssistantAction = {
  id: AssistantActionId;
  label: string;
  description: string;
  status: AssistantActionStatus;
  relatedModes?: CompanionModeId[];
};

export type AssistantActionRequest = {
  actionId: AssistantActionId;
  payload?: Record<string, string | number | boolean>;
};

export type AssistantActionResult = {
  actionId: AssistantActionId;
  success: boolean;
  message: string;
};
