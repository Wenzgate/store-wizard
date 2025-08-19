/**
 * Token-bucket rate limiter (in-memory, per-IP) — dev-grade.
 * Use behind a reverse proxy that forwards the client IP via X-Forwarded-For.
 *
 * Example:
 *   const { allowed, remaining, retryAfterMs } = await rateLimiter.consume(ip, 1);
 *   if (!allowed) return tooMany(retryAfterMs);
 */

type Bucket = {
    tokens: number;
    lastRefill: number; // epoch ms
  };
  
  export interface RateLimiterOptions {
    capacity: number;           // max tokens in bucket
    refillPerInterval: number;  // tokens added each interval
    intervalMs: number;         // interval length
  }
  
  export interface ConsumeResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs?: number;
  }
  
  export class TokenBucketLimiter {
    private readonly capacity: number;
    private readonly refillPerInterval: number;
    private readonly intervalMs: number;
    private readonly buckets = new Map<string, Bucket>();
  
    constructor(opts: RateLimiterOptions) {
      this.capacity = Math.max(1, opts.capacity);
      this.refillPerInterval = Math.max(1, opts.refillPerInterval);
      this.intervalMs = Math.max(250, opts.intervalMs);
    }
  
    private refill(bucket: Bucket, now: number) {
      const elapsed = now - bucket.lastRefill;
      if (elapsed <= 0) return;
      const intervals = Math.floor(elapsed / this.intervalMs);
      if (intervals <= 0) return;
      const add = intervals * this.refillPerInterval;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + add);
      bucket.lastRefill += intervals * this.intervalMs;
    }
  
    async consume(key: string, tokens = 1): Promise<ConsumeResult> {
      const now = Date.now();
      let b = this.buckets.get(key);
      if (!b) {
        b = { tokens: this.capacity, lastRefill: now };
        this.buckets.set(key, b);
      }
  
      this.refill(b, now);
  
      if (b.tokens >= tokens) {
        b.tokens -= tokens;
        return { allowed: true, remaining: b.tokens };
      }
  
      // compute retry-after based on deficit
      const deficit = tokens - b.tokens;
      // how many intervals to accumulate enough tokens?
      const intervalsNeeded = Math.ceil(deficit / this.refillPerInterval);
      const retryAfterMs = intervalsNeeded * this.intervalMs;
      return { allowed: false, remaining: b.tokens, retryAfterMs };
    }
  }
  
  // Default limiter: burst 20, refill 10 tokens every 60s
  export const rateLimiter = new TokenBucketLimiter({
    capacity: 20,
    refillPerInterval: 10,
    intervalMs: 60_000,
  });
  
  /** Extract best-effort client IP from a Request */
  export function ipFromRequest(req: Request): string {
    
    const hdr = typeof req.headers?.get === "function" ? req.headers : new Headers();
    const xfwd = hdr.get("x-forwarded-for");
    if (xfwd) return xfwd.split(",")[0].trim();
    const realIp = hdr.get("x-real-ip");
    if (realIp) return realIp.trim();
    // next/edge runtimes may expose req.ip, but not standard; fallback:
    return "0.0.0.0";
  }
  