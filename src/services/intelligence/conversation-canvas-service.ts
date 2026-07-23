import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';
import { ConversationCanvas, ConversationCanvasSection } from '../../types/phase4-intelligence';
import { EntityId, createUuid, nowIso } from '../../types';

const LARGE_TOPIC =
  /\b(start(ing)? a business|launch|startup|project plan|move house|wedding|career change|exam prep|build an app|life plan)\b/i;

const SECTION_TEMPLATES: Array<{ id: string; title: string }> = [
  { id: 'goals', title: 'Goals' },
  { id: 'timeline', title: 'Timeline' },
  { id: 'ideas', title: 'Ideas' },
  { id: 'tasks', title: 'Tasks' },
  { id: 'risks', title: 'Risks' },
  { id: 'resources', title: 'Resources' },
  { id: 'next', title: 'Next actions' },
];

export class ConversationCanvasService {
  constructor(private readonly storage?: IStorageService) {}

  isLargeTopic(text: string): boolean {
    return LARGE_TOPIC.test(text) || text.split(/\s+/).length >= 40;
  }

  detectTopic(text: string): string | null {
    const match = text.match(LARGE_TOPIC);
    if (match) return match[0];
    if (/\bplan\b/i.test(text)) return 'Your plan';
    return null;
  }

  async getCanvas(conversationId: EntityId): Promise<ConversationCanvas | null> {
    if (!this.storage) return null;
    const all = (await this.storage.getItem<Record<string, ConversationCanvas>>(STORAGE_KEYS.conversationCanvases)) ?? {};
    return all[conversationId] ?? null;
  }

  async updateFromExchange(input: {
    conversationId: EntityId;
    userMessage: string;
    voxaReply: string;
  }): Promise<ConversationCanvas | null> {
    if (!this.storage) return null;

    const topic = this.detectTopic(input.userMessage) ?? this.detectTopic(input.voxaReply);
    if (!topic && !this.isLargeTopic(input.userMessage)) {
      return this.getCanvas(input.conversationId);
    }

    const existing = await this.getCanvas(input.conversationId);
    const sections = existing?.sections ?? this.emptySections();
    const updated = this.extractIntoSections(sections, input.userMessage, input.voxaReply);

    const canvas: ConversationCanvas = {
      id: existing?.id ?? createUuid(),
      conversationId: input.conversationId,
      topic: topic ?? existing?.topic ?? 'Big topic',
      sections: updated,
      progressPercent: this.computeProgress(updated),
      updatedAt: nowIso(),
    };

    const all = (await this.storage.getItem<Record<string, ConversationCanvas>>(STORAGE_KEYS.conversationCanvases)) ?? {};
    all[input.conversationId] = canvas;
    await this.storage.setItem(STORAGE_KEYS.conversationCanvases, all);
    return canvas;
  }

  private emptySections(): ConversationCanvasSection[] {
    return SECTION_TEMPLATES.map((s) => ({ id: s.id, title: s.title, items: [] }));
  }

  private extractIntoSections(
    sections: ConversationCanvasSection[],
    userMessage: string,
    voxaReply: string,
  ): ConversationCanvasSection[] {
    const next = sections.map((s) => ({ ...s, items: [...s.items] }));
    const bullets = voxaReply.match(/^[\s]*[-•*]\s+(.+)$/gm) ?? [];
    const tasks = bullets.map((b) => b.replace(/^[\s]*[-•*]\s+/, '').trim()).filter(Boolean);

    if (tasks.length > 0) {
      const taskSection = next.find((s) => s.id === 'tasks');
      if (taskSection) taskSection.items = unique([...taskSection.items, ...tasks]).slice(0, 8);
    }

    if (/goal|aim|want to/.test(userMessage.toLowerCase())) {
      const goalSection = next.find((s) => s.id === 'goals');
      if (goalSection) goalSection.items = unique([...goalSection.items, userMessage.slice(0, 100)]).slice(0, 5);
    }

    if (/risk|worry|concern|blocker/.test(`${userMessage} ${voxaReply}`.toLowerCase())) {
      const riskSection = next.find((s) => s.id === 'risks');
      const line = userMessage.length < 120 ? userMessage : userMessage.slice(0, 120);
      if (riskSection) riskSection.items = unique([...riskSection.items, line]).slice(0, 5);
    }

    const nextActions = voxaReply
      .split(/(?<=[.!?])\s+/)
      .filter((s) => /try|start|next|first|tomorrow|schedule/i.test(s))
      .slice(0, 2);
    if (nextActions.length) {
      const nextSection = next.find((s) => s.id === 'next');
      if (nextSection) nextSection.items = unique([...nextSection.items, ...nextActions]).slice(0, 5);
    }

    return next;
  }

  private computeProgress(sections: ConversationCanvasSection[]): number {
    const filled = sections.filter((s) => s.items.length > 0).length;
    return Math.round((filled / sections.length) * 100);
  }
}

function unique(items: string[]) {
  return [...new Set(items)];
}

let instance: ConversationCanvasService | null = null;

export function getConversationCanvasService(storage?: IStorageService) {
  if (!instance || storage) instance = new ConversationCanvasService(storage);
  return instance;
}

export const conversationCanvasService = new ConversationCanvasService();
