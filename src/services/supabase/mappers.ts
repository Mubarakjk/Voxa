import {
  createDefaultCompanionIdentity,
} from '../../constants/companion-identity';
import { createDefaultVoiceIdentity } from '../../types/voice-identity';
import { createDefaultAvatarAppearance } from '../../types/avatar-appearance';
import {
  Conversation,
  CreateConversationInput,
  CreateGoalInput,
  CreateMemoryInput,
  CreateMessageInput,
  CreateReminderInput,
  CreateTrustedContactInput,
  CreateUserProfileInput,
  CreateVoiceSessionInput,
  Goal,
  Memory,
  Message,
  Reminder,
  TrustedContact,
  UpdateConversationInput,
  UpdateGoalInput,
  UpdateMemoryInput,
  UpdateReminderInput,
  UpdateUserProfileInput,
  UpdateVoiceSessionInput,
  UserProfile,
  VoiceSession,
  createDefaultCompanionPreference,
  createDefaultPreferences,
  createUserProfile,
  mergeCompanion,
  mergePreferences,
  nowIso,
  createDefaultSubscription,
} from '../../types';

type ProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  age: number | null;
  main_reason: string | null;
  timezone: string;
  onboarding_complete: boolean;
  preferences: Record<string, unknown>;
  companion: Record<string, unknown>;
  companion_identity?: Record<string, unknown> | null;
  onboarding: Record<string, unknown> | null;
  subscription?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function profileFromRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email ?? undefined,
    age: row.age ?? undefined,
    mainReason: row.main_reason ?? undefined,
    timezone: row.timezone,
    onboardingComplete: row.onboarding_complete,
    preferences: { ...createDefaultPreferences(), ...(row.preferences as UserProfile['preferences']) },
    companion: { ...createDefaultCompanionPreference(), ...(row.companion as UserProfile['companion']) },
    companionIdentity: row.companion_identity
      ? ({
          ...createDefaultCompanionIdentity(),
          ...row.companion_identity,
          voiceIdentity: {
            ...createDefaultVoiceIdentity(),
            ...((row.companion_identity as Record<string, unknown>).voiceIdentity as object),
          },
          appearance: {
            ...createDefaultAvatarAppearance(),
            ...((row.companion_identity as Record<string, unknown>).appearance as object),
          },
        } as UserProfile['companionIdentity'])
      : undefined,
    onboarding: row.onboarding ? (row.onboarding as UserProfile['onboarding']) : undefined,
    subscription: row.subscription
      ? ({ ...createDefaultSubscription(), ...row.subscription } as UserProfile['subscription'])
      : createDefaultSubscription(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function profileToUpdate(input: UpdateUserProfileInput): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.email !== undefined) patch.email = input.email;
  if (input.age !== undefined) patch.age = input.age;
  if (input.mainReason !== undefined) patch.main_reason = input.mainReason;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.onboardingComplete !== undefined) patch.onboarding_complete = input.onboardingComplete;
  if (input.onboarding !== undefined) patch.onboarding = input.onboarding;
  if (input.subscription !== undefined) patch.subscription = input.subscription;
  return patch;
}

