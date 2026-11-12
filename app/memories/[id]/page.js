import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getMemory } from "@/lib/data/memories";
import { listSuggestions, refreshMatchesIfStale } from "@/lib/data/matches";
import { listIllustrations } from "@/lib/data/illustrations";
import { getProfile } from "@/lib/data/profile";
import { strengthLabel } from "@/lib/matching";
import { buildSearchQueries } from "@/lib/search-links";
import { isIllustrationEnabled } from "@/lib/illustration";
import { uuidSchema } from "@/lib/validation";
import { refreshMatchesAction, deleteMemoryAction } from "@/app/actions/memories";
import { PageShell, PageHeader, EmptyState, LoadingPage, AiNotice, formatDate } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import SuggestionCard from "@/components/SuggestionCard";
import IllustrationStudio from "@/components/IllustrationStudio";

export const metadata = { title: "Memory" };

const DETAIL_LABELS = [
  ["full_name", "Full name"],
  ["partial_name", "Partial name"],
  ["nickname", "Nickname"],
  ["country", "Country"],
  ["city", "City"],
  ["neighbourhood", "Neighbourhood"],
  ["hangouts", "Hangouts"],
  ["school", "School"],
  ["workplace", "Workplace"],
  ["occupation", "Occupation"],
  ["year_last_seen", "Year last seen"],
  ["age_that_year", "Age that year"],
  ["gender", "Gender"],
  ["height", "Height"],
  ["shared_activities", "Shared activities"],
  ["personal_memories", "Personal memories"],
];

function eraFor(year) {
  if (!year) return "1980s";
  const decade = Math.floor(year / 10) * 10;
  return `${Math.min(2000, Math.max(1950, decade))}s`;
}

async function MemoryDetail({ params, searchParams }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const { saved } = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();

  const memory = await getMemory(user.id, id);
  if (!memory) notFound();

  // Keep suggestions reasonably fresh without a click.
  await refreshMatchesIfStale(user.id, memory);

  const [suggestions, illustrations, profile] = await Promise.all([
    listSuggestions(user.id, id, { includeDismissed: true }),
    listIllustrations(user.id, id),
    getProfile(user.id),
  ]);
  const active = suggestions.filter((s) => !s.dismissed);
  const hidden = suggestions.filter((s) => s.dismissed);
  const searches = buildSearchQueries(memory);
  const details = DETAIL_LABELS.filter(([k]) => memory[k] !== null && memory[k] !== "");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Find a lost friend"
        title={memory.full_name || memory.nickname || memory.partial_name || "Someone I remember"}
        description={memory.description}
        actions={
          <>
            <Link href={`/memories/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <ActionButton
              action={deleteMemoryAction}
              fields={{ id }}
              className="btn-danger"
              confirm="Delete this memory and its suggestions and illustrations? This cannot be undone."
            >
              Delete
            </ActionButton>
          </>
        }
      />

      {saved && (
        <p role="status" className="mb-6 rounded-2xl border border-sage/40 bg-sage-soft px-4 py-3 text-sm">
          Memory saved. We&apos;ve looked for possible connections below.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          {/* Matches */}
          <section aria-labelledby="matches-h">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="matches-h" className="subheading">
                  Possible connections
                </h2>
                <p className="text-sm text-ink-soft">
                  {memory.matches_refreshed_at ? `Checked ${formatDate(memory.matches_refreshed_at)}` : "Not checked yet"} · only people who chose to be discoverable
                </p>
              </div>
              <ActionButton action={refreshMatchesAction} fields={{ id }} pendingText="Looking…" showMessage>
                ↻ Refresh matches
              </ActionButton>
            </div>
            <div className="mb-4">
              <AiNotice>
                These are suggestions based on clues that line up — never confirmed identities. Many people share names, schools and streets. We
                never show another member&apos;s private details; reasons describe your own clues.
              </AiNotice>
            </div>
            {active.length === 0 ? (
              <EmptyState title="No possible connections yet">
                Try adding a school, neighbourhood, nickname or approximate year. New people opt in all the time — check back later.
                {!profile.discoverable && (
                  <>
                    {" "}
                    You can also{" "}
                    <Link href="/profile" className="text-clay underline">
                      make your own history discoverable
                    </Link>{" "}
                    so they can find you too.
                  </>
                )}
              </EmptyState>
            ) : (
              <div className="grid gap-4">
                {active.map((s) => (
                  <SuggestionCard key={s.ref} suggestion={s} strength={strengthLabel(s.score)} />
                ))}
              </div>
            )}
            {hidden.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-ink-soft">Hidden suggestions ({hidden.length})</summary>
                <div className="mt-3 grid gap-4">
                  {hidden.map((s) => (
                    <SuggestionCard key={s.ref} suggestion={s} strength={strengthLabel(s.score)} />
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* Public web discovery */}
          <section aria-labelledby="web-h" className="card">
            <h2 id="web-h" className="subheading">
              Search the public web yourself
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Optional links built from your clues. Nothing is searched until you click, and results open on the search engine&apos;s site. Zubli doesn&apos;t
              scrape social media or collect profiles, and a result with a matching name is not proof it&apos;s the same person — review carefully.
            </p>
            {searches.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">Add a name, school, workplace or place to this memory to get search ideas.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {searches.map((s) => (
                  <li key={s.query} className="rounded-2xl bg-parchment/60 p-4">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-1 break-words font-mono text-xs text-ink-soft">{s.query}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.links.map((l) => (
                        <a key={l.engine} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary btn-sm">
                          {l.engine} ↗
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Illustration */}
          <section aria-labelledby="ill-h" className="card">
            <h2 id="ill-h" className="subheading">
              Memory-inspired illustration <span className="text-sm font-normal text-ink-soft">(optional)</span>
            </h2>
            <p className="mb-4 mt-1 text-sm text-ink-soft">
              Turn your description into a nostalgic artwork of the era. People are drawn from a distance without detailed faces — it&apos;s a mood, not a
              portrait. Names are never sent to the image service. Illustrations are private to you and are never used for identity matching.
            </p>
            <IllustrationStudio
              memoryId={id}
              defaultEra={eraFor(memory.year_last_seen)}
              enabled={isIllustrationEnabled()}
              illustrations={illustrations.map((i) => ({ id: i.id, era: i.era, style: i.style }))}
            />
          </section>
        </div>

        {/* Details sidebar */}
        <aside className="space-y-4">
          <div className="card">
            <h2 className="subheading">What you remember</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {details.map(([k, label]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words">{String(memory[k])}</dd>
                </div>
              ))}
              {details.length === 0 && <p className="text-ink-soft">Only a description so far.</p>}
            </dl>
            <Link href={`/memories/${id}/edit`} className="btn-secondary btn-sm mt-5">
              Add more details
            </Link>
          </div>
          <p className="px-2 text-xs text-ink-soft">Private to you. Created {formatDate(memory.created_at)}.</p>
        </aside>
      </div>
    </PageShell>
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <MemoryDetail {...props} />
    </Suspense>
  );
}
