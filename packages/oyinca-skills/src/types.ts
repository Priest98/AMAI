export type SkillCategory = 'content' | 'marketing' | 'growth' | 'strategy';
export type ContextSection = 'brand' | 'audience' | 'platform' | 'content' | 'market' | 'performance' | 'strategy';
export type SkillCostTier = 'low' | 'standard' | 'deep';
export interface OyincaSkill {
  id: string;
  version: string;
  category: SkillCategory;
  description: string;
  requiredContext: ContextSection[];
  costTier: SkillCostTier;
  instruction: string;
  outputContract: string;
}
