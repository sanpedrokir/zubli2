// Privacy-preserving similarity scoring between a remembered "memory" and an
// opted-in historical profile. Runs entirely on the server; no profile data is
// sent to third-party AI services.
//
// Output reasons are phrased in terms of the SEARCHER'S OWN CLUES, so a
// suggestion never discloses a candidate's stored values.

const ABBREVIATIONS = {
  st: "saint",
  ste: "sainte",
  mt: "mount",
  ft: "fort",
  hs: "high school",
  sch: "school",
  coll: "college",
  univ: "university",
  uni: "university",
  intl: "international",
  co: "company",
  corp: "corporation",
  ltd: "limited",
  inc: "incorporated",
  dept: "department",
  govt: "government",
  ave: "avenue",
  rd: "road",
  sq: "square",
};

// Generic words that make institutions look alike without telling them apart.
const GENERIC = new Set([
  "the", "of", "and", "a", "an", "de", "la", "le", "el", "der", "die", "das",
  "school", "high", "primary", "secondary", "junior", "senior", "middle", "elementary",
  "college", "academy", "grammar", "comprehensive", "public", "state", "national", "university",
  "company", "corporation", "limited", "incorporated", "group", "plc", "llc",
  "street", "road", "avenue", "district", "area", "town", "city", "village",
]);

export function normalize(text) {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((t) => ABBREVIATIONS[t] ?? t)
    .join(" ");
}

export function tokens(text, { distinctive = false } = {}) {
  const list = normalize(text).split(" ").filter(Boolean);
  return distinctive ? list.filter((t) => !GENERIC.has(t) && t.length > 1) : list;
}

function bigrams(s) {
  const clean = s.replace(/\s+/g, " ");
  const out = new Map();
  for (let i = 0; i < clean.length - 1; i++) {
    const g = clean.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** Sørensen–Dice coefficient over character bigrams (0..1). */
export function dice(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const ga = bigrams(na);
  const gb = bigrams(nb);
  let overlap = 0;
  let total = 0;
  for (const [g, n] of ga) {
    total += n;
    if (gb.has(g)) overlap += Math.min(n, gb.get(g));
  }
  for (const n of gb.values()) total += n;
  return (2 * overlap) / total;
}

/** Jaccard overlap of distinctive tokens (0..1). */
export function tokenOverlap(a, b) {
  const ta = new Set(tokens(a, { distinctive: true }));
  const tb = new Set(tokens(b, { distinctive: true }));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size) * (inter / Math.max(ta.size, tb.size)) ** 0.25;
}

/** Combined text similarity for institutions and places (0..1). */
export function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const distinctA = tokens(a, { distinctive: true }).join(" ");
  const distinctB = tokens(b, { distinctive: true }).join(" ");
  const contained =
    distinctA && distinctB && (distinctA.includes(distinctB) || distinctB.includes(distinctA)) ? 0.85 : 0;
  return Math.max(contained, tokenOverlap(a, b), distinctA && distinctB ? dice(distinctA, distinctB) * 0.9 : 0);
}

/** American Soundex — catches "Katherine"/"Catherine", "Smith"/"Smyth". */
export function soundex(word) {
  const w = normalize(word).replace(/[^a-z]/g, "");
  if (!w) return "";
  const codes = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
  let out = w[0].toUpperCase();
  let prev = codes[w[0]] ?? 0;
  for (let i = 1; i < w.length && out.length < 4; i++) {
    const ch = w[i];
    const code = codes[ch] ?? 0;
    if (code && code !== prev) out += code;
    if (ch !== "h" && ch !== "w") prev = code;
  }
  return out.padEnd(4, "0");
}

