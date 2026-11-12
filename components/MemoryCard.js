import Link from "next/link";
import { deleteMemoryAction } from "@/app/actions/memories";
import { Chip, formatDate } from "./ui";
import { ActionButton } from "./forms";

export default function MemoryCard({ memory, redirectTo }) {
  const meta = [memory.nickname && `“${memory.nickname}”`, memory.school, memory.city, memory.year_last_seen && `last seen ${memory.year_last_seen}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold leading-snug">
          <Link href={`/memories/${memory.id}`} className="hover:text-clay">
            {memory.full_name || memory.nickname || memory.partial_name || "Someone I remember"}
          </Link>
        </h3>
        {memory.match_count > 0 ? (
          <Chip tone="strong">{memory.match_count} possible</Chip>
        ) : (
          <Chip>No matches yet</Chip>
        )}
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{memory.description}</p>
      {meta && <p className="mt-3 text-xs text-ink-soft">{meta}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <Link href={`/memories/${memory.id}`} className="btn-primary btn-sm">
          Open
        </Link>
        <Link href={`/memories/${memory.id}/edit`} className="btn-secondary btn-sm">
          Edit
        </Link>
        <ActionButton
          action={deleteMemoryAction}
          fields={{ id: memory.id, redirectTo }}
          className="btn-danger btn-sm"
          pendingText="Deleting…"
          confirm="Delete this memory and its suggestions and illustrations? This cannot be undone."
        >
          Delete
        </ActionButton>
        <span className="ml-auto text-xs text-ink-soft">Updated {formatDate(memory.updated_at)}</span>
      </div>
    </article>
  );
}
