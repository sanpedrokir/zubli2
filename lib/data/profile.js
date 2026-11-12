import "server-only";
import { sql, transaction } from "../db";

export async function getProfile(userId) {
  const rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
  return (
    rows[0] ?? {
      user_id: userId,
      discoverable: false,
      show_name_in_suggestions: false,
      birth_year: null,
      birth_year_in_matching: true,
      gender: null,
      about: null,
      _new: true,
    }
  );
}

export async function listEntries(userId) {
  return sql`
    SELECT id, kind, value, city, country, neighbourhood, start_year, end_year, include_in_matching
      FROM profile_entries
     WHERE user_id = ${userId}
     ORDER BY kind, start_year NULLS LAST, created_at`;
}

// Whenever matching-relevant data changes, drop cached suggestions that point
// at this user so stale reasons can never be shown to anyone.
function invalidateAsCandidate(tx, userId) {
  return tx`DELETE FROM match_suggestions WHERE candidate_user_id = ${userId}`;
}

export async function saveProfileSettings(userId, data) {
  await transaction((tx) => [
    tx`
      INSERT INTO profiles (user_id, discoverable, show_name_in_suggestions, birth_year, birth_year_in_matching, gender, about)
      VALUES (${userId}, ${data.discoverable}, ${data.show_name_in_suggestions}, ${data.birth_year},
              ${data.birth_year_in_matching}, ${data.gender}, ${data.about})
      ON CONFLICT (user_id) DO UPDATE SET
        discoverable = EXCLUDED.discoverable,
        show_name_in_suggestions = EXCLUDED.show_name_in_suggestions,
        birth_year = EXCLUDED.birth_year,
        birth_year_in_matching = EXCLUDED.birth_year_in_matching,
        gender = EXCLUDED.gender,
        about = EXCLUDED.about,
        updated_at = now()`,
    invalidateAsCandidate(tx, userId),
  ]);
}

export async function setDiscoverable(userId, discoverable) {
  await transaction((tx) => [
    tx`
      INSERT INTO profiles (user_id, discoverable) VALUES (${userId}, ${discoverable})
      ON CONFLICT (user_id) DO UPDATE SET discoverable = EXCLUDED.discoverable, updated_at = now()`,
    invalidateAsCandidate(tx, userId),
  ]);
}

export async function countEntries(userId) {
  const rows = await sql`SELECT count(*)::int AS n FROM profile_entries WHERE user_id = ${userId}`;
  return rows[0].n;
}

export async function addEntry(userId, e) {
  await transaction((tx) => [
    tx`
      INSERT INTO profile_entries (user_id, kind, value, city, country, neighbourhood, start_year, end_year, include_in_matching)
      VALUES (${userId}, ${e.kind}, ${e.value}, ${e.city}, ${e.country}, ${e.neighbourhood}, ${e.start_year}, ${e.end_year}, ${e.include_in_matching})`,
    invalidateAsCandidate(tx, userId),
  ]);
}

export async function updateEntry(userId, id, e) {
  const [rows] = await transaction((tx) => [
    tx`
      UPDATE profile_entries SET kind = ${e.kind}, value = ${e.value}, city = ${e.city}, country = ${e.country},
             neighbourhood = ${e.neighbourhood}, start_year = ${e.start_year}, end_year = ${e.end_year},
             include_in_matching = ${e.include_in_matching}
       WHERE id = ${id} AND user_id = ${userId}
      RETURNING id`,
    invalidateAsCandidate(tx, userId),
  ]);
  return rows.length > 0;
}

export async function toggleEntryMatching(userId, id) {
  const [rows] = await transaction((tx) => [
    tx`UPDATE profile_entries SET include_in_matching = NOT include_in_matching
        WHERE id = ${id} AND user_id = ${userId} RETURNING id`,
    invalidateAsCandidate(tx, userId),
  ]);
  return rows.length > 0;
}

export async function deleteEntry(userId, id) {
  const [rows] = await transaction((tx) => [
    tx`DELETE FROM profile_entries WHERE id = ${id} AND user_id = ${userId} RETURNING id`,
    invalidateAsCandidate(tx, userId),
  ]);
  return rows.length > 0;
}

export async function setDisplayName(userId, name, { onboard = false } = {}) {
  if (onboard) {
    await sql`UPDATE users SET display_name = ${name}, onboarded_at = COALESCE(onboarded_at, now()), updated_at = now() WHERE id = ${userId}`;
  } else {
    await sql`UPDATE users SET display_name = ${name}, updated_at = now() WHERE id = ${userId}`;
  }
  await sql`DELETE FROM match_suggestions WHERE candidate_user_id = ${userId}`;
}

/** Permanently removes all of the user's Zubli data (cascades to every table). */
export async function deleteAllUserData(userId) {
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
