import { test } from "node:test";
import assert from "node:assert/strict";
import { memorySchema, profileEntrySchema, profileSettingsSchema, illustrationSchema, cleanText } from "@/lib/validation";
import { buildSearchQueries } from "@/lib/search-links";

test("only the description is required for a memory", () => {
  const ok = memorySchema.safeParse({ description: "My old neighbour from Elm Street" });
  assert.ok(ok.success);
  assert.equal(ok.data.full_name, null);
  assert.equal(ok.data.year_last_seen, null);

  const missing = memorySchema.safeParse({ description: "  short " });
  assert.ok(!missing.success);
});

test("memory fields are cleaned and bounded", () => {
  const r = memorySchema.safeParse({
    description: "Friend from \u0007school   days",
    full_name: "   ",
    year_last_seen: "1981",
    age_that_year: "16",
    gender: "",
  });
  assert.ok(r.success);
  assert.equal(r.data.description, "Friend from school days");
  assert.equal(r.data.full_name, null);
  assert.equal(r.data.year_last_seen, 1981);
  assert.equal(r.data.gender, null);

  assert.ok(!memorySchema.safeParse({ description: "valid description", year_last_seen: "1850" }).success);
  assert.ok(!memorySchema.safeParse({ description: "valid description", age_that_year: "-1" }).success);
  assert.ok(!memorySchema.safeParse({ description: "valid description", gender: "<script>" }).success);
  assert.ok(!memorySchema.safeParse({ description: "x".repeat(601) }).success);
});

test("profile entries validate kind and year order", () => {
  assert.ok(profileEntrySchema.safeParse({ kind: "school", value: "Hilton College", start_year: "1980", end_year: "1984", include_in_matching: "on" }).success);
  assert.ok(!profileEntrySchema.safeParse({ kind: "school", value: "Hilton", start_year: "1990", end_year: "1984" }).success);
  assert.ok(!profileEntrySchema.safeParse({ kind: "email", value: "a@b.c" }).success);
});

test("checkboxes default to off (privacy by default)", () => {
  const r = profileSettingsSchema.parse({});
  assert.equal(r.discoverable, false);
  assert.equal(r.show_name_in_suggestions, false);
});

test("illustrations require explicit acknowledgement", () => {
  assert.ok(!illustrationSchema.safeParse({ era: "1970s", style: "watercolour" }).success);
  assert.ok(illustrationSchema.safeParse({ era: "1970s", style: "watercolour", acknowledge: "on" }).success);
});

test("cleanText strips control characters", () => {
  assert.equal(cleanText("a\u0000b\u001Fc"), "abc");
});

test("public search links are plain, encoded URLs built only from clues", () => {
  const qs = buildSearchQueries({ full_name: 'Katherine "Kathy" Smith', school: "St Mary's", city: "Durban", year_last_seen: 1979 });
  assert.ok(qs.length >= 3);
  for (const q of qs) {
    assert.equal(q.links.length, 3);
    for (const l of q.links) {
      const url = new URL(l.href);
      assert.equal(url.protocol, "https:");
      assert.ok(["www.google.com", "www.bing.com", "duckduckgo.com"].includes(url.hostname));
    }
  }
  assert.deepEqual(buildSearchQueries({ description: "just a description" }), []);
});
