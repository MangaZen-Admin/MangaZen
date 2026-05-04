const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export function checkRateLimit(key: string): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remainingMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remainingMs: 0 };
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}
