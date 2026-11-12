import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCandidate, nameSimilarity, textSimilarity, soundex, normalize, strengthLabel, MIN_SCORE } from "@/lib/matching";

const memory = {
  description: "My best friend in Standard 6",
  school: "St. Mary's High School",
  city: "Durban",
  neighbourhood: "Berea",
  nickname: "Kathy",
  full_name: "Katherine Smith",
  year_last_seen: 1979,
  age_that_year: 14,
  gender: "Female",
};

test("normalisation expands abbreviations and strips accents", () => {
  assert.equal(normalize("St. Mary's"), "saint marys");
  assert.equal(normalize("Café  Zürich"), "cafe zurich");
});

test("fuzzy helpers", () => {
  assert.equal(soundex("Robert"), soundex("Rupert"));
  assert.ok(nameSimilarity("Katherine Smith", "Catherine Smyth") >= 0.7);
  assert.equal(textSimilarity("St Mary's", "Saint Marys High"), 1);
  assert.ok(textSimilarity("St Mary's High", "Durban Boys High") < 0.55);
});

test("a strongly overlapping profile scores highly with explanatory reasons", () => {
  const { score, reasons } = scoreCandidate(memory, {
    birth_year: 1965,
    gender: "Female",
    entries: [
      { kind: "school", value: "Saint Marys High", city: "Durban", start_year: 1976, end_year: 1982 },
      { kind: "location", value: "Berea", city: "Durban", country: "South Africa", start_year: 1970, end_year: 1985 },
      { kind: "nickname", value: "Kathy" },
    ],
  });
  assert.ok(score >= 60, `expected strong score, got ${score}`);
  assert.equal(strengthLabel(score).tone, "strong");
  const types = reasons.map((r) => r.type);
  for (const t of ["school", "years", "neighbourhood", "nickname", "age"]) assert.ok(types.includes(t), `missing ${t}`);
});

test("reasons only quote the searcher's clues, never the candidate's stored values", () => {
  const secret = "Saint Marys Convent For Girls Durban North";
  const { reasons } = scoreCandidate(
    { description: "x".repeat(12), school: "St Marys Convent" },
    { entries: [{ kind: "school", value: secret, city: "SecretCity", start_year: 1970, end_year: 1975 }] },
  );
  assert.ok(reasons.length > 0);
  for (const r of reasons) {
    assert.ok(!r.label.includes(secret), "candidate value leaked");
    assert.ok(!r.label.includes("SecretCity"), "candidate city leaked");
  }
});

test("city alone is not enough to suggest someone", () => {
  const { score } = scoreCandidate(memory, {
    entries: [{ kind: "school", value: "Durban Boys High", city: "Durban", start_year: 1950, end_year: 1955 }],
  });
  assert.ok(score < MIN_SCORE);
});

test("unrelated profiles score zero", () => {
  assert.equal(scoreCandidate(memory, { entries: [{ kind: "workplace", value: "Acme" }] }).score, 0);
  assert.equal(scoreCandidate({ description: "only a description" }, { entries: [{ kind: "school", value: "Anything" }] }).score, 0);
});

test("a clearly wrong age lowers the score", () => {
  const entries = [{ kind: "school", value: "St Mary's High", start_year: 1976, end_year: 1982 }];
  const fits = scoreCandidate(memory, { birth_year: 1965, entries }).score;
  const off = scoreCandidate(memory, { birth_year: 1940, entries }).score;
  assert.ok(off < fits);
});
