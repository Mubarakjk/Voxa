import { IStorageService, VoxaRepositories } from '../contracts';
import { CreateGoalInput, EntityId, Goal, GoalCategory, Memory, createUuid, nowIso } from '../../types';
import {
  BucketListItemV5,
  BucketStatus,
  CoachScoreSnapshot,
  DebatePerspective,
  DebateResult,
  DreamEntry,
  FutureSelfProfile,
  GoalMilestone,
  GoalNote,
  GoalNoteKind,
  GoalPlan,
  LifeBookChapter,
  MemoryConnection,
  MemoryMovieStoryboard,
  SavedDecision,
  VisionBoardItemV5,
  VisionCategory,
} from '../../types/phase5-life-os';
import { getLifeOSStore, LIFE_OS_KEYS } from './life-os-store';
import { computeCoachScore } from './coach-score-service';
import { buildMemoryConnections, findRelevantCallback } from './memory-connections-service';
import { generateLifeBookChapter } from './life-book-service';
import { simulateDecision } from './decision-simulator-service';
import { runDebate } from './debate-mode-service';

export class Phase5LifeOSService {
  private readonly store;

  constructor(
    private readonly storage: IStorageService,
    private readonly repositories?: VoxaRepositories,
  ) {
    this.store = getLifeOSStore(storage);
  }

  // ─── Goal Planner ─────────────────────────────────────────────

  async getGoalPlan(userId: EntityId, goalId: EntityId): Promise<GoalPlan | null> {
    const map = (await this.storage.getItem<Record<string, Record<string, GoalPlan>>>(LIFE_OS_KEYS.goalPlans)) ?? {};
    return map[userId]?.[goalId] ?? null;
  }

  private async saveGoalPlan(plan: GoalPlan): Promise<GoalPlan> {
    const map = (await this.storage.getItem<Record<string, Record<string, GoalPlan>>>(LIFE_OS_KEYS.goalPlans)) ?? {};
    if (!map[plan.userId]) map[plan.userId] = {};
    map[plan.userId][plan.goalId] = plan;
    await this.storage.setItem(LIFE_OS_KEYS.goalPlans, map);
    return plan;
  }

  async createGoalWithPlan(input: {
    userId: EntityId;
    title: string;
    description?: string;
    category?: GoalCategory;
    outcome?: string;
  }): Promise<{ goal: Goal; plan: GoalPlan }> {
    if (!this.repositories) throw new Error('Goals repository unavailable');
    const goal = await this.repositories.goals.createGoal({
      userId: input.userId,
      title: input.title,
      description: input.description,
      category: input.category ?? 'general',
    });
    const plan = await this.buildInitialPlan(goal, input.outcome);
    return { goal, plan };
  }

  async buildInitialPlan(goal: Goal, outcome?: string): Promise<GoalPlan> {
    const plan: GoalPlan = {
      goalId: goal.id,
      userId: goal.userId,
      outcome: outcome ?? `Achieve: ${goal.title}`,
      monthlyTargets: [`Make measurable progress on ${goal.title}`],
      weeklyTargets: [`Take one concrete step toward ${goal.title}`],
      todaysAction: `Define the very next small action for "${goal.title}"`,
      obstacles: ['Time pressure', 'Unclear next step'],
      successCriteria: [`You can describe progress on ${goal.title} in your own words`],
      coachInsight: 'Start small — consistency matters more than intensity.',
      updatedAt: nowIso(),
    };
    await this.saveGoalPlan(plan);
    const milestone = await this.addMilestone(goal.userId, goal.id, {
      title: 'First milestone',
      description: 'Complete your first meaningful step',
    });
    void milestone;
    return plan;
  }

  async updateGoalPlan(userId: EntityId, goalId: EntityId, patch: Partial<GoalPlan>): Promise<GoalPlan> {
    const existing = (await this.getGoalPlan(userId, goalId)) ?? {
      goalId,
      userId,
      outcome: '',
      monthlyTargets: [],
      weeklyTargets: [],
      obstacles: [],
      successCriteria: [],
      updatedAt: nowIso(),
    };
    const updated = { ...existing, ...patch, goalId, userId, updatedAt: nowIso() };
    return this.saveGoalPlan(updated);
  }

