import Link from "next/link";
import { PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell className="max-w-xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Not found</p>
      <h1 className="heading mt-2">This page has drifted out of touch</h1>
      <p className="mt-3 text-ink-soft">It may have been deleted, or it belongs to someone else.</p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to your dashboard
      </Link>
    </PageShell>
  );
}
