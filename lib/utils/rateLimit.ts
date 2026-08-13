/**
 * Simple in-memory rate limiter (spec §44: Rate Limit on Registration,
 * Login, Friend Requests, Messages, Posts, Comments, Uploads).
 *
 * Limitation: this state lives in the Node.js process's memory, so on
 * serverless platforms (Vercel) with multiple instances/regions, each
 * instance tracks its own counts — the effective limit is "N per instance"
 * not "N globally". This is fine for Z's free-tier scale; if traffic grows
 * enough to matter, swap this for a shared store like Upstash Redis
 * (`@upstash/ratelimit`) without changing any call site below.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
