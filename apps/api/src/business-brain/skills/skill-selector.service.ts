import { Injectable } from '@nestjs/common';
import { OyincaSkill, OyincaSkillRegistry } from '@marketing-os/oyinca-skills';
@Injectable()
export class SkillSelectorService {
  private readonly registry = new OyincaSkillRegistry();
  select(objective: string): OyincaSkill {
    const value = objective.toLowerCase();
    const id = value.includes('competitor') ? 'strategy.competitor_analysis'
      : value.includes('campaign') ? 'strategy.campaign_planning'
      : value.includes('experiment') || value.includes('test ') ? 'growth.experiment_design'
      : value.includes('position') ? 'marketing.positioning'
      : value.includes('customer research') || value.includes('audience research') ? 'marketing.customer_research'
      : value.includes('repurpose') ? 'content.repurpose'
      : value.includes('hook') ? 'content.generate_hook'
      : value.includes('strategy') || value.includes('ideas') ? 'growth.content_strategy'
      : 'content.generate_caption';
    return this.registry.get(id)!;
  }
  get(id: string): OyincaSkill | undefined { return this.registry.get(id); }
}
