import { Injectable } from '@nestjs/common';
import { CapabilityKind } from './interfaces/capability-execution.types';

const ENV_BY_CAPABILITY: Record<CapabilityKind, string> = {
  research: 'MARKET_INTELLIGENCE_ENABLED',
  marketing: 'MARKETING_SKILLS_ENABLED',
  notifications: 'NOVU_ENABLED',
  analytics: 'OPENREPLAY_ENABLED',
};

/** Server-authoritative, fail-closed capability flags. */
@Injectable()
export class CapabilityFlagsService {
  isEnabled(capability: CapabilityKind): boolean {
    return process.env[ENV_BY_CAPABILITY[capability]] === 'true';
  }
}

