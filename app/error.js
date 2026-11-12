"use client";

import { PageShell } from "@/components/ui";

export default function Error({ reset }) {
  return (
    <PageShell className="max-w-xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Something went wrong</p>
      <h1 className="heading mt-2">We dropped a stitch</h1>
      <p className="mt-3 text-ink-soft">
        Please try again. If this keeps happening, check that the database and authentication keys are configured (see README).
      </p>
      <button type="button" onClick={() => reset()} className="btn-primary mt-6">
        Try again
      </button>
    </PageShell>
  );
}
