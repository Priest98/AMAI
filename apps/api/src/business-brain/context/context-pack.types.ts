import type { ContextSection } from '@marketing-os/oyinca-skills';
export interface ContextPackSection {
  kind: ContextSection;
  content: string;
  sourceIds: string[];
  capturedAt?: string;
  expiresAt?: string;
  confidence?: number;
  reasonSelected?: string;
}
export interface OyincaContextPack { brandId: string; objective: string; sections: ContextPackSection[]; assembledAt: string; characterCount: number; }
