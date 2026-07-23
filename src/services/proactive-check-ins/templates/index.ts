export * from './template-types';
export * from './random-templates';
export * from './contextual-templates';
export * from './memory-aware-templates';

import { IProactiveCheckInTemplateProvider } from './template-types';
import { contextualProactiveTemplateProvider } from './contextual-templates';
import { memoryAwareProactiveTemplateProvider } from './memory-aware-templates';
import { randomProactiveTemplateProvider } from './random-templates';

export const proactiveCheckInTemplateProviders: IProactiveCheckInTemplateProvider[] = [
  memoryAwareProactiveTemplateProvider,
  contextualProactiveTemplateProvider,
  randomProactiveTemplateProvider,
];