/** Similarity between two personal names or nicknames (0..1). */
export function nameSimilarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  if (ta.join(" ") === tb.join(" ")) return 1;
  let best = 0;
  let matched = 0;
  for (const x of ta) {
    let local = 0;
    for (const y of tb) {
      if (x === y) local = Math.max(local, 1);
      else if (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x))) local = Math.max(local, 0.8);
      else if (x.length >= 3 && soundex(x) === soundex(y)) local = Math.max(local, 0.7);
      else local = Math.max(local, dice(x, y) >= 0.75 ? 0.6 : 0);
    }
    if (local > 0) matched++;
    best = Math.max(best, local);
  }
  // Reward multiple matching name parts (e.g. first + surname).
  const coverage = matched / Math.max(ta.length, 1);
  return Math.min(1, best * (0.7 + 0.3 * coverage) + (matched >= 2 ? 0.15 : 0));
}

function yearFit(year, start, end) {
  if (year == null || (start == null && end == null)) return null; // unknown
  const lo = start ?? end;
  const hi = end ?? start;
  if (year >= lo - 1 && year <= hi + 1) return 1;
  const gap = year < lo ? lo - year : year - hi;
  if (gap <= 4) return 0.6;
  if (gap <= 10) return 0.25;
  return 0;
}

function quote(text) {
  const t = String(text).trim();
  return `“${t.length > 60 ? t.slice(0, 57) + "…" : t}”`;
}

/**
 * Scores one candidate profile against a memory.
 * @param {object} memory  memory row
 * @param {{birth_year?:number|null, gender?:string|null, entries:Array, display_name?:string|null}} candidate
 *        candidate data ALREADY filtered to opted-in entries/fields
 * @returns {{score:number, reasons:Array<{type:string,label:string}>}}
 */
