import "server-only";
import { neon } from "@neondatabase/serverless";

// Server-only database access. DATABASE_URL is never exposed to the browser:
// this module imports "server-only", so bundling it into a Client Component
// fails the build.

let client;

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not configured. Copy .env.example to .env.local and add your Neon connection string.",
      );
    }
    client = neon(url);
  }
  return client;
}

/** Tagged-template query: sql`SELECT * FROM t WHERE id = ${id}` → rows[] (parameterised). */
export function sql(strings, ...values) {
  return getClient()(strings, ...values);
}

/** Plain parameterised query: query("SELECT $1::int", [1]) → rows[]. */
export function query(text, params = []) {
  return getClient().query(text, params);
}

/** Runs several sql`` queries atomically in one transaction. Pass a function receiving the tag. */
export function transaction(build) {
  const c = getClient();
  return c.transaction((tx) => build(tx));
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
