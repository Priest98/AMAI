/**
 * Bounds any promise to a maximum wait time. Vercel hard-kills a
 * serverless function the instant it hits its platform timeout — no catch
 * block runs, no fallback executes, the request just vanishes mid-flight.
 * Every external call anywhere in the AI Layer goes through this so a
 * slow/hung provider always loses to the next provider (or the caller's
 * own static fallback) well before that platform-level cutoff can fire.
 * Shared by every provider adapter and the gateway itself instead of each
 * one re-implementing its own setTimeout/race.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
