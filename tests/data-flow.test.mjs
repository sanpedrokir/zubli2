// End-to-end data-layer test against a real PostgreSQL engine (PGlite) using
// the production schema. Exercises ownership, privacy, matching, consent,
// blocking, reporting and rate limiting.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { resetDatabase, sql } from "./support/fake-db.mjs";
import { createMemory, getMemory, updateMemory, deleteMemory, listMemories } from "@/lib/data/memories";
import { saveProfileSettings, addEntry, listEntries, toggleEntryMatching, deleteAllUserData, getProfile } from "@/lib/data/profile";
import { refreshMatches, listSuggestions, topSuggestions, setSuggestionDismissed } from "@/lib/data/matches";
import {
  sendRequest,
  listIncoming,
  listOutgoing,
  respondToRequest,
  sendMessage,
  getConnection,
  listConnections,
  blockViaRequest,
  reportViaRequest,
  unreadNotificationCount,
  withdrawRequest,
  listBlocked,
  unblock,
  RequestError,
} from "@/lib/data/requests";
import { saveIllustration, getIllustrationImage, listIllustrations } from "@/lib/data/illustrations";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { memorySchema } from "@/lib/validation";

const PRIVATE_SCHOOL_VALUE = "Saint Marys Diocesan School For Girls";

async function makeUser(id, name, { onboarded = true } = {}) {
  await sql`INSERT INTO users (id, display_name, onboarded_at) VALUES (${id}, ${name}, ${onboarded ? new Date() : null})`;
  const [u] = await sql`SELECT * FROM users WHERE id = ${id}`;
  return u;
}

const settings = (over = {}) => ({
  discoverable: true,
  show_name_in_suggestions: false,
  birth_year: 1965,
  birth_year_in_matching: true,
  gender: "Female",
  about: "Private note: my phone is 555-0100",
  ...over,
});

const entry = (over) => ({ city: null, country: null, neighbourhood: null, start_year: null, end_year: null, include_in_matching: true, ...over });

let alice, kathy, hidden, mallory;
let memoryId;

before(async () => {
  await resetDatabase();
  alice = await makeUser("user_alice", "Alice");
  kathy = await makeUser("user_kathy", "Kathy Brown");
  hidden = await makeUser("user_hidden", "Hidden Person");
  mallory = await makeUser("user_mallory", "Mallory");

  // Kathy: discoverable, with history.
  await saveProfileSettings(kathy.id, settings());
  await addEntry(kathy.id, entry({ kind: "school", value: PRIVATE_SCHOOL_VALUE, city: "Durban", start_year: 1976, end_year: 1982 }));
  await addEntry(kathy.id, entry({ kind: "location", value: "Berea", city: "Durban", country: "South Africa", start_year: 1968, end_year: 1985 }));
  await addEntry(kathy.id, entry({ kind: "nickname", value: "Kathy" }));

  // Hidden: identical history but NOT discoverable.
  await saveProfileSettings(hidden.id, settings({ discoverable: false }));
  await addEntry(hidden.id, entry({ kind: "school", value: "St Marys", city: "Durban", start_year: 1976, end_year: 1982 }));
  await addEntry(hidden.id, entry({ kind: "nickname", value: "Kathy" }));

  const data = memorySchema.parse({
    description: "My best friend at St Mary's — we walked home through Berea",
    nickname: "Kathy",
    school: "St Mary's",
    city: "Durban",
    neighbourhood: "Berea",
    year_last_seen: 1979,
    age_that_year: 14,
  });
  memoryId = await createMemory(alice.id, data);
});

test("memories are private to their owner", async () => {
  assert.ok(await getMemory(alice.id, memoryId));
  assert.equal(await getMemory(mallory.id, memoryId), null);
  assert.equal(await updateMemory(mallory.id, memoryId, memorySchema.parse({ description: "hijacked memory text" })), false);
  assert.equal(await deleteMemory(mallory.id, memoryId), false);
  assert.equal((await listMemories(mallory.id)).length, 0);
  assert.equal((await listMemories(alice.id)).length, 1);
});

