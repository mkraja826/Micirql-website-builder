import type { AuditSink, RateLimiter } from "./types";

export function createMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async consume({ key, limit, windowSeconds }) {
      const now = Date.now();
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return { allowed: true, remaining: Math.max(0, limit - 1) };
      }
      if (current.count >= limit) return { allowed: false, remaining: 0 };
      current.count += 1;
      return { allowed: true, remaining: Math.max(0, limit - current.count) };
    },
  };
}

export function createMemoryAuditSink(target: Array<Record<string, unknown>>): AuditSink {
  return {
    async write(event) {
      target.push({ ...event });
    },
  };
}
