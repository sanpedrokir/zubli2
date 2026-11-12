/** Splits db/schema.sql into individual statements (comments removed). */
export function splitSql(schema) {
  return schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
