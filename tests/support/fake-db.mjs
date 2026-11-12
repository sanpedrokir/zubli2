// Drop-in replacement for lib/db.js backed by PGlite (real PostgreSQL in WASM).
// Mirrors the Neon HTTP driver API used by the app: sql``, sql.query(), query(), transaction().
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let db;

function toQuery(strings, values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}` + strings[i + 1];
  return { text, params: values };
}

async function run({ text, params }, conn) {
  const res = await (conn ?? db).query(text, params);
  return res.rows;
}

export function sql(strings, ...values) {
  return run(toQuery(strings, values));
}
sql.query = (text, params = []) => run({ text, params });

export const query = (text, params = []) => run({ text, params });

export async function transaction(build) {
  const tx = (strings, ...values) => toQuery(strings, values);
  const queries = build(tx);
  return db.transaction(async (t) => {
    const out = [];
    for (const q of queries) out.push(await run(q, t));
    return out;
  });
}

export function isDatabaseConfigured() {
  return true;
}

/** Test helper: creates a fresh database with the real schema applied. */
export async function resetDatabase() {
  if (db) await db.close();
  db = new PGlite();
  const schema = await readFile(path.join(root, "db", "schema.sql"), "utf8");
  await db.exec(schema);
  return db;
}
