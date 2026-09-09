import type { ContextSection } from '@marketing-os/oyinca-skills';

export type BrainTaskType = 'generate_caption';
export type OyincaResourceUri =
  | 'oyinca://task/current'
  | 'oyinca://brand/identity'
  | 'oyinca://brand/audience'
  | 'oyinca://brand/content-preferences'
  | 'oyinca://brand/strategy'
  | 'oyinca://platforms/mounted'
  | 'oyinca://memory/learnings';

export interface ContextRequest {
  organizationId: string;
  brandId: string;
  task: BrainTaskType;
  objective: string;
  taskContext: { topic: string; platform: string; tone: string };
}

export interface ResolvedContextItem {
  uri: OyincaResourceUri;
  section: ContextSection | 'task';
  content: string;
  sourceIds: string[];
  reasonSelected: string;
  confidence?: number;
  capturedAt?: string;
  expiresAt?: string;
}

export interface ResolvedContextPackage {
  task: BrainTaskType;
  organizationId: string;
  brandId: string;
  objective: string;
  items: ResolvedContextItem[];
  budgetCharacters: number;
  characterCount: number;
  omittedSections: string[];
  assembledAt: string;
}
