// Builds user-initiated search links for publicly available information.
// Nothing here fetches, scrapes or stores results: the app only constructs
// URLs, and the user opens them and judges the results themselves.

const ENGINES = [
  { id: "google", name: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "bing", name: "Bing", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { id: "duckduckgo", name: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
];

const q = (s) => (s ? `"${String(s).replace(/"/g, "").trim()}"` : "");
const join = (...parts) => parts.filter(Boolean).join(" ").trim();

export function buildSearchQueries(memory) {
  const name = memory.full_name || memory.partial_name;
  const place = memory.city || memory.neighbourhood || memory.country;
  const decade = memory.year_last_seen ? `${Math.floor(memory.year_last_seen / 10) * 10}s` : "";
  const out = [];

  if (name && memory.school) {
    out.push({ title: "Name + school", query: join(q(name), q(memory.school)) });
  }
  if (name && place) {
    out.push({ title: "Name + place", query: join(q(name), q(place)) });
  }
  if (name && memory.workplace) {
    out.push({ title: "Name + workplace", query: join(q(name), q(memory.workplace)) });
  }
  if (memory.school) {
    out.push({
      title: "School reunions & alumni pages",
      query: join(q(memory.school), place && q(place), "alumni OR reunion OR \"class of\""),
    });
    if (memory.year_last_seen) {
      out.push({ title: "School year groups", query: join(q(memory.school), `"class of ${memory.year_last_seen}" OR "${decade}"`) });
    }
  }
  if (memory.neighbourhood && memory.city) {
    out.push({ title: "Neighbourhood memories", query: join(q(memory.neighbourhood), q(memory.city), decade, "memories OR old photos") });
  }
  if (memory.workplace && !name) {
    out.push({ title: "Former colleagues", query: join(q(memory.workplace), place && q(place), "former staff OR reunion") });
  }
  if (memory.nickname && place) {
    out.push({ title: "Nickname + place", query: join(q(memory.nickname), q(place), decade) });
  }

  // De-duplicate and cap.
  const seen = new Set();
  return out
    .filter((item) => item.query && !seen.has(item.query) && seen.add(item.query))
    .slice(0, 7)
    .map((item) => ({ ...item, links: ENGINES.map((e) => ({ engine: e.name, href: e.url(item.query) })) }));
}