  async listMilestones(userId: EntityId, goalId: EntityId): Promise<GoalMilestone[]> {
    const all = await this.store.listByGoal<GoalMilestone & { userId: EntityId }>(LIFE_OS_KEYS.goalMilestones, userId, goalId);
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async addMilestone(userId: EntityId, goalId: EntityId, input: { title: string; description?: string; targetDate?: string }): Promise<GoalMilestone> {
    const existing = await this.listMilestones(userId, goalId);
    const milestone: GoalMilestone = {
      id: createUuid(),
      goalId,
      userId,
      title: input.title,
      description: input.description,
      targetDate: input.targetDate,
      status: 'pending',
      sortOrder: existing.length,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.goalMilestones, milestone);
  }

  async updateMilestone(userId: EntityId, milestone: GoalMilestone): Promise<GoalMilestone> {
    return this.store.upsert(LIFE_OS_KEYS.goalMilestones, { ...milestone, updatedAt: nowIso() });
  }

  async listGoalNotes(userId: EntityId, goalId: EntityId): Promise<GoalNote[]> {
    return this.store.listByGoal<GoalNote & { userId: EntityId }>(LIFE_OS_KEYS.goalNotes, userId, goalId);
  }

  async addGoalNote(userId: EntityId, goalId: EntityId, kind: GoalNoteKind, body: string): Promise<GoalNote> {
    const note: GoalNote = { id: createUuid(), goalId, userId, kind, body, createdAt: nowIso() };
    return this.store.upsert(LIFE_OS_KEYS.goalNotes, note);
  }

  async pauseGoal(userId: EntityId, goalId: EntityId): Promise<Goal | null> {
    if (!this.repositories) return null;
    return this.repositories.goals.updateGoal(goalId, { status: 'paused' });
  }

  async resumeGoal(userId: EntityId, goalId: EntityId): Promise<Goal | null> {
    if (!this.repositories) return null;
    return this.repositories.goals.updateGoal(goalId, { status: 'active' });
  }

  async completeGoal(userId: EntityId, goalId: EntityId): Promise<Goal | null> {
    if (!this.repositories) return null;
    const goal = await this.repositories.goals.updateGoal(goalId, { status: 'completed', progress: 100 });
    if (goal) {
      const { getRelationshipGrowthService } = await import('../relationship/relationship-growth-service');
      void getRelationshipGrowthService(this.storage, this.repositories)
        .recordGoalCompleted(userId)
        .catch(() => undefined);
    }
    return goal;
  }

  // ─── Future Self ──────────────────────────────────────────────

  async getFutureSelf(userId: EntityId): Promise<FutureSelfProfile | null> {
    return this.store.getOne<FutureSelfProfile>(LIFE_OS_KEYS.futureSelf, userId);
  }

  async saveFutureSelf(userId: EntityId, patch: Partial<FutureSelfProfile>): Promise<FutureSelfProfile> {
    const existing = (await this.getFutureSelf(userId)) ?? {
      id: createUuid(),
      userId,
      values: [],
      achievements: [],
      habitsToBuild: [],
      habitsToReduce: [],
      identityStatement: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const profile = { ...existing, ...patch, userId, updatedAt: nowIso() };
    const saved = await this.store.upsertOne(LIFE_OS_KEYS.futureSelf, userId, profile);
    const isFirst = !existing.updatedAt || existing.identityStatement === '';
    if (isFirst && (patch.identityStatement || patch.values?.length)) {
      const { getAchievementTriggersService } = await import('../phase10/achievement-triggers-service');
      void getAchievementTriggersService(this.storage).onFutureSelfSaved(userId);
    }
    return saved;
  }

  async getFutureSelfComparison(userId: EntityId): Promise<{
    currentFocus: string;
    futureIdentity: string;
    habitsToBuild: string[];
    habitsToReduce: string[];
    oneActionToday: string;
    disclaimer: string;
  }> {
    const profile = await this.getFutureSelf(userId);
    const goals = this.repositories ? await this.repositories.goals.listActiveGoals(userId) : [];
    const currentFocus = goals[0]?.title ?? 'Building your direction';
    return {
      currentFocus,
      futureIdentity: profile?.identityStatement ?? 'Define who you are becoming',
      habitsToBuild: profile?.habitsToBuild ?? [],
      habitsToReduce: profile?.habitsToReduce ?? [],
      oneActionToday: profile?.habitsToBuild[0]
        ? `Take one small step toward: ${profile.habitsToBuild[0]}`
        : 'Write one sentence about who you want to become',
      disclaimer: 'This is a reflection and coaching exercise — not a prediction of the future.',
    };
  }

  // ─── Vision Board ─────────────────────────────────────────────

  async listVisionItems(userId: EntityId): Promise<VisionBoardItemV5[]> {
    const items = await this.store.list<VisionBoardItemV5>(LIFE_OS_KEYS.visionBoard, userId);
    return items.filter((i) => i.status !== 'archived').sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  async addVisionItem(userId: EntityId, input: {
    title: string;
    description?: string;
    category?: VisionCategory;
    imageUri?: string;
    quote?: string;
    personalReason?: string;
  }): Promise<VisionBoardItemV5> {
    const items = await this.listVisionItems(userId);
    const item: VisionBoardItemV5 = {
      id: createUuid(),
      userId,
      title: input.title,
      description: input.description,
      quote: input.quote,
      category: input.category ?? 'custom',
      imageUri: input.imageUri,
      progress: 0,
      personalReason: input.personalReason,
      pinned: false,
      sortOrder: items.length,
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.visionBoard, item);
  }

  async updateVisionItem(item: VisionBoardItemV5): Promise<VisionBoardItemV5> {
    return this.store.upsert(LIFE_OS_KEYS.visionBoard, { ...item, updatedAt: nowIso() });
  }

  async deleteVisionItem(userId: EntityId, id: EntityId): Promise<void> {
    await this.store.remove(LIFE_OS_KEYS.visionBoard, userId, id);
  }

  async convertVisionToGoal(userId: EntityId, visionId: EntityId): Promise<Goal | null> {
    if (!this.repositories) return null;
    const item = await this.store.get<VisionBoardItemV5>(LIFE_OS_KEYS.visionBoard, userId, visionId);
    if (!item) return null;
    const { goal } = await this.createGoalWithPlan({
      userId,
      title: item.title,
      description: item.description ?? item.personalReason,
      category: 'general',
      outcome: item.personalReason,
    });
    await this.updateVisionItem({ ...item, linkedGoalId: goal.id });
    return goal;
  }

  // ─── Bucket List ──────────────────────────────────────────────

  async listBucketItems(userId: EntityId): Promise<BucketListItemV5[]> {
    const items = await this.store.list<BucketListItemV5>(LIFE_OS_KEYS.bucketList, userId);
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async addBucketItem(userId: EntityId, input: {
    title: string;
    description?: string;
    category?: string;
    personalMeaning?: string;
  }): Promise<BucketListItemV5> {
    const items = await this.listBucketItems(userId);
    const item: BucketListItemV5 = {
      id: createUuid(),
      userId,
      title: input.title,
      description: input.description,
      category: input.category ?? 'general',
      priority: 3,
      status: 'idea',
      progress: 0,
      personalMeaning: input.personalMeaning,
      sortOrder: items.length,
      progressNotes: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.bucketList, item);
  }

  async updateBucketItem(item: BucketListItemV5): Promise<BucketListItemV5> {
    return this.store.upsert(LIFE_OS_KEYS.bucketList, { ...item, updatedAt: nowIso() });
  }

  async deleteBucketItem(userId: EntityId, id: EntityId): Promise<void> {
    await this.store.remove(LIFE_OS_KEYS.bucketList, userId, id);
  }

  async completeBucketItem(userId: EntityId, id: EntityId, memoryContent?: string): Promise<BucketListItemV5 | null> {
    const item = await this.store.get<BucketListItemV5>(LIFE_OS_KEYS.bucketList, userId, id);
    if (!item) return null;
    let completionMemoryId: EntityId | undefined;
    if (this.repositories && memoryContent) {
      const memory = await this.repositories.memories.createMemory({
        userId,
        category: 'moments',
        title: `Completed: ${item.title}`,
        content: memoryContent,
        source: 'manual',
        importance: 4,
        confidence: 0.9,
      });
      completionMemoryId = memory.id;
    }
    return this.updateBucketItem({
      ...item,
      status: 'completed',
      progress: 100,
      completionMemoryId,
    }).then(async (updated) => {
      const { getAchievementTriggersService } = await import('../phase10/achievement-triggers-service');
      void getAchievementTriggersService(this.storage).onBucketItemComplete(userId);
      return updated;
    });
  }

  async convertBucketToGoal(userId: EntityId, bucketId: EntityId): Promise<Goal | null> {
    if (!this.repositories) return null;
    const item = await this.store.get<BucketListItemV5>(LIFE_OS_KEYS.bucketList, userId, bucketId);
    if (!item) return null;
    const { goal } = await this.createGoalWithPlan({
      userId,
      title: item.title,
      description: item.description ?? item.personalMeaning,
      outcome: item.personalMeaning,
    });
    await this.updateBucketItem({ ...item, linkedGoalId: goal.id, status: 'planned' });
    return goal;
  }

  // ─── Dream Journal ────────────────────────────────────────────

  async listDreams(userId: EntityId, limit = 50): Promise<DreamEntry[]> {
    const dreams = await this.store.list<DreamEntry>(LIFE_OS_KEYS.dreamEntries, userId);
    return dreams.slice(0, limit);
  }

  async addDream(userId: EntityId, input: {
    body: string;
    mood?: string;
    people?: string[];
    places?: string[];
    themes?: string[];
    recurring?: boolean;
    isPrivate?: boolean;
    voiceNoteUri?: string;
  }): Promise<DreamEntry> {
    const themes = input.themes ?? extractDreamThemes(input.body);
    const entry: DreamEntry = {
      id: createUuid(),
      userId,
      body: input.body,
      mood: input.mood,
      people: input.people ?? [],
      places: input.places ?? [],
      themes,
      recurring: input.recurring ?? false,
      isPrivate: input.isPrivate ?? true,
      voiceNoteUri: input.voiceNoteUri,
      summary: input.body.length > 120 ? `${input.body.slice(0, 117)}…` : input.body,
      savedAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.dreamEntries, entry);
  }

  async deleteDream(userId: EntityId, id: EntityId): Promise<void> {
    await this.store.remove(LIFE_OS_KEYS.dreamEntries, userId, id);
  }

  async getRecurringThemes(userId: EntityId): Promise<Array<{ theme: string; count: number }>> {
    const dreams = await this.listDreams(userId, 100);
    const counts = new Map<string, number>();
    for (const dream of dreams) {
      for (const theme of dream.themes) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([theme, count]) => ({ theme, count }))
      .filter((t) => t.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  // ─── Decision Simulator ─────────────────────────────────────────

  async listDecisions(userId: EntityId): Promise<SavedDecision[]> {
    return this.store.list<SavedDecision>(LIFE_OS_KEYS.savedDecisions, userId);
  }

  async createDecision(userId: EntityId, question: string, values?: string[]): Promise<SavedDecision> {
    const futureSelf = await this.getFutureSelf(userId);
    const goals = this.repositories ? await this.repositories.goals.listActiveGoals(userId) : [];
    const decision = simulateDecision({
      question,
      values: values ?? futureSelf?.values ?? [],
      goals: goals.map((g) => g.title),
    });
    const saved: SavedDecision = {
      id: createUuid(),
      userId,
      question,
      options: decision.options,
      recommendedNextStep: decision.recommendedNextStep,
      caution: decision.caution,
      status: 'open',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.savedDecisions, saved);
  }

  async updateDecision(decision: SavedDecision): Promise<SavedDecision> {
    return this.store.upsert(LIFE_OS_KEYS.savedDecisions, { ...decision, updatedAt: nowIso() });
  }

  // ─── Debate Mode ──────────────────────────────────────────────

  async runDebate(userId: EntityId, topic: string, perspective: DebatePerspective): Promise<DebateResult> {
    const result = runDebate(topic, perspective);
    const saved: DebateResult = { id: createUuid(), userId, topic, perspective, ...result, createdAt: nowIso() };
    return this.store.upsert(LIFE_OS_KEYS.debateResults, saved);
  }

  // ─── Coach Score ──────────────────────────────────────────────

  async getCoachScore(userId: EntityId, routinePercent?: number): Promise<CoachScoreSnapshot> {
    const cached = await this.store.getOne<CoachScoreSnapshot>(LIFE_OS_KEYS.coachScores, userId);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (cached && new Date(cached.computedAt).getTime() > oneHourAgo) return cached;

    const goals = this.repositories ? await this.repositories.goals.listGoals(userId) : [];
    const memories = this.repositories ? await this.repositories.memories.listMemories(userId) : [];
    const dreams = await this.listDreams(userId, 20);
    const bucket = await this.listBucketItems(userId);
    const snapshot = computeCoachScore({
      userId,
      goals,
      memories,
      dreamCount: dreams.length,
      bucketCompleted: bucket.filter((b) => b.status === 'completed').length,
      routinePercent,
    });
    await this.store.upsertOne(LIFE_OS_KEYS.coachScores, userId, snapshot);
    return snapshot;
  }

  async toggleCoachDomain(userId: EntityId, domain: string, hidden: boolean): Promise<CoachScoreSnapshot> {
    const snapshot = await this.getCoachScore(userId);
    const scores = snapshot.scores.map((s) => (s.domain === domain ? { ...s, hidden } : s));
    const updated = { ...snapshot, scores, computedAt: nowIso() };
    return this.store.upsertOne(LIFE_OS_KEYS.coachScores, userId, updated);
  }

  // ─── Memory Connections ─────────────────────────────────────────

  async listMemoryConnections(userId: EntityId): Promise<MemoryConnection[]> {
    return this.store.list<MemoryConnection>(LIFE_OS_KEYS.memoryConnections, userId);
  }

  async refreshMemoryConnections(userId: EntityId): Promise<MemoryConnection[]> {
    if (!this.repositories) return [];
    const memories = await this.repositories.memories.listMemories(userId);
    const goals = await this.repositories.goals.listGoals(userId);
    const dreams = await this.listDreams(userId, 30);
    const bucket = await this.listBucketItems(userId);
    const vision = await this.listVisionItems(userId);
    const connections = buildMemoryConnections({ userId, memories, goals, dreams, bucket, vision });
    const map = (await this.storage.getItem<Record<string, MemoryConnection[]>>(LIFE_OS_KEYS.memoryConnections)) ?? {};
    map[userId] = connections;
    await this.storage.setItem(LIFE_OS_KEYS.memoryConnections, map);
    return connections;
  }

  async findMemoryCallback(userId: EntityId, emotion: string): Promise<{ text: string; confidence: string } | null> {
    const connections = await this.listMemoryConnections(userId);
    if (connections.length === 0) {
      await this.refreshMemoryConnections(userId);
    }
    const refreshed = await this.listMemoryConnections(userId);
    if (!this.repositories) return null;
    const memories = await this.repositories.memories.listMemories(userId);
    return findRelevantCallback(emotion, refreshed, memories);
  }

  // ─── Life Book ────────────────────────────────────────────────

  async listLifeBookChapters(userId: EntityId): Promise<LifeBookChapter[]> {
    const chapters = await this.store.list<LifeBookChapter>(LIFE_OS_KEYS.lifeBookChapters, userId);
    return chapters.sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async getOrGenerateChapter(userId: EntityId, year: number, month: number): Promise<LifeBookChapter> {
    const existing = (await this.listLifeBookChapters(userId)).find((c) => c.year === year && c.month === month);
    if (existing) return existing;

    const goals = this.repositories ? await this.repositories.goals.listGoals(userId) : [];
    const memories = this.repositories ? await this.repositories.memories.listMemories(userId) : [];
    const dreams = await this.listDreams(userId, 30);
    const bucket = await this.listBucketItems(userId);
    const vision = await this.listVisionItems(userId);
    const decisions = await this.listDecisions(userId);

    const chapter = generateLifeBookChapter({
      userId,
      year,
      month,
      goals,
      memories,
      dreams,
      bucket,
      vision,
      decisions,
    });
    const saved = await this.store.upsert(LIFE_OS_KEYS.lifeBookChapters, chapter);
    const chapters = await this.store.list<LifeBookChapter>(LIFE_OS_KEYS.lifeBookChapters, userId);
    if (chapters.length === 1) {
      const { getAchievementTriggersService } = await import('../phase10/achievement-triggers-service');
      void getAchievementTriggersService(this.storage).onLifeBookChapter(userId);
    }
    return saved;
  }

  async updateLifeBookChapter(chapter: LifeBookChapter): Promise<LifeBookChapter> {
    return this.store.upsert(LIFE_OS_KEYS.lifeBookChapters, chapter);
  }

  async deleteLifeBookChapter(userId: EntityId, id: EntityId): Promise<void> {
    await this.store.remove(LIFE_OS_KEYS.lifeBookChapters, userId, id);
  }

  // ─── Memory Movie ─────────────────────────────────────────────

  async listStoryboards(userId: EntityId): Promise<MemoryMovieStoryboard[]> {
    return this.store.list<MemoryMovieStoryboard>(LIFE_OS_KEYS.memoryMovie, userId);
  }

  async generateStoryboard(userId: EntityId, title: string): Promise<MemoryMovieStoryboard> {
    const memories = this.repositories ? await this.repositories.memories.listMemories(userId) : [];
    const photoMemories = memories.filter((m) => m.tags?.includes('photo-memory')).slice(0, 8);
    const moments = memories.filter((m) => (m.importance ?? 0) >= 4).slice(0, 6);
    const selected = photoMemories.length > 0 ? photoMemories : moments;

    const scenes = selected.map((m, i) => ({
      id: createUuid(),
      title: m.title,
      narration: m.content.slice(0, 200),
      photoUri: m.tags?.includes('photo-memory') ? m.content : undefined,
      memoryId: m.id,
      durationSec: 5,
    }));

    const storyboard: MemoryMovieStoryboard = {
      id: createUuid(),
      userId,
      title,
      scenes,
      totalDurationSec: scenes.length * 5,
      musicPlaceholder: 'ambient',
      exportStatus: 'preview_only',
      createdAt: nowIso(),
    };
    return this.store.upsert(LIFE_OS_KEYS.memoryMovie, storyboard);
  }

  // ─── Talk commands ────────────────────────────────────────────

  async handleTalkCommand(userId: EntityId, message: string): Promise<{ handled: boolean; reply: string }> {
    const lower = message.toLowerCase().trim();

    const bucketMatch = lower.match(/add (.+) to (?:my )?bucket list/);
    if (bucketMatch) {
      const item = await this.addBucketItem(userId, { title: capitalize(bucketMatch[1]) });
      return { handled: true, reply: `Added "${item.title}" to your bucket list.` };
    }

    const completeMatch = lower.match(/mark (.+) complete/);
    if (completeMatch) {
      const items = await this.listBucketItems(userId);
      const target = items.find((i) => i.title.toLowerCase().includes(completeMatch[1]));
      if (target) {
        await this.completeBucketItem(userId, target.id, `Completed: ${target.title}`);
        return { handled: true, reply: `Marked "${target.title}" as complete — a milestone for your journey.` };
      }
    }

    const planMatch = lower.match(/help me plan (?:this dream|(.+))/);
    if (planMatch) {
      const title = planMatch[1] ? capitalize(planMatch[1]) : 'your dream';
      const items = await this.listBucketItems(userId);
      const target = items.find((i) => i.title.toLowerCase().includes(planMatch[1]?.toLowerCase() ?? '')) ?? items[0];
      if (target) {
        await this.updateBucketItem({ ...target, status: 'planned' as BucketStatus });
        return {
          handled: true,
          reply: `Let's plan "${target.title}". What's the first small step you could take this month?`,
        };
      }
      return { handled: true, reply: `Tell me more about ${title} and I'll help you break it into steps.` };
    }

    return { handled: false, reply: '' };
  }
}

function extractDreamThemes(body: string): string[] {
  const themes: string[] = [];
  const keywords = ['water', 'flying', 'chase', 'family', 'work', 'school', 'travel', 'fear', 'love', 'home'];
  const lower = body.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) themes.push(kw);
  }
  return themes.slice(0, 5);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

let instance: Phase5LifeOSService | null = null;

export function getPhase5LifeOSService(storage: IStorageService, repositories?: VoxaRepositories): Phase5LifeOSService {
  if (!instance) instance = new Phase5LifeOSService(storage, repositories);
  return instance;
}