test("matching only suggests opted-in people and leaks nothing private", async () => {
  const n = await refreshMatches(alice.id, memoryId);
  assert.equal(n, 1);
  const suggestions = await listSuggestions(alice.id, memoryId);
  assert.equal(suggestions.length, 1);
  const s = suggestions[0];
  assert.equal(s.label, "A Zubli member"); // show_name_in_suggestions is off
  const serialised = JSON.stringify(suggestions);
  for (const forbidden of ["user_kathy", "user_hidden", PRIVATE_SCHOOL_VALUE, "555-0100", "Kathy Brown", "1965"]) {
    assert.ok(!serialised.includes(forbidden), `suggestion leaked: ${forbidden}`);
  }
  assert.ok(s.score >= 60);
  // Another user cannot read Alice's suggestions.
  assert.equal((await listSuggestions(mallory.id, memoryId)).length, 0);
  assert.equal(await refreshMatches(mallory.id, memoryId), null);
});

test("excluding entries or opting out removes the suggestion", async () => {
  const entries = await listEntries(kathy.id);
  for (const e of entries) await toggleEntryMatching(kathy.id, e.id);
  await refreshMatches(alice.id, memoryId);
  assert.equal((await listSuggestions(alice.id, memoryId)).length, 0);
  for (const e of entries) await toggleEntryMatching(kathy.id, e.id);

  await saveProfileSettings(kathy.id, settings({ discoverable: false }));
  await refreshMatches(alice.id, memoryId);
  assert.equal((await listSuggestions(alice.id, memoryId)).length, 0);

  await saveProfileSettings(kathy.id, settings({ show_name_in_suggestions: true }));
  await refreshMatches(alice.id, memoryId);
  const [s] = await listSuggestions(alice.id, memoryId);
  assert.equal(s.label, "Kathy Brown");
  assert.equal((await topSuggestions(alice.id)).length, 1);
});

test("dismissing hides a suggestion; restoring brings it back", async () => {
  const [s] = await listSuggestions(alice.id, memoryId);
  assert.equal(await setSuggestionDismissed(mallory.id, s.ref, true), null);
  assert.ok(await setSuggestionDismissed(alice.id, s.ref, true));
  assert.equal((await listSuggestions(alice.id, memoryId)).length, 0);
  assert.equal((await listSuggestions(alice.id, memoryId, { includeDismissed: true })).length, 1);
  await setSuggestionDismissed(alice.id, s.ref, false);
});

test("introductions require consent before messaging", async () => {
  const [s] = await listSuggestions(alice.id, memoryId);

  // Someone who doesn't own the suggestion can't use its ref.
  await assert.rejects(sendRequest(mallory, s.ref, "Hello there, I think we were at school together!"), RequestError);

  await sendRequest(alice, s.ref, "Hi! Were you at St Mary's in 1979? We walked home through Berea every day.");
  await assert.rejects(sendRequest(alice, s.ref, "Second attempt at sending the same introduction"), /already a pending/);
  assert.equal(await unreadNotificationCount(kathy.id), 1);

  const [incoming] = await listIncoming(kathy.id);
  assert.equal(incoming.sender_name, "Alice");
  assert.ok(!JSON.stringify(incoming).includes("user_alice"));

  const [out] = await listOutgoing(alice.id);
  assert.equal(out.status, "pending");

  // No messaging while pending, and outsiders can't respond.
  await assert.rejects(sendMessage(alice, incoming.id, "hello?"), RequestError);
  await assert.rejects(respondToRequest(mallory.id, incoming.id, true), RequestError);
  await assert.rejects(respondToRequest(alice.id, incoming.id, true), RequestError); // sender can't self-accept

  await respondToRequest(kathy.id, incoming.id, true);
  await sendMessage(alice, incoming.id, "So lovely to hear from you!");
  await sendMessage(kathy, incoming.id, "I can't believe it's you!");
  const convo = await getConnection(kathy.id, incoming.id);
  assert.equal(convo.messages.length, 2);
  assert.equal(convo.other_name, "Alice");
  assert.equal(await getConnection(mallory.id, incoming.id), null);
  await assert.rejects(sendMessage(mallory, incoming.id, "let me in"), RequestError);
  assert.equal((await listConnections(alice.id)).length, 1);
});

