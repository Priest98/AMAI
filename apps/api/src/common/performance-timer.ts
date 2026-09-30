import { Logger } from '@nestjs/common';

export class PerformanceTimer {
  private readonly startedAt = performance.now();
  private readonly marks: Record<string, number> = {};

  constructor(
    private readonly label: string,
    private readonly logger: Logger,
  ) {}

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    try {
      return await operation();
    } finally {
      this.marks[name] = Math.round(performance.now() - startedAt);
    }
  }

  finish(extra: Record<string, string | number | boolean> = {}): void {
    const requestTotal = Math.round(performance.now() - this.startedAt);
    this.logger.log(`[PERF] ${JSON.stringify({ label: this.label, ...this.marks, ...extra, requestTotal })}`);
  }
}
