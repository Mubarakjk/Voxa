import {
  CompanionModeId,
  Conversation,
  CreateConversationInput,
  CreateMemoryInput,
  CreateMessageInput,
  CreateReminderInput,
  CreateUserProfileInput,
  Memory,
  Message,
  Reminder,
  UpdateConversationInput,
  UpdateMemoryInput,
  UpdateReminderInput,
  UpdateUserProfileInput,
  UserProfile,
} from '../../types';

export interface IUserProfileRepository {
  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  createProfile(input: CreateUserProfileInput): Promise<UserProfile>;
  updateProfile(input: UpdateUserProfileInput): Promise<UserProfile>;
  clearProfile(): Promise<void>;
}

export interface IMemoryRepository {
  listMemories(userId: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | null>;
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  updateMemory(id: string, input: UpdateMemoryInput): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
}

export interface IConversationRepository {
  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  updateConversation(id: string, input: UpdateConversationInput): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
}

export interface IMessageRepository {
  listMessages(conversationId: string): Promise<Message[]>;
  createMessage(input: CreateMessageInput): Promise<Message>;
  deleteMessagesForConversation(conversationId: string): Promise<void>;
}

export interface IReminderRepository {
  listReminders(userId: string): Promise<Reminder[]>;
  listUpcomingCheckIns(userId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | null>;
  createReminder(input: CreateReminderInput): Promise<Reminder>;
  updateReminder(id: string, input: UpdateReminderInput): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
}

export type GenerateReplyInput = {
  mode: CompanionModeId;
  userMessage: string;
  conversationHistory: Message[];
  userProfile: UserProfile;
  memories: Memory[];
};

export type GenerateCheckInInput = {
  mode: CompanionModeId;
  userProfile: UserProfile;
  reminder: Reminder;
  memories: Memory[];
};

export type GenerateReplyResult = {
  content: string;
  suggestedMemory?: Pick<CreateMemoryInput, 'category' | 'title' | 'content' | 'mood' | 'relatedMode'>;
};

export type ExtractedMemoryCandidate = Pick<
  CreateMemoryInput,
  'category' | 'title' | 'content' | 'mood' | 'importance' | 'tags' | 'relatedMode'
>;

export type AnalyzeConversationInput = {
  userMessage: string;
  voxaReply: string;
  mode: CompanionModeId;
  userProfile: UserProfile;
  existingMemories: Memory[];
};

/**
 * AI companion contract.
 * Replace FakeAIService with an OpenAI-backed implementation later.
 */
export interface IAIService {
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
  generateCheckInPrompt(input: GenerateCheckInInput): Promise<string>;
  generateConversationTitle(mode: CompanionModeId, firstMessage: string): Promise<string>;
  extractMemoriesFromExchange(input: AnalyzeConversationInput): Promise<ExtractedMemoryCandidate[]>;
}

export type VoxaRepositories = {
  userProfile: IUserProfileRepository;
  memories: IMemoryRepository;
  conversations: IConversationRepository;
  messages: IMessageRepository;
  reminders: IReminderRepository;
};

export type VoxaServices = {
  storage: import('./storage-service').IStorageService;
  ai: IAIService;
  repositories: VoxaRepositories;
  memoryEngine: import('../memory/memory-intelligence-service').MemoryIntelligenceService;
};

export type { IStorageService } from './storage-service';
