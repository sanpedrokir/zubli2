import "server-only";
import { sql, transaction } from "../db";
import { getMemory } from "./memories";
import { scoreCandidate, MIN_SCORE } from "../matching";

const MAX_CANDIDATES = 3000; // scale path: add pg_trgm pre-filtering before raising this
const MAX_SUGGESTIONS = 20;
export const ANONYMOUS_LABEL = "A Zubli member";

/**
 * Loads opted-in candidates. Only data the candidate allowed into matching is
 * selected: entries with include_in_matching, birth year only when allowed,
 * display name only when they chose to show it.
 */
async function loadCandidates(userId) {
  return sql`
    SELECT p.user_id,
           CASE WHEN p.birth_year_in_matching THEN p.birth_year END AS birth_year,
           p.gender,
           CASE WHEN p.show_name_in_suggestions THEN NULLIF(u.display_name, '') END AS display_name,
           json_agg(json_build_object(
             'kind', e.kind, 'value', e.value, 'city', e.city, 'country', e.country,
             'neighbourhood', e.neighbourhood, 'start_year', e.start_year, 'end_year', e.end_year
           )) AS entries
      FROM profiles p
      JOIN users u ON u.id = p.user_id AND NOT u.is_suspended AND u.onboarded_at IS NOT NULL
      JOIN profile_entries e ON e.user_id = p.user_id AND e.include_in_matching
     WHERE p.discoverable
       AND p.user_id <> ${userId}
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${userId} AND b.blocked_id = p.user_id)
             OR (b.blocker_id = p.user_id AND b.blocked_id = ${userId}))
     GROUP BY p.user_id, p.birth_year, p.birth_year_in_matching, p.gender, p.show_name_in_suggestions, u.display_name, p.updated_at
     ORDER BY p.updated_at DESC
     LIMIT ${MAX_CANDIDATES}`;
}

/** Recomputes and stores suggestions for one memory. Returns the number found. */
export async function refreshMatches(ownerId, memoryId) {
  const memory = await getMemory(ownerId, memoryId);
  if (!memory) return null;

  const candidates = await loadCandidates(ownerId);
  const scored = [];
  for (const c of candidates) {
    const { score, reasons } = scoreCandidate(memory, c);
    if (score >= MIN_SCORE) scored.push({ candidate_user_id: c.user_id, score, reasons });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, MAX_SUGGESTIONS);
  const keepIds = top.map((t) => t.candidate_user_id);
  const payload = JSON.stringify(top);

  await transaction((tx) => [
    tx`DELETE FROM match_suggestions WHERE memory_id = ${memoryId} AND NOT (candidate_user_id = ANY(${keepIds}::text[]))`,
    tx`
      INSERT INTO match_suggestions (memory_id, candidate_user_id, score, reasons, computed_at)
      SELECT ${memoryId}::uuid, r.candidate_user_id, r.score, r.reasons, now()
        FROM jsonb_to_recordset(${payload}::jsonb) AS r(candidate_user_id text, score int, reasons jsonb)
      ON CONFLICT (memory_id, candidate_user_id) DO UPDATE
        SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, computed_at = now()`,
    tx`UPDATE memories SET matches_refreshed_at = now() WHERE id = ${memoryId} AND owner_id = ${ownerId}`,
  ]);
  return top.length;
}

const STALE_MS = 6 * 60 * 60 * 1000;

/** Recomputes suggestions when they are older than six hours (best effort). */
export async function refreshMatchesIfStale(ownerId, memory) {
  const refreshedAt = memory.matches_refreshed_at ? new Date(memory.matches_refreshed_at).getTime() : 0;
  if (Date.now() - refreshedAt <= STALE_MS) return false;
  try {
    await refreshMatches(ownerId, memory.id);
    return true;
  } catch (err) {
    console.warn("Auto refresh of matches failed:", err.message);
    return false;
  }
}

/**
 * Suggestions for display. Live-filters candidates who have since opted out,
 * been suspended or blocked. Returns no user ids — only the opaque `ref`.
 */
export async function listSuggestions(ownerId, memoryId, { includeDismissed = false } = {}) {
  return sql`
    SELECT s.ref, s.score, s.reasons, s.dismissed, s.computed_at,
           CASE WHEN p.show_name_in_suggestions AND u.display_name <> '' THEN u.display_name ELSE ${ANONYMOUS_LABEL} END AS label,
           (SELECT r.status FROM connection_requests r
             WHERE ((r.sender_id = ${ownerId} AND r.recipient_id = s.candidate_user_id)
                 OR (r.sender_id = s.candidate_user_id AND r.recipient_id = ${ownerId}))
             ORDER BY r.created_at DESC LIMIT 1) AS request_status
      FROM match_suggestions s
      JOIN memories m ON m.id = s.memory_id AND m.owner_id = ${ownerId}
      JOIN profiles p ON p.user_id = s.candidate_user_id AND p.discoverable
      JOIN users u ON u.id = s.candidate_user_id AND NOT u.is_suspended
     WHERE s.memory_id = ${memoryId}
       AND (${includeDismissed}::boolean OR NOT s.dismissed)
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${ownerId} AND b.blocked_id = s.candidate_user_id)
             OR (b.blocker_id = s.candidate_user_id AND b.blocked_id = ${ownerId}))
     ORDER BY s.dismissed, s.score DESC`;
}

/** Top suggestions across all of a user's memories (dashboard). */
export async function topSuggestions(ownerId, limit = 6) {
  return sql`
    SELECT s.ref, s.score, s.reasons, m.id AS memory_id, m.description AS memory_description,
           CASE WHEN p.show_name_in_suggestions AND u.display_name <> '' THEN u.display_name ELSE ${ANONYMOUS_LABEL} END AS label
      FROM match_suggestions s
      JOIN memories m ON m.id = s.memory_id AND m.owner_id = ${ownerId}
      JOIN profiles p ON p.user_id = s.candidate_user_id AND p.discoverable
      JOIN users u ON u.id = s.candidate_user_id AND NOT u.is_suspended
     WHERE NOT s.dismissed
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${ownerId} AND b.blocked_id = s.candidate_user_id)
             OR (b.blocker_id = s.candidate_user_id AND b.blocked_id = ${ownerId}))
       AND NOT EXISTS (
         SELECT 1 FROM connection_requests r
          WHERE r.status IN ('pending', 'accepted')
            AND ((r.sender_id = ${ownerId} AND r.recipient_id = s.candidate_user_id)
              OR (r.sender_id = s.candidate_user_id AND r.recipient_id = ${ownerId})))
     ORDER BY s.score DESC
     LIMIT ${limit}`;
}

/** Resolves an opaque suggestion ref to its (owner-verified) row, server-side only. */
export async function resolveSuggestion(ownerId, ref) {
  const rows = await sql`
    SELECT s.memory_id, s.candidate_user_id, s.dismissed
      FROM match_suggestions s
      JOIN memories m ON m.id = s.memory_id AND m.owner_id = ${ownerId}
     WHERE s.ref = ${ref}`;
  return rows[0] ?? null;
}

export async function setSuggestionDismissed(ownerId, ref, dismissed) {
  const rows = await sql`
    UPDATE match_suggestions s SET dismissed = ${dismissed}
      FROM memories m
     WHERE s.ref = ${ref} AND m.id = s.memory_id AND m.owner_id = ${ownerId}
    RETURNING s.memory_id`;
  return rows[0]?.memory_id ?? null;
}
