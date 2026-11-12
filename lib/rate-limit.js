import "server-only";
import { sql } from "./db";

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Per-user limits, enforced with fixed-window counters stored in Postgres so
 * they hold across serverless instances.
 */
export const LIMITS = {
  memoryWrite: { limit: 30, windowSeconds: 3600, message: "You're saving memories very quickly. Please wait a little and try again." },
  profileWrite: { limit: 60, windowSeconds: 3600, message: "Too many profile changes in a short time. Please try again later." },
  matchRefresh: { limit: 30, windowSeconds: 3600, message: "Matches were refreshed many times recently. Please try again in a while." },
  requestSend: { limit: 10, windowSeconds: 86400, message: "You can send up to 10 introduction requests per day." },
  requestRespond: { limit: 100, windowSeconds: 3600, message: "Too many actions. Please slow down." },
  messageSend: { limit: 60, windowSeconds: 3600, message: "You're sending messages very quickly. Please wait a moment." },
  report: { limit: 10, windowSeconds: 86400, message: "Report limit reached for today. If you're in danger, contact local authorities." },
  illustration: { limit: 5, windowSeconds: 86400, message: "You can create up to 5 illustrations per day." },
};

/**
 * Increments the counter for (name, subject) and throws RateLimitError when
 * the limit for the current window is exceeded.
 */
export async function enforceRateLimit(name, subject, override) {
  const rule = override ? { ...LIMITS[name], ...override } : LIMITS[name];
  if (!rule) throw new Error(`Unknown rate limit: ${name}`);
  const key = `${name}:${subject}`;
  const windowSeconds = rule.windowSeconds;

  const rows = await sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`;

  // Opportunistic cleanup of old windows (roughly 1 in 50 calls).
  if (Math.random() < 0.02) {
    sql`DELETE FROM rate_limits WHERE window_start < now() - interval '3 days'`.catch(() => {});
  }

  if (rows[0].count > rule.limit) {
    throw new RateLimitError(rule.message);
  }
}
