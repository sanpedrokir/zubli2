import "server-only";
import { sql, transaction } from "../db";
import { resolveSuggestion, ANONYMOUS_LABEL } from "./matches";

export class RequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestError";
  }
}

const MAX_PENDING_OUTGOING = 20;
const DECLINE_COOLDOWN_DAYS = 90;
export const AUTO_SUSPEND_REPORTERS = 3;

function blockedEitherWay(a, b) {
  return sql`
    SELECT 1 FROM blocks
     WHERE (blocker_id = ${a} AND blocked_id = ${b}) OR (blocker_id = ${b} AND blocked_id = ${a})
     LIMIT 1`;
}

/** Sends an introduction request based on a match suggestion the sender owns. */
export async function sendRequest(sender, suggestionRef, message) {
  if (sender.is_suspended) throw new RequestError("Your account can't send introductions right now.");

  const suggestion = await resolveSuggestion(sender.id, suggestionRef);
  if (!suggestion) throw new RequestError("That suggestion is no longer available.");
  const recipientId = suggestion.candidate_user_id;

  const [live] = await sql`
    SELECT 1 AS ok FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = ${recipientId} AND p.discoverable AND NOT u.is_suspended`;
  if (!live) throw new RequestError("This person is no longer available for introductions.");

  // Deliberately generic so a block is never disclosed.
  if ((await blockedEitherWay(sender.id, recipientId)).length) {
    throw new RequestError("This introduction can't be sent.");
  }

  const [existing] = await sql`
    SELECT status FROM connection_requests
     WHERE ((sender_id = ${sender.id} AND recipient_id = ${recipientId})
         OR (sender_id = ${recipientId} AND recipient_id = ${sender.id}))
       AND (status IN ('pending', 'accepted')
            OR (status = 'declined' AND sender_id = ${sender.id}
                AND responded_at > now() - make_interval(days => ${DECLINE_COOLDOWN_DAYS})))
     LIMIT 1`;
  if (existing?.status === "pending") throw new RequestError("There is already a pending introduction between you.");
  if (existing?.status === "accepted") throw new RequestError("You are already connected.");
  if (existing?.status === "declined") throw new RequestError("This person isn't accepting an introduction from you right now.");

  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM connection_requests WHERE sender_id = ${sender.id} AND status = 'pending'`;
  if (n >= MAX_PENDING_OUTGOING) {
    throw new RequestError(`You have ${n} introductions waiting for a reply. Please wait for some responses first.`);
  }

  try {
    await sql`
      WITH r AS (
        INSERT INTO connection_requests (sender_id, recipient_id, memory_id, message)
        VALUES (${sender.id}, ${recipientId}, ${suggestion.memory_id}, ${message})
        RETURNING id, recipient_id)
      INSERT INTO notifications (user_id, type, request_id)
      SELECT recipient_id, 'request_received', id FROM r`;
  } catch (err) {
    if (err?.code === "23505") throw new RequestError("There is already a pending introduction between you.");
    throw err;
  }
}

const nameOrAnon = (col) => `COALESCE(NULLIF(${col}, ''), '${ANONYMOUS_LABEL}')`;

export async function listIncoming(userId) {
  return sql.query(
    `SELECT r.id, r.message, r.created_at, ${nameOrAnon("u.display_name")} AS sender_name
       FROM connection_requests r JOIN users u ON u.id = r.sender_id
      WHERE r.recipient_id = $1 AND r.status = 'pending' AND NOT u.is_suspended
      ORDER BY r.created_at DESC`,
    [userId],
  );
}

export async function listOutgoing(userId) {
  // Before acceptance the sender only sees what the suggestion showed them.
  return sql`
    SELECT r.id, r.message, r.status, r.created_at, r.responded_at, r.memory_id,
           CASE WHEN p.show_name_in_suggestions AND u.display_name <> '' THEN u.display_name ELSE ${ANONYMOUS_LABEL} END AS recipient_label
      FROM connection_requests r
      JOIN users u ON u.id = r.recipient_id
      LEFT JOIN profiles p ON p.user_id = r.recipient_id
     WHERE r.sender_id = ${userId} AND r.status IN ('pending', 'declined')
     ORDER BY r.created_at DESC
     LIMIT 50`;
}

export async function listConnections(userId) {
  return sql.query(
    `SELECT r.id, r.created_at, r.responded_at,
            ${nameOrAnon("u.display_name")} AS other_name,
            (SELECT max(m.created_at) FROM messages m WHERE m.request_id = r.id) AS last_message_at
       FROM connection_requests r
       JOIN users u ON u.id = CASE WHEN r.sender_id = $1 THEN r.recipient_id ELSE r.sender_id END
      WHERE r.status = 'accepted' AND (r.sender_id = $1 OR r.recipient_id = $1)
      ORDER BY COALESCE((SELECT max(m.created_at) FROM messages m WHERE m.request_id = r.id), r.responded_at) DESC`,
    [userId],
  );
}

export async function respondToRequest(userId, requestId, accept) {
  const status = accept ? "accepted" : "declined";
  const rows = await sql`
    UPDATE connection_requests SET status = ${status}, responded_at = now()
     WHERE id = ${requestId} AND recipient_id = ${userId} AND status = 'pending'
    RETURNING id, sender_id`;
  if (!rows.length) throw new RequestError("This request is no longer pending.");
  await sql`UPDATE notifications SET read_at = now() WHERE request_id = ${requestId} AND user_id = ${userId} AND read_at IS NULL`;
  if (accept) {
    await sql`INSERT INTO notifications (user_id, type, request_id) VALUES (${rows[0].sender_id}, 'request_accepted', ${requestId})`;
  }
}

export async function withdrawRequest(userId, requestId) {
  const rows = await sql`
    UPDATE connection_requests SET status = 'withdrawn', responded_at = now()
     WHERE id = ${requestId} AND sender_id = ${userId} AND status = 'pending'
    RETURNING id`;
  if (!rows.length) throw new RequestError("This request can no longer be withdrawn.");
  await sql`DELETE FROM notifications WHERE request_id = ${requestId}`;
}

/** Returns the other participant's id for a request the user is part of (server-side only). */
async function otherParty(userId, requestId) {
  const [row] = await sql`
    SELECT CASE WHEN sender_id = ${userId} THEN recipient_id ELSE sender_id END AS other_id, status
      FROM connection_requests
     WHERE id = ${requestId} AND (sender_id = ${userId} OR recipient_id = ${userId})`;
  return row ?? null;
}

export async function getConnection(userId, requestId) {
  const [row] = await sql.query(
    `SELECT r.id, r.status, r.message, r.created_at, r.responded_at, r.sender_id = $1 AS i_sent,
            ${nameOrAnon("u.display_name")} AS other_name
       FROM connection_requests r
       JOIN users u ON u.id = CASE WHEN r.sender_id = $1 THEN r.recipient_id ELSE r.sender_id END
      WHERE r.id = $2 AND (r.sender_id = $1 OR r.recipient_id = $1) AND r.status IN ('accepted', 'closed')`,
    [userId, requestId],
  );
  if (!row) return null;
  const messages = await sql`
    SELECT id, body, created_at, sender_id = ${userId} AS mine
      FROM messages WHERE request_id = ${requestId}
     ORDER BY created_at ASC
     LIMIT 500`;
  await sql`
    UPDATE notifications SET read_at = now()
     WHERE request_id = ${requestId} AND user_id = ${userId} AND read_at IS NULL`;
  return { ...row, messages };
}

export async function sendMessage(user, requestId, body) {
  if (user.is_suspended) throw new RequestError("Your account can't send messages right now.");
  const party = await otherParty(user.id, requestId);
  if (!party || party.status !== "accepted") throw new RequestError("You can only message people who accepted your introduction.");
  if ((await blockedEitherWay(user.id, party.other_id)).length) throw new RequestError("This conversation is closed.");

  await transaction((tx) => [
    tx`INSERT INTO messages (request_id, sender_id, body) VALUES (${requestId}, ${user.id}, ${body})`,
    // Keep at most one unread message notification per conversation.
    tx`
      INSERT INTO notifications (user_id, type, request_id)
      SELECT ${party.other_id}, 'message_received', ${requestId}
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
          WHERE user_id = ${party.other_id} AND request_id = ${requestId}
            AND type = 'message_received' AND read_at IS NULL)`,
  ]);
}

export async function closeConnection(userId, requestId) {
  const rows = await sql`
    UPDATE connection_requests SET status = 'closed'
     WHERE id = ${requestId} AND status = 'accepted' AND (sender_id = ${userId} OR recipient_id = ${userId})
    RETURNING id`;
  if (!rows.length) throw new RequestError("This connection is already closed.");
}

async function blockUser(userId, otherId) {
  if (!otherId || otherId === userId) throw new RequestError("Unable to block.");
  await transaction((tx) => [
    tx`INSERT INTO blocks (blocker_id, blocked_id) VALUES (${userId}, ${otherId}) ON CONFLICT DO NOTHING`,
    tx`
      UPDATE connection_requests SET status = CASE WHEN status = 'pending' THEN 'declined' ELSE 'closed' END,
             responded_at = COALESCE(responded_at, now())
       WHERE status IN ('pending', 'accepted')
         AND ((sender_id = ${userId} AND recipient_id = ${otherId}) OR (sender_id = ${otherId} AND recipient_id = ${userId}))`,
    tx`
      DELETE FROM match_suggestions s USING memories m
       WHERE s.memory_id = m.id
         AND ((m.owner_id = ${userId} AND s.candidate_user_id = ${otherId})
           OR (m.owner_id = ${otherId} AND s.candidate_user_id = ${userId}))`,
    tx`
      DELETE FROM notifications n USING connection_requests r
       WHERE n.request_id = r.id AND n.user_id = ${userId}
         AND ((r.sender_id = ${userId} AND r.recipient_id = ${otherId}) OR (r.sender_id = ${otherId} AND r.recipient_id = ${userId}))`,
  ]);
}

export async function blockViaRequest(userId, requestId) {
  const party = await otherParty(userId, requestId);
  if (!party) throw new RequestError("Request not found.");
  await blockUser(userId, party.other_id);
}

export async function blockViaSuggestion(userId, ref) {
  const s = await resolveSuggestion(userId, ref);
  if (!s) throw new RequestError("Suggestion not found.");
  await blockUser(userId, s.candidate_user_id);
}

export async function reportViaRequest(userId, requestId, { reason, details }, { alsoBlock = true } = {}) {
  const party = await otherParty(userId, requestId);
  if (!party) throw new RequestError("Request not found.");
  await sql`
    INSERT INTO reports (reporter_id, reported_user_id, request_id, reason, details)
    VALUES (${userId}, ${party.other_id}, ${requestId}, ${reason}, ${details})
    ON CONFLICT (reporter_id, reported_user_id) WHERE status = 'open' DO NOTHING`;

  // Abuse safeguard: suspend automatically once several different people report someone.
  await sql`
    UPDATE users SET is_suspended = TRUE, updated_at = now()
     WHERE id = ${party.other_id}
       AND (SELECT count(DISTINCT reporter_id) FROM reports
             WHERE reported_user_id = ${party.other_id} AND status = 'open') >= ${AUTO_SUSPEND_REPORTERS}`;

  if (alsoBlock) await blockUser(userId, party.other_id);
}

export async function unreadNotificationCount(userId) {
  const [row] = await sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${userId} AND read_at IS NULL`;
  return row.n;
}

export async function listNotifications(userId, limit = 10) {
  return sql`
    SELECT id, type, request_id, created_at, read_at
      FROM notifications WHERE user_id = ${userId}
     ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function markNotificationsRead(userId, types) {
  await sql`
    UPDATE notifications SET read_at = now()
     WHERE user_id = ${userId} AND read_at IS NULL AND type = ANY(${types}::text[])`;
}

export async function listBlocked(userId) {
  // Shows only the display name; user ids stay server-side. `handle` is an
  // opaque hash used to identify the row when unblocking.
  return sql`
    SELECT b.created_at, COALESCE(NULLIF(u.display_name, ''), ${ANONYMOUS_LABEL}) AS name,
           md5(b.blocker_id || ':' || b.blocked_id) AS handle
      FROM blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ${userId}
     ORDER BY b.created_at DESC`;
}

export async function unblock(userId, handle) {
  const rows = await sql`
    DELETE FROM blocks WHERE blocker_id = ${userId} AND md5(blocker_id || ':' || blocked_id) = ${handle}
    RETURNING blocked_id`;
  return rows.length > 0;
}
