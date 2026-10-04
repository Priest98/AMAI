/** One abortable deadline across downloads, response bodies, and inference. */
export async function withRequestDeadline<T>(ms: number, parent: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason ?? new Error('AI request cancelled.'));
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  let rejectAbort: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', rejectAbort, { once: true });
  });
  const timer = setTimeout(() => controller.abort(new Error(`AI request timed out after ${ms}ms`)), ms);
  try {
    controller.signal.throwIfAborted();
    return await Promise.race([run(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', rejectAbort!);
  }
}
