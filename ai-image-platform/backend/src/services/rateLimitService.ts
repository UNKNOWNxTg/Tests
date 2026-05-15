import { RateLimiterMemory } from 'rate-limiter-flexible';
import envConfig from '../../config/env';

class RateLimitManager {
  private limiters: Map<string, RateLimiterMemory> = new Map();

  constructor() {
    this.initLimiters();
  }

  private initLimiters(): void {
    // General API rate limiter
    this.limiters.set(
      'api',
      new RateLimiterMemory({
        points: envConfig.RATE_LIMIT_MAX_REQUESTS,
        duration: Math.floor(envConfig.RATE_LIMIT_WINDOW_MS / 1000),
      })
    );

    // Image generation rate limiter (stricter)
    this.limiters.set(
      'generation',
      new RateLimiterMemory({
        points: 5, // 5 generations per window
        duration: Math.floor(envConfig.RATE_LIMIT_WINDOW_MS / 1000),
      })
    );

    // Telegram bot rate limiter
    this.limiters.set(
      'telegram',
      new RateLimiterMemory({
        points: 20,
        duration: 60, // 20 messages per minute
      })
    );

    // Admin actions (more lenient)
    this.limiters.set(
      'admin',
      new RateLimiterMemory({
        points: 100,
        duration: 60,
      })
    );
  }

  async checkLimit(key: string, type: 'api' | 'generation' | 'telegram' | 'admin'): Promise<{
    allowed: boolean;
    remainingPoints: number;
    msBeforeNext: number;
  }> {
    const limiter = this.limiters.get(type);
    if (!limiter) {
      return { allowed: true, remainingPoints: Infinity, msBeforeNext: 0 };
    }

    try {
      const res = await limiter.consume(key);
      return {
        allowed: true,
        remainingPoints: res.remainingPoints,
        msBeforeNext: res.msBeforeNext,
      };
    } catch (error: any) {
      return {
        allowed: false,
        remainingPoints: 0,
        msBeforeNext: error.msBeforeNext || 60000,
      };
    }
  }

  async resetLimit(key: string, type: 'api' | 'generation' | 'telegram' | 'admin'): Promise<void> {
    const limiter = this.limiters.get(type);
    if (limiter) {
      await limiter.delete(key);
    }
  }

  getLimiterStats(key: string, type: 'api' | 'generation' | 'telegram' | 'admin'): Promise<{
    consumedPoints: number;
    remainingPoints: number;
  } | null> {
    const limiter = this.limiters.get(type);
    if (!limiter) return Promise.resolve(null);

    return limiter.get(key).then(res => ({
      consumedPoints: res.consumedPoints,
      remainingPoints: res.remainingPoints,
    })).catch(() => null);
  }
}

export const rateLimitManager = new RateLimitManager();
export default rateLimitManager;
