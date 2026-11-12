import { Suspense } from "react";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { listIncoming, listOutgoing, listConnections, markNotificationsRead } from "@/lib/data/requests";
import { respondToRequestAction, withdrawRequestAction } from "@/app/actions/requests";
import { PageShell, PageHeader, EmptyState, LoadingPage, Chip, formatDate } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { SafetyActions } from "@/components/SafetyForms";

export const metadata = { title: "Introductions" };

async function Requests({ searchParams }) {
  const user = await requireOnboardedUser();
  const { blocked, reported } = await searchParams;
  const [incoming, outgoing, connections] = await Promise.all([listIncoming(user.id), listOutgoing(user.id), listConnections(user.id)]);
  // Viewing this page counts as seeing new-request and accepted notifications.
  await markNotificationsRead(user.id, ["request_received", "request_accepted"]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Reconnection requests"
        title="Introductions"
        description="Conversations open only when someone accepts. You can decline, block or report at any time — the other person is never told why."
      />

      {(blocked || reported) && (
        <p role="status" className="mb-6 rounded-2xl border border-sage/40 bg-sage-soft px-4 py-3 text-sm">
          {reported ? "Thank you — your report was received." : "Done. That person has been blocked."} They won&apos;t be able to contact you or appear in your
          suggestions.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="in-h">
          <h2 id="in-h" className="subheading mb-4">
            Waiting for your reply {incoming.length > 0 && <Chip tone="clay">{incoming.length}</Chip>}
          </h2>
          {incoming.length === 0 ? (
            <EmptyState title="No introductions waiting">When someone thinks you might be the friend they remember, their note will appear here.</EmptyState>
          ) : (
            <div className="space-y-4">
              {incoming.map((r) => (
                <article key={r.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-serif text-lg font-semibold">{r.sender_name}</p>
                    <span className="text-xs text-ink-soft">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">thinks you might be someone they remember</p>
                  <blockquote className="mt-3 whitespace-pre-line rounded-2xl bg-parchment/60 p-4 text-sm leading-relaxed">{r.message}</blockquote>
                  <p className="mt-3 text-xs text-ink-soft">
                    Accepting opens a private conversation. Your email and contact details stay hidden. If you&apos;re not who they&apos;re looking for,
                    declining is perfectly fine.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton action={respondToRequestAction} fields={{ id: r.id, decision: "accept" }} className="btn-primary btn-sm" pendingText="Accepting…">
                      Accept &amp; say hello
                    </ActionButton>
                    <ActionButton action={respondToRequestAction} fields={{ id: r.id, decision: "decline" }} className="btn-secondary btn-sm">
                      Decline
                    </ActionButton>
                  </div>
                  <div className="mt-3 border-t border-sand/60 pt-3">
                    <SafetyActions requestId={r.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="conn-h">
          <h2 id="conn-h" className="subheading mb-4">
            Reconnected
          </h2>
          {connections.length === 0 ? (
            <EmptyState title="No connections yet">Accepted introductions become private conversations here.</EmptyState>
          ) : (
            <ul className="card divide-y divide-sand/60 p-0">
              {connections.map((c) => (
                <li key={c.id}>
                  <Link href={`/connections/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-parchment/50">
                    <span className="font-medium">{c.other_name}</span>
                    <span className="text-xs text-ink-soft">
                      {c.last_message_at ? `Last message ${formatDate(c.last_message_at)}` : `Connected ${formatDate(c.responded_at)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="subheading mb-4 mt-10">Sent by you</h2>
          {outgoing.length === 0 ? (
            <EmptyState title="No sent introductions">Open one of your searches and choose “Request an introduction” on a possible connection.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {outgoing.map((r) => (
                <li key={r.id} className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.recipient_label}</span>
                    {r.status === "pending" ? <Chip tone="medium">Awaiting reply</Chip> : <Chip>Not accepted</Chip>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{r.message}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-soft">Sent {formatDate(r.created_at)}</span>
                    {r.status === "pending" && (
                      <ActionButton action={withdrawRequestAction} fields={{ id: r.id }} className="btn-ghost btn-sm" confirm="Withdraw this introduction?">
                        Withdraw
                      </ActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Requests {...props} />
    </Suspense>
  );
}
