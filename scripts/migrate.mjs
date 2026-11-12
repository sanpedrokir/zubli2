// Applies db/schema.sql to the database in DATABASE_URL (idempotent).
// Usage: npm run db:migrate   (reads .env.local, then .env)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { splitSql } from "./split-sql.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load env files without extra dependencies (Node >= 20.12).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(root, file));
  } catch {
    // file is optional
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
  process.exit(1);
}

const sql = neon(url);
const statements = splitSql(await readFile(path.join(root, "db", "schema.sql"), "utf8"));

console.log(`Applying ${statements.length} statements…`);
for (const statement of statements) {
  try {
    await sql.query(statement);
  } catch (err) {
    console.error("\nFailed statement:\n" + statement + "\n");
    console.error(err.message);
    process.exit(1);
  }
}
console.log("Database schema is up to date.");
