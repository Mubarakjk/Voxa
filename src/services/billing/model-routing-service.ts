export type ModelTask =
  | 'ordinary_conversation'
  | 'deep_planning'
  | 'memory_extraction'
  | 'classification'
  | 'image_analysis'
  | 'weekly_letter'
  | 'sports_explanation';

export type ModelRoute = {
  provider: 'openai';
  model: string;
  timeoutMs: number;
  fallbackModel?: string;
};

const MODEL_ROUTES: Record<ModelTask, ModelRoute> = {
  ordinary_conversation: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 30000,
    fallbackModel: 'gpt-4o-mini',
  },
  deep_planning: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_PRO_MODEL?.trim() || 'gpt-4o',
    timeoutMs: 45000,
    fallbackModel: 'gpt-4o-mini',
  },
  memory_extraction: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_STRUCTURED_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 20000,
  },
  classification: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_CLASSIFIER_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 10000,
  },
  image_analysis: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 35000,
  },
  weekly_letter: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_LETTER_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 40000,
  },
  sports_explanation: {
    provider: 'openai',
    model: process.env.EXPO_PUBLIC_OPENAI_SPORTS_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: 20000,
  },
};

import { areAllFeaturesUnlocked } from '../../config/launch-mode';

export class ModelRoutingService {
  resolve(task: ModelTask, isPro = false): ModelRoute {
    if (task === 'deep_planning' && !isPro && !areAllFeaturesUnlocked()) {
      return MODEL_ROUTES.ordinary_conversation;
    }
    return MODEL_ROUTES[task];
  }

  resolveWithFallback(task: ModelTask, isPro = false): ModelRoute[] {
    const primary = this.resolve(task, isPro);
    const routes = [primary];
    if (primary.fallbackModel && primary.fallbackModel !== primary.model) {
      routes.push({ ...primary, model: primary.fallbackModel });
    }
    return routes;
  }
}

export const modelRoutingService = new ModelRoutingService();
