import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getMemory } from "@/lib/data/memories";
import { uuidSchema } from "@/lib/validation";
import { PageShell, PageHeader, LoadingPage } from "@/components/ui";
import MemoryForm from "@/components/MemoryForm";

export const metadata = { title: "Edit memory" };

async function EditMemory({ params }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const memory = await getMemory(user.id, id);
  if (!memory) notFound();
  return (
    <PageShell className="max-w-3xl">
      <PageHeader eyebrow="Edit memory" title="Add or change details" description="Saving will refresh your possible connections." />
      <MemoryForm memory={memory} />
    </PageShell>
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <EditMemory {...props} />
    </Suspense>
  );
}
