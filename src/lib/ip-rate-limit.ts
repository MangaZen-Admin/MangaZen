type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

const PRUNE_EVERY = 500;
let ops = 0;

function pruneOld(now: number, windowMs: number): void {
  ops += 1;
  if (ops % PRUNE_EVERY !== 0) return;
  const cutoff = now - windowMs * 2;
  for (const [k, b] of buckets) {
    if (b.windowStart < cutoff) buckets.delete(k);
  }
}

/**
 * Rate limit fijo en memoria (por instancia). Para producción multi-instancia, sustituir por Redis/Upstash.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  pruneOld(now, windowMs);

  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count >= maxRequests) {
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - b.windowStart)) };
  }
  b.count += 1;
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
