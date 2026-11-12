import { Suspense } from "react";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { listMemories } from "@/lib/data/memories";
import { PageShell, PageHeader, EmptyState, LoadingPage } from "@/components/ui";
import MemoryCard from "@/components/MemoryCard";

export const metadata = { title: "My searches" };

async function Memories() {
  const user = await requireOnboardedUser();
  const memories = await listMemories(user.id);
  return (
    <PageShell>
      <PageHeader
        eyebrow="Find a lost friend"
        title="My searches"
        description="Each search holds what you remember about someone. Only you can see these."
        actions={
          <Link href="/memories/new" className="btn-primary">
            + New search
          </Link>
        }
      />
      {memories.length === 0 ? (
        <EmptyState
          title="No searches yet"
          action={
            <Link href="/memories/new" className="btn-primary">
              Write down your first memory
            </Link>
          }
        >
          Start with a sentence about who you hope to find. A school, a street or a nickname is a great beginning.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} redirectTo="/memories" />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Memories />
    </Suspense>
  );
}
