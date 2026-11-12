import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getConnection } from "@/lib/data/requests";
import { uuidSchema } from "@/lib/validation";
import { closeConnectionAction } from "@/app/actions/requests";
import { PageShell, LoadingPage, formatDateTime } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { SafetyActions, MessageComposer } from "@/components/SafetyForms";

export const metadata = { title: "Conversation" };

async function Conversation({ params }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const convo = await getConnection(user.id, id);
  if (!convo) notFound();
  const open = convo.status === "accepted";

  return (
    <PageShell className="max-w-3xl">
      <Link href="/requests" className="text-sm text-ink-soft hover:text-ink">
        ← All introductions
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="heading">{convo.other_name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Reconnected {formatDateTime(convo.responded_at)} · private conversation · contact details are never shared automatically
          </p>
        </div>
        {open && (
          <ActionButton action={closeConnectionAction} fields={{ id }} className="btn-secondary btn-sm" confirm="Close this conversation? Neither of you will be able to send new messages.">
            Close conversation
          </ActionButton>
        )}
      </div>

      <div className="card mt-6 space-y-4">
        <div className="rounded-2xl bg-parchment/60 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{convo.i_sent ? "Your introduction" : "Their introduction"}</p>
          <p className="mt-1 whitespace-pre-line">{convo.message}</p>
        </div>

        <ol className="space-y-3" aria-label="Messages">
          {convo.messages.map((m) => (
            <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-sm ${m.mine ? "rounded-br-md bg-clay text-white" : "rounded-bl-md bg-white ring-1 ring-sand"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.mine ? "text-white/70" : "text-ink-soft"}`}>{formatDateTime(m.created_at)}</p>
              </div>
            </li>
          ))}
          {convo.messages.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">No messages yet — why not share a favourite memory?</li>}
        </ol>

        {open ? (
          <MessageComposer requestId={id} />
        ) : (
          <p className="rounded-2xl bg-parchment px-4 py-3 text-center text-sm text-ink-soft">This conversation has been closed.</p>
        )}
      </div>

      <div className="mt-6">
        <SafetyActions requestId={id} />
      </div>
    </PageShell>
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Conversation {...props} />
    </Suspense>
  );
}
