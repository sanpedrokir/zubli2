import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { splitSql } from "../scripts/split-sql.mjs";

test("migration statements apply one by one and are idempotent", async () => {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  const statements = splitSql(schema);
  assert.ok(statements.length > 20);
  const db = new PGlite();
  for (let run = 0; run < 2; run++) {
    for (const s of statements) await db.query(s); // runs twice: must not fail
  }
  const { rows } = await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'");
  assert.equal(rows[0].n, 12);
  await db.close();
});
