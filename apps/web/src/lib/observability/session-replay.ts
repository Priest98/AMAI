import { initPostHog, startSessionReplay, stopSessionReplay } from '../posthog';
import { replayDecision } from './privacy-policy';

let recording = false;

export async function applySessionReplayPolicy(pathname: string): Promise<void> {
  const decision = replayDecision(pathname);
  await initPostHog();
  if (decision.allowed && !recording) {
    startSessionReplay();
    recording = true;
  } else if (!decision.allowed && recording) {
    stopSessionReplay();
    recording = false;
  }
}
