import { CapabilityProvider } from '../interfaces/capability-provider.interface';
import { MarketIntelligence, ResearchRequest } from './research.types';

export interface ResearchProvider
  extends CapabilityProvider<ResearchRequest, MarketIntelligence> {
  readonly capability: 'research';
}