export function scoreCandidate(memory, candidate) {
  const reasons = [];
  let score = 0;
  let anchors = 0;
  const year = memory.year_last_seen ?? null;
  const entries = candidate.entries ?? [];
  const ofKind = (k) => entries.filter((e) => e.kind === k);

  // Pick the best entry of a kind for a clue, factoring in year overlap.
  const best = (kind, clue, simFn) => {
    let top = null;
    for (const e of ofKind(kind)) {
      const sim = simFn(clue, e);
      if (sim <= 0) continue;
      const fit = yearFit(year, e.start_year, e.end_year);
      const adjusted = sim * (fit == null ? 0.85 : 0.5 + 0.5 * fit);
      if (!top || adjusted > top.adjusted) top = { sim, fit, adjusted };
    }
    return top;
  };

  // School (strongest signal)
  if (memory.school) {
    const m = best("school", memory.school, (clue, e) => {
      const s = textSimilarity(clue, e.value);
      return s >= 0.55 ? s : 0;
    });
    if (m) {
      anchors++;
      score += 32 * m.adjusted;
      reasons.push({ type: "school", label: `School resembles your clue ${quote(memory.school)}` });
      if (m.fit === 1) reasons.push({ type: "years", label: `Their school years include ${year}` });
    }
  }

  // Workplace
  if (memory.workplace) {
    const m = best("workplace", memory.workplace, (clue, e) => {
      const s = textSimilarity(clue, e.value);
      return s >= 0.55 ? s : 0;
    });
    if (m) {
      anchors++;
      score += 24 * m.adjusted;
      reasons.push({ type: "workplace", label: `Workplace resembles your clue ${quote(memory.workplace)}` });
      if (m.fit === 1 && !reasons.some((r) => r.type === "years")) {
        reasons.push({ type: "years", label: `Their time there overlaps with ${year}` });
      }
    }
  }

  // Places: neighbourhood > city > country. Location entries plus the city/
  // neighbourhood attached to schools and workplaces all count.
  const placeEntries = entries.filter((e) => e.kind !== "nickname" && e.kind !== "former_name");
  if (memory.neighbourhood || memory.city || memory.hangouts) {
    let hoodHit = null;
    let cityHit = null;
    let hangoutHit = false;
    for (const e of placeEntries) {
      const fit = yearFit(year, e.start_year, e.end_year);
      const factor = fit == null ? 0.85 : 0.5 + 0.5 * fit;
      const hoodSources = [e.neighbourhood, e.kind === "location" ? e.value : null].filter(Boolean);
      if (memory.neighbourhood) {
        for (const src of hoodSources) {
          const s = textSimilarity(memory.neighbourhood, src);
          if (s >= 0.6 && (!hoodHit || s * factor > hoodHit)) hoodHit = s * factor;
        }
      }
      if (memory.city) {
        for (const src of [e.city, e.kind === "location" ? e.value : null].filter(Boolean)) {
          const s = textSimilarity(memory.city, src);
          if (s >= 0.7 && (!cityHit || s * factor > cityHit)) cityHit = s * factor;
        }
      }
      if (memory.hangouts && !hangoutHit) {
        const clueTokens = new Set(tokens(memory.hangouts, { distinctive: true }));
        const placeTokens = tokens([e.value, e.neighbourhood].filter(Boolean).join(" "), { distinctive: true });
        if (placeTokens.some((t) => t.length > 3 && clueTokens.has(t))) hangoutHit = true;
      }
    }
    if (hoodHit) {
      anchors++;
      score += 16 * hoodHit;
      reasons.push({ type: "neighbourhood", label: `Lived near your clue ${quote(memory.neighbourhood)}` });
    }
    if (cityHit) {
      score += 10 * cityHit;
      reasons.push({ type: "city", label: `Connected to ${quote(memory.city)}` });
    }
    if (hangoutHit) {
      score += 5;
      reasons.push({ type: "hangouts", label: "A place they list echoes one of your hangout spots" });
    }
  }
  if (memory.country) {
    const hit = placeEntries.some((e) => e.country && textSimilarity(memory.country, e.country) >= 0.8);
    if (hit) {
      score += 3;
      if (!reasons.some((r) => r.type === "city" || r.type === "neighbourhood")) {
        reasons.push({ type: "country", label: `Has history in ${quote(memory.country)}` });
      }
    }
  }

  // Nickname
  if (memory.nickname) {
    let top = 0;
    for (const e of ofKind("nickname")) top = Math.max(top, nameSimilarity(memory.nickname, e.value));
    if (top >= 0.7) {
      anchors++;
      score += 22 * top;
      reasons.push({ type: "nickname", label: `Went by a nickname like ${quote(memory.nickname)}` });
    }
  }

  // Names: full/partial name vs former names (and display name if shared)
  const nameClues = [memory.full_name, memory.partial_name].filter(Boolean);
  if (nameClues.length) {
    const nameSources = ofKind("former_name").map((e) => e.value);
    if (candidate.display_name) nameSources.push(candidate.display_name);
    // A remembered nickname can also be a real first name.
    let top = 0;
    let which = null;
    for (const clue of nameClues) {
      for (const src of nameSources) {
        const s = nameSimilarity(clue, src);
        if (s > top) {
          top = s;
          which = clue;
        }
      }
    }
    if (top >= 0.6) {
      anchors++;
      score += 22 * top;
      reasons.push({ type: "name", label: `A name resembles your clue ${quote(which)}` });
    }
  }

  // Age fit: compare implied birth year with the candidate's (if shared).
  if (candidate.birth_year && year != null && memory.age_that_year != null) {
    const implied = year - memory.age_that_year;
    const diff = Math.abs(implied - candidate.birth_year);
    if (diff <= 2) {
      score += 10;
      reasons.push({ type: "age", label: `Age roughly fits being ${memory.age_that_year} in ${year}` });
    } else if (diff <= 5) {
      score += 4;
      reasons.push({ type: "age", label: "Age is in a plausible range" });
    } else if (diff > 10) {
      score -= 12;
    }
  }

  // Gender is a soft signal only (memories can be wrong; people change).
  if (memory.gender && candidate.gender && memory.gender !== "Prefer not to say" && candidate.gender !== "Prefer not to say") {
    if (memory.gender !== candidate.gender) score -= 10;
  }

  if (anchors >= 2) score += 6 * (anchors - 1);
  if (anchors === 0) return { score: 0, reasons: [] };

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export const MIN_SCORE = 18;

export function strengthLabel(score) {
  if (score >= 60) return { label: "Strong possibility", tone: "strong" };
  if (score >= 35) return { label: "Possible connection", tone: "medium" };
  return { label: "Faint possibility", tone: "faint" };
}
