import { createAppAIService } from './ai/create-ai-service';
import {
  IAIService,
  IStorageService,
  IUserProfileRepository,
  VoxaRepositories,
  VoxaServices,
} from './contracts';
import { AsyncStorageService } from './local/async-storage-service';
import { LocalConversationRepository } from './local/local-conversation-repository';
import { LocalMemoryRepository } from './local/local-memory-repository';
import { LocalMessageRepository } from './local/local-message-repository';
import { LocalReminderRepository } from './local/local-reminder-repository';
import { LocalUserProfileRepository } from './local/local-user-profile-repository';

export type CreateVoxaServicesOptions = {
  storage?: IStorageService;
  ai?: IAIService;
};

export function createVoxaServices(options: CreateVoxaServicesOptions = {}): VoxaServices {
  const storage = options.storage ?? new AsyncStorageService();
  const ai = options.ai ?? createAppAIService();

  const repositories: VoxaRepositories = {
    userProfile: new LocalUserProfileRepository(storage),
    memories: new LocalMemoryRepository(storage),
    conversations: new LocalConversationRepository(storage),
    messages: new LocalMessageRepository(storage),
    reminders: new LocalReminderRepository(storage),
  };

  return { storage, ai, repositories };
}

/** Singleton for app-wide access until a React context/provider is added. */
let voxaServicesSingleton: VoxaServices | null = null;

export function getVoxaServices(): VoxaServices {
  if (!voxaServicesSingleton) {
    voxaServicesSingleton = createVoxaServices();
  }
  return voxaServicesSingleton;
}

export function resetVoxaServices(options: CreateVoxaServicesOptions = {}): VoxaServices {
  voxaServicesSingleton = createVoxaServices(options);
  return voxaServicesSingleton;
}

export type { IUserProfileRepository, VoxaRepositories, VoxaServices };