test("blocking closes the connection and removes suggestions both ways", async () => {
  const [conn] = await listConnections(kathy.id);
  await blockViaRequest(kathy.id, conn.id);
  await assert.rejects(sendMessage(alice, conn.id, "are you there?"), RequestError);
  await refreshMatches(alice.id, memoryId);
  assert.equal((await listSuggestions(alice.id, memoryId)).length, 0);

  const blocked = await listBlocked(kathy.id);
  assert.equal(blocked.length, 1);
  assert.ok(!JSON.stringify(blocked).includes("user_alice"));
  assert.equal(await unblock(alice.id, blocked[0].handle), false); // not Alice's block
  assert.equal(await unblock(kathy.id, blocked[0].handle), true);
  await refreshMatches(alice.id, memoryId);
  assert.equal((await listSuggestions(alice.id, memoryId)).length, 1);
});

test("withdrawn requests can't be accepted", async () => {
  const [s] = await listSuggestions(alice.id, memoryId);
  await sendRequest(alice, s.ref, "Trying once more, hopefully this is the right Kathy!");
  const [incoming] = await listIncoming(kathy.id);
  await withdrawRequest(alice.id, incoming.id);
  await assert.rejects(respondToRequest(kathy.id, incoming.id, true), RequestError);
});

test("reports from several different people suspend an account", async () => {
  // Three users each receive a request from Mallory, then report her.
  for (const id of ["user_r1", "user_r2", "user_r3"]) {
    const u = await makeUser(id, id);
    await saveProfileSettings(u.id, settings());
    await addEntry(u.id, entry({ kind: "school", value: "Northlands Girls High", start_year: 1975, end_year: 1980 }));
  }
  const mMemory = await createMemory(mallory.id, memorySchema.parse({ description: "Looking for anyone from Northlands", school: "Northlands Girls High", year_last_seen: 1978 }));
  await refreshMatches(mallory.id, mMemory);
  const suggestions = await listSuggestions(mallory.id, mMemory);
  assert.equal(suggestions.length, 3);
  for (const s of suggestions) await sendRequest(mallory, s.ref, "Please send me a gift card to prove it's you, thank you");

  for (const id of ["user_r1", "user_r2", "user_r3"]) {
    const [req] = await listIncoming(id);
    await reportViaRequest(id, req.id, { reason: "spam", details: "asked for gift cards" }, { alsoBlock: true });
  }
  const [m] = await sql`SELECT is_suspended FROM users WHERE id = 'user_mallory'`;
  assert.equal(m.is_suspended, true);
});

test("illustrations are only readable by their owner", async () => {
  const pixel = Buffer.from("RIFF0000WEBPVP8 ").toString("base64");
  const id = await saveIllustration(alice.id, memoryId, { era: "1970s", style: "watercolour", prompt: "p", mimeType: "image/webp", base64: pixel });
  assert.ok(id);
  assert.equal(await saveIllustration(mallory.id, memoryId, { era: "1970s", style: "ink", prompt: "p", mimeType: "image/webp", base64: pixel }), null);
  const img = await getIllustrationImage(alice.id, id);
  assert.equal(img.buffer.toString("base64"), pixel);
  assert.equal(await getIllustrationImage(mallory.id, id), null);
  assert.equal((await listIllustrations(alice.id, memoryId)).length, 1);
});

test("rate limits stop bursts", async () => {
  for (let i = 0; i < 5; i++) await enforceRateLimit("illustration", "burst-user");
  await assert.rejects(enforceRateLimit("illustration", "burst-user"), RateLimitError);
  await enforceRateLimit("illustration", "someone-else"); // independent counter
});

test("deleting all data cascades everywhere", async () => {
  await deleteAllUserData(alice.id);
  assert.equal(await getMemory(alice.id, memoryId), null);
  for (const table of ["memories", "illustrations", "connection_requests", "match_suggestions"]) {
    const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM ${table} t WHERE ${table === "memories" || table === "illustrations" ? "owner_id" : table === "connection_requests" ? "sender_id" : "memory_id::text"} = $1`, [table === "match_suggestions" ? memoryId : alice.id]);
    assert.equal(n, 0, `${table} not cleaned up`);
  }
  assert.equal((await getProfile(alice.id))._new, true);
});