export function memoryFromRow(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    category: row.category as Memory['category'],
    title: row.title as string,
    content: row.content as string,
    mood: row.mood as Memory['mood'],
    importance: row.importance as Memory['importance'],
    tags: (row.tags as string[]) ?? [],
    source: row.source as Memory['source'],
    relatedMode: row.related_mode as Memory['relatedMode'],
    occurredAt: row.occurred_at as string | undefined,
    lastUsedAt: row.last_used_at as string | undefined,
    useCount: (row.use_count as number) ?? 0,
    emotionalSignificance: row.emotional_significance as Memory['emotionalSignificance'],
    confidence: row.confidence as number | undefined,
    expiresAt: row.expires_at as string | undefined,
    pinned: ((row.tags as string[]) ?? []).includes('pinned'),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function memoryToInsert(input: CreateMemoryInput, id: string, timestamp: string) {
  const tags = [...(input.tags ?? [])];
  if (input.pinned && !tags.includes('pinned')) tags.unshift('pinned');
  return {
    id,
    user_id: input.userId,
    category: input.category,
    title: input.title,
    content: input.content,
    mood: input.mood ?? 'neutral',
    importance: input.importance ?? 3,
    tags,
    source: input.source ?? 'manual',
    related_mode: input.relatedMode,
    occurred_at: input.occurredAt,
    last_used_at: input.lastUsedAt,
    use_count: input.useCount ?? 0,
    emotional_significance: input.emotionalSignificance,
    confidence: input.confidence,
    expires_at: input.expiresAt,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function memoryToUpdate(input: UpdateMemoryInput, tags?: string[]): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.category !== undefined) patch.category = input.category;
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.mood !== undefined) patch.mood = input.mood;
  if (input.importance !== undefined) patch.importance = input.importance;
  if (input.relatedMode !== undefined) patch.related_mode = input.relatedMode;
  if (input.occurredAt !== undefined) patch.occurred_at = input.occurredAt;
  if (input.lastUsedAt !== undefined) patch.last_used_at = input.lastUsedAt;
  if (input.useCount !== undefined) patch.use_count = input.useCount;
  if (input.emotionalSignificance !== undefined) patch.emotional_significance = input.emotionalSignificance;
  if (input.confidence !== undefined) patch.confidence = input.confidence;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  if (tags !== undefined) patch.tags = tags;
  return patch;
}

export function goalFromRow(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    category: row.category as Goal['category'],
    status: row.status as Goal['status'],
    progress: row.progress as number,
    targetDate: row.target_date as string | undefined,
    linkedReminderId: row.linked_reminder_id as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function reminderFromRow(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    kind: row.kind as Reminder['kind'],
    title: row.title as string,
    body: row.body as string | undefined,
    scheduledAt: row.scheduled_at as string,
    recurrence: row.recurrence as Reminder['recurrence'],
    status: row.status as Reminder['status'],
    mode: row.mode as Reminder['mode'],
    allowProactiveCall: Boolean(row.allow_proactive_call),
    completedAt: row.completed_at as string | undefined,
    goalId: row.goal_id as string | undefined,
    notificationId: row.notification_id as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function reminderToUpdate(input: UpdateReminderInput): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  if (input.status !== undefined) patch.status = input.status;
  if (input.mode !== undefined) patch.mode = input.mode;
  if (input.allowProactiveCall !== undefined) patch.allow_proactive_call = input.allowProactiveCall;
  if (input.completedAt !== undefined) patch.completed_at = input.completedAt;
  if (input.notificationId !== undefined) patch.notification_id = input.notificationId;
  return patch;
}

export function conversationFromRow(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as Conversation['mode'],
    channel: row.channel as Conversation['channel'],
    title: row.title as string | undefined,
    status: row.status as Conversation['status'],
    lastMessageAt: row.last_message_at as string | undefined,
    summary: row.summary as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function messageFromRow(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as Message['role'],
    content: row.content as string,
    mode: row.mode as Message['mode'],
    status: row.status as Message['status'],
    metadata: row.metadata as Message['metadata'],
    attachments: (row.attachments as Message['attachments']) ?? [],
    createdAt: row.created_at as string,
  };
}

export function voiceSessionFromRow(row: Record<string, unknown>): VoiceSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    conversationId: row.conversation_id as string,
    mode: row.mode as VoiceSession['mode'],
    state: row.state as VoiceSession['state'],
    isSafeCall: Boolean(row.is_safe_call),
    startedAt: row.started_at as string | undefined,
    endedAt: row.ended_at as string | undefined,
    durationSeconds: (row.duration_seconds as number) ?? 0,
    transcriptMessageIds: (row.transcript_message_ids as string[]) ?? [],
    checkInIntervalMinutes: row.check_in_interval_minutes as number | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function trustedContactFromRow(row: Record<string, unknown>): TrustedContact {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    relation: row.relation as string,
    status: row.status as string,
    phone: row.phone as string | undefined,
    isEmergency: Boolean(row.is_emergency),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export { createUserProfile, CreateUserProfileInput };
