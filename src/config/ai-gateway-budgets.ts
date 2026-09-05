/** Client-side budgets for ai-gateway chat payloads. */
export const AI_GATEWAY_BUDGETS = {
  /** Maximum characters for the current user turn. */
  maxUserMessageChars: 4_000,
  /** Base system prompt (personality, safety, profile summary). */
  maxSystemPromptChars: 4_000,
  /** Appended companion/phase context block inside the system message. */
  maxContextExtensionChars: 1_800,
  /** Recent turns included from conversation history. */
  maxHistoryMessages: 10,
  /** Total characters across retained history turns. */
  maxHistoryChars: 2_800,
  /** Memories injected into the system prompt. */
  maxMemoriesInPrompt: 5,
  /** Per-memory line budget (title + content). */
  maxMemoryEntryChars: 240,
  /** Active goals listed in the system prompt. */
  maxGoalsInPrompt: 5,
  maxGoalTitleChars: 120,
  /** Upcoming reminders listed in the system prompt. */
  maxRemindersInPrompt: 3,
  /**
   * Client preflight total payload budget.
   * Kept below the legacy server guard so Talk works even before gateway redeploy.
   */
  maxTotalPayloadChars: 7_500,
} as const;

export type AiGatewayBudgets = typeof AI_GATEWAY_BUDGETS;
