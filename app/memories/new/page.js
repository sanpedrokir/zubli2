import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth";
import { PageShell, PageHeader, LoadingPage } from "@/components/ui";
import MemoryForm from "@/components/MemoryForm";

export const metadata = { title: "Find a lost friend" };

async function NewMemory() {
  await requireOnboardedUser();
  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        eyebrow="Find a lost friend"
        title="What do you remember?"
        description="Write down any clues you have. Your memory stays private — it is only used to look for possible matches among people who chose to be discoverable."
      />
      <MemoryForm />
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <NewMemory />
    </Suspense>
  );
}
