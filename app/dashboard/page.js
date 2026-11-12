import { Suspense } from "react";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { listMemories } from "@/lib/data/memories";
import { topSuggestions } from "@/lib/data/matches";
import { listIncoming, listOutgoing, listConnections } from "@/lib/data/requests";
import { getProfile, countEntries } from "@/lib/data/profile";
import { strengthLabel } from "@/lib/matching";
import { respondToRequestAction } from "@/app/actions/requests";
import { PageShell, PageHeader, EmptyState, LoadingPage, StatCard, Chip, formatDate } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import MemoryCard from "@/components/MemoryCard";

export const metadata = { title: "Dashboard" };

function SectionTitle({ title, href, linkLabel = "See all" }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="subheading">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-clay hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

async function Dashboard() {
  const user = await requireOnboardedUser();
  const [memories, suggestions, incoming, outgoing, connections, profile, entryCount] = await Promise.all([
    listMemories(user.id),
    topSuggestions(user.id, 6),
    listIncoming(user.id),
    listOutgoing(user.id),
    listConnections(user.id),
    getProfile(user.id),
    countEntries(user.id),
  ]);
  const pendingOut = outgoing.filter((r) => r.status === "pending");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back${user.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}`}
        description="Some friendships deserve a second hello."
        actions={
          <Link href="/memories/new" className="btn-primary">
            + Find a lost friend
          </Link>
        }
      />

      {user.is_suspended && (
        <p className="mb-6 rounded-2xl border border-rose/40 bg-rose-soft px-4 py-3 text-sm text-clay-dark">
          Your account is temporarily limited after several reports. You can still manage your own data. Introductions and messages are paused.
        </p>
      )}

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Saved memories" value={memories.length} href="/memories" tone="clay" />
        <StatCard label="Introductions waiting for you" value={incoming.length} href="/requests" tone="honey" />
        <StatCard label="Sent, awaiting reply" value={pendingOut.length} href="/requests" tone="plum" />
        <StatCard label="Reconnected friends" value={connections.length} href="/requests" tone="sage" />
      </div>

      {/* Profile nudge */}
      {(!profile.discoverable || entryCount === 0) && (
        <div className="card mb-10 flex flex-col gap-4 bg-gradient-to-r from-honey-soft/60 to-rose-soft/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-lg font-semibold">Could someone be looking for you, too?</p>
            <p className="text-sm text-ink-soft">
              {entryCount === 0
                ? "Add your old schools, neighbourhoods and workplaces to your historical profile."
                : "Your historical profile is private. Make it discoverable so old friends' memories can find you."}
            </p>
          </div>
          <Link href="/profile" className="btn-primary shrink-0">
            {entryCount === 0 ? "Add my history" : "Review privacy"}
          </Link>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Pending requests */}
        <section>
          <SectionTitle title="Introductions for you" href="/requests" />
          {incoming.length === 0 ? (
            <EmptyState title="No introductions waiting">When someone thinks you might be the friend they remember, their note will appear here.</EmptyState>
          ) : (
            <div className="space-y-3">
              {incoming.slice(0, 3).map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.sender_name}</p>
                    <span className="text-xs text-ink-soft">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{r.message}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton action={respondToRequestAction} fields={{ id: r.id, decision: "accept" }} className="btn-primary btn-sm">
                      Accept
                    </ActionButton>
                    <ActionButton action={respondToRequestAction} fields={{ id: r.id, decision: "decline" }} className="btn-secondary btn-sm">
                      Decline
                    </ActionButton>
                    <Link href="/requests" className="btn-ghost btn-sm">
                      Block or report
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Potential matches */}
        <section>
          <SectionTitle title="Potential matches" href="/memories" linkLabel="All searches" />
          {suggestions.length === 0 ? (
            <EmptyState title="No suggestions right now">Add more clues to your searches, or check back as more people opt in.</EmptyState>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => {
                const strength = strengthLabel(s.score);
                return (
                  <Link key={s.ref} href={`/memories/${s.memory_id}`} className="card block p-5 transition hover:border-clay/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{s.label}</p>
                      <Chip tone={strength.tone}>{strength.label}</Chip>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-ink-soft">For: {s.memory_description}</p>
                    <p className="mt-2 text-sm text-ink-soft">{s.reasons[0]?.label}</p>
                  </Link>
                );
              })}
              <p className="text-xs text-ink-soft">Suggestions are possibilities, never confirmed identities.</p>
            </div>
          )}
        </section>

        {/* Connections */}
        <section>
          <SectionTitle title="Accepted connections" href="/requests" />
          {connections.length === 0 ? (
            <EmptyState title="No connections yet">When an introduction is accepted, you can talk here privately.</EmptyState>
          ) : (
            <ul className="card divide-y divide-sand/60 p-0">
              {connections.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/connections/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-parchment/50">
                    <span className="font-medium">{c.other_name}</span>
                    <span className="text-xs text-ink-soft">{c.last_message_at ? `Last message ${formatDate(c.last_message_at)}` : "Say hello"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sent */}
        <section>
          <SectionTitle title="Sent introductions" href="/requests" />
          {pendingOut.length === 0 ? (
            <EmptyState title="Nothing waiting">Introductions you send will show here until they&apos;re answered.</EmptyState>
          ) : (
            <ul className="card divide-y divide-sand/60 p-0">
              {pendingOut.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm">{r.recipient_label}</span>
                  <span className="text-xs text-ink-soft">Sent {formatDate(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Memories */}
      <section className="mt-12">
        <SectionTitle title="Saved memories" href="/memories" />
        {memories.length === 0 ? (
          <EmptyState
            title="Start with one memory"
            action={
              <Link href="/memories/new" className="btn-primary">
                Write a memory
              </Link>
            }
          >
            Who comes to mind first? A best friend, a neighbour, a teammate…
          </EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {memories.slice(0, 6).map((m) => (
              <MemoryCard key={m.id} memory={m} redirectTo="/dashboard" />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage label="Loading your dashboard…" />}>
      <Dashboard />
    </Suspense>
  );
}
