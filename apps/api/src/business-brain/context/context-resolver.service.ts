import { Injectable } from '@nestjs/common';
import type { ContextSection } from '@marketing-os/oyinca-skills';
import { ContextPackService } from './context-pack.service';
import type { ContextRequest, OyincaResourceUri, ResolvedContextItem, ResolvedContextPackage } from './context-resolver.types';

const CAPTION_BUDGET = 6_000;
const CAPTION_SECTIONS: ContextSection[] = ['brand', 'audience', 'content', 'platform', 'performance'];
const SECTION_BUDGETS: Record<ContextSection, number> = {
  brand: 2_000,
  audience: 900,
  content: 900,
  platform: 500,
  performance: 1_000,
  strategy: 800,
  market: 800,
};
const RESOURCE_BY_SECTION: Record<ContextSection, OyincaResourceUri> = {
  brand: 'oyinca://brand/identity',
  audience: 'oyinca://brand/audience',
  content: 'oyinca://brand/content-preferences',
  strategy: 'oyinca://brand/strategy',
  platform: 'oyinca://platforms/mounted',
  performance: 'oyinca://memory/learnings',
  market: 'oyinca://memory/learnings',
};

@Injectable()
export class ContextResolverService {
  constructor(private readonly packs: ContextPackService) {}

  async resolve(request: ContextRequest): Promise<ResolvedContextPackage> {
    const required = request.task === 'generate_caption' ? CAPTION_SECTIONS : [];
    const pack = await this.packs.buildScoped(request.organizationId, request.brandId, request.objective, required);
    const taskContent = `Topic: ${request.taskContext.topic}\nPlatform: ${request.taskContext.platform}\nRequested tone: ${request.taskContext.tone}`;
    const candidates: ResolvedContextItem[] = [
      {
        uri: 'oyinca://task/current', section: 'task', content: taskContent.slice(0, 700), sourceIds: [],
        reasonSelected: 'The current content topic, destination platform, and requested tone are mandatory for caption generation.',
      },
      ...pack.sections.map((section) => ({
        uri: RESOURCE_BY_SECTION[section.kind],
        section: section.kind,
        content: section.content.slice(0, SECTION_BUDGETS[section.kind]),
        sourceIds: section.sourceIds,
        reasonSelected: this.reason(section.kind),
        confidence: section.confidence,
        capturedAt: section.capturedAt,
        expiresAt: section.expiresAt,
      })),
    ];

    let remaining = CAPTION_BUDGET;
    const items = candidates.flatMap((item) => {
      if (remaining <= 0) return [];
      const content = item.content.slice(0, remaining);
      remaining -= content.length;
      return content ? [{ ...item, content }] : [];
    });
    const included = new Set(items.map((item) => item.section));
    return {
      task: request.task,
      organizationId: request.organizationId,
      brandId: request.brandId,
      objective: request.objective,
      items,
      budgetCharacters: CAPTION_BUDGET,
      characterCount: items.reduce((sum, item) => sum + item.content.length, 0),
      omittedSections: required.filter((section) => !included.has(section)),
      assembledAt: new Date().toISOString(),
    };
  }

  render(resolved: ResolvedContextPackage): string {
    return resolved.items.map((item) => `[${item.uri}]\n${item.content}`).join('\n\n');
  }

  private reason(section: ContextSection): string {
    const reasons: Record<ContextSection, string> = {
      brand: 'Brand identity, voice, products, and explicit restrictions ground the caption.',
      audience: 'Audience information changes vocabulary, framing, and relevance.',
      content: 'Content preferences define pillars, CTA, hashtag, and emoji constraints.',
      platform: 'Only currently connected platforms are treated as mounted capabilities.',
      performance: 'Evidence-backed learnings can improve the caption without loading raw history.',
      strategy: 'Strategy is selected only for tasks that need campaign or positioning context.',
      market: 'Time-sensitive external intelligence is selected only when the task requires it.',
    };
    return reasons[section];
  }
}
