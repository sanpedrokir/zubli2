import "server-only";
import { sql } from "../db";

export async function listIllustrations(ownerId, memoryId) {
  return sql`
    SELECT id, era, style, created_at FROM illustrations
     WHERE owner_id = ${ownerId} AND memory_id = ${memoryId}
     ORDER BY created_at DESC`;
}

export async function saveIllustration(ownerId, memoryId, { era, style, prompt, mimeType, base64 }) {
  const [row] = await sql`
    INSERT INTO illustrations (owner_id, memory_id, era, style, prompt, mime_type, image)
    SELECT ${ownerId}, m.id, ${era}, ${style}, ${prompt}, ${mimeType}, decode(${base64}, 'base64')
      FROM memories m WHERE m.id = ${memoryId} AND m.owner_id = ${ownerId}
    RETURNING id`;
  return row?.id ?? null;
}

export async function getIllustrationImage(ownerId, id) {
  const [row] = await sql`
    SELECT mime_type, encode(image, 'base64') AS b64 FROM illustrations
     WHERE id = ${id} AND owner_id = ${ownerId}`;
  if (!row) return null;
  return { mimeType: row.mime_type, buffer: Buffer.from(row.b64, "base64") };
}

export async function deleteIllustration(ownerId, id) {
  const rows = await sql`DELETE FROM illustrations WHERE id = ${id} AND owner_id = ${ownerId} RETURNING memory_id`;
  return rows[0]?.memory_id ?? null;
}
