import "server-only";
import { sql } from "../db";

// Every query is scoped by owner_id so one user can never read or change
// another user's memories, even with a guessed id.

export async function listMemories(ownerId, { limit = 100 } = {}) {
  return sql`
    SELECT m.id, m.description, m.full_name, m.nickname, m.school, m.city, m.country,
           m.year_last_seen, m.updated_at, m.created_at,
           (SELECT count(*)::int FROM match_suggestions s
              JOIN profiles p ON p.user_id = s.candidate_user_id AND p.discoverable
              JOIN users u ON u.id = s.candidate_user_id AND NOT u.is_suspended
             WHERE s.memory_id = m.id AND NOT s.dismissed) AS match_count
      FROM memories m
     WHERE m.owner_id = ${ownerId}
     ORDER BY m.updated_at DESC
     LIMIT ${limit}`;
}

export async function getMemory(ownerId, id) {
  const rows = await sql`SELECT * FROM memories WHERE id = ${id} AND owner_id = ${ownerId}`;
  return rows[0] ?? null;
}

export async function createMemory(ownerId, data) {
  const rows = await sql`
    INSERT INTO memories (
      owner_id, description, full_name, partial_name, nickname, country, city, neighbourhood,
      hangouts, school, workplace, occupation, year_last_seen, age_that_year, gender, height,
      shared_activities, personal_memories)
    VALUES (
      ${ownerId}, ${data.description}, ${data.full_name}, ${data.partial_name}, ${data.nickname},
      ${data.country}, ${data.city}, ${data.neighbourhood}, ${data.hangouts}, ${data.school},
      ${data.workplace}, ${data.occupation}, ${data.year_last_seen}, ${data.age_that_year},
      ${data.gender}, ${data.height}, ${data.shared_activities}, ${data.personal_memories})
    RETURNING id`;
  return rows[0].id;
}

export async function updateMemory(ownerId, id, data) {
  const rows = await sql`
    UPDATE memories SET
      description = ${data.description}, full_name = ${data.full_name}, partial_name = ${data.partial_name},
      nickname = ${data.nickname}, country = ${data.country}, city = ${data.city},
      neighbourhood = ${data.neighbourhood}, hangouts = ${data.hangouts}, school = ${data.school},
      workplace = ${data.workplace}, occupation = ${data.occupation},
      year_last_seen = ${data.year_last_seen}, age_that_year = ${data.age_that_year},
      gender = ${data.gender}, height = ${data.height}, shared_activities = ${data.shared_activities},
      personal_memories = ${data.personal_memories}, updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id`;
  return rows.length > 0;
}

export async function deleteMemory(ownerId, id) {
  const rows = await sql`DELETE FROM memories WHERE id = ${id} AND owner_id = ${ownerId} RETURNING id`;
  return rows.length > 0;
}

export async function countMemories(ownerId) {
  const rows = await sql`SELECT count(*)::int AS n FROM memories WHERE owner_id = ${ownerId}`;
  return rows[0].n;
}
