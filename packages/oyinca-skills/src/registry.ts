import { CONTENT_SKILLS } from './content';
import { GROWTH_SKILLS } from './growth';
import { MARKETING_SKILLS } from './marketing';
import { STRATEGY_SKILLS } from './strategy';
import { OyincaSkill } from './types';
const DEFAULT_SKILLS = [...CONTENT_SKILLS, ...MARKETING_SKILLS, ...GROWTH_SKILLS, ...STRATEGY_SKILLS];
export class OyincaSkillRegistry {
  private readonly skills = new Map<string, OyincaSkill>();
  constructor(skills: OyincaSkill[] = DEFAULT_SKILLS) {
    for (const skill of skills) {
      if (this.skills.has(skill.id)) throw new Error(`Duplicate Oyinca skill: ${skill.id}`);
      this.skills.set(skill.id, Object.freeze({ ...skill, requiredContext: [...skill.requiredContext] }));
    }
  }
  get(id: string): OyincaSkill | undefined { return this.skills.get(id); }
  list(): OyincaSkill[] { return [...this.skills.values()]; }
}
