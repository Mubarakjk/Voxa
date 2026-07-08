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
import { LocalGoalRepository } from './local/local-goal-repository';
import { LocalTrustedContactRepository } from './local/local-trusted-contact-repository';
import { createCompanionIntelligenceService } from './intelligence/companion-intelligence-service';
import { MemoryIntelligenceService } from './memory/memory-intelligence-service';
import { LocalVoiceSessionRepository } from './local/local-voice-session-repository';
import { hasSupabaseConfig } from '../config/env';
import { getSupabaseClient } from './supabase/client';
import { createHybridRepositories } from './hybrid/hybrid-repositories';
import { createSupabaseRepositories } from './supabase/supabase-repositories';
import {
  FeatureGateService,
  LocalSubscriptionRepository,
  StubBillingService,
  StubPurchaseManager,
  SubscriptionService,
  UsageTrackingService,
} from './billing';
import { createMusicRecognitionService } from './music/music-recognition-service';
import { IBillingService, IPurchaseManager, ISubscriptionRepository } from './billing/billing-contracts';

export type CreateVoxaServicesOptions = {
  storage?: IStorageService;
  ai?: IAIService;
  /** Force local repositories even when Supabase is configured. */
  forceLocal?: boolean;
  /** Use Supabase only (no local cache fallback). Default false when Supabase is configured. */
  supabaseOnly?: boolean;
};

export function createVoxaServices(options: CreateVoxaServicesOptions = {}): VoxaServices {
  const storage = options.storage ?? new AsyncStorageService();
  const ai = options.ai ?? createAppAIService();

  const localRepositories: VoxaRepositories = {
    userProfile: new LocalUserProfileRepository(storage),
    memories: new LocalMemoryRepository(storage),
    conversations: new LocalConversationRepository(storage),
    messages: new LocalMessageRepository(storage),
    reminders: new LocalReminderRepository(storage),
    goals: new LocalGoalRepository(storage),
    voiceSessions: new LocalVoiceSessionRepository(storage),
    trustedContacts: new LocalTrustedContactRepository(storage),
  };

  const repositories: VoxaRepositories =
    hasSupabaseConfig() && !options.forceLocal
      ? options.supabaseOnly
        ? createSupabaseRepositories(getSupabaseClient())
        : createHybridRepositories(getSupabaseClient(), storage)
      : localRepositories;

  const memoryEngine = new MemoryIntelligenceService(repositories.memories, ai);
  const companionIntelligence = createCompanionIntelligenceService(repositories, storage, memoryEngine);

  const usageTracking = new UsageTrackingService(storage);
  const subscriptionRepo: ISubscriptionRepository = new LocalSubscriptionRepository(
    repositories.userProfile,
    usageTracking,
  );
  const billing: IBillingService = new StubBillingService(subscriptionRepo);
  const purchaseManager: IPurchaseManager = new StubPurchaseManager();
  const subscription = new SubscriptionService(subscriptionRepo, billing, usageTracking);
  const featureGate = new FeatureGateService();
  createMusicRecognitionService(storage);

  return {
    storage,
    ai,
    repositories,
    memoryEngine,
    companionIntelligence,
    usageTracking,
    subscriptionRepo,
    billing,
    purchaseManager,
    subscription,
    featureGate,
  };
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
