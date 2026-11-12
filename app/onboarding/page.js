import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageShell, LoadingPage } from "@/components/ui";
import OnboardingForm from "@/components/OnboardingForm";

export const metadata = { title: "Welcome" };

async function Onboarding() {
  const user = await requireUser();
  if (user.onboarded_at) redirect("/dashboard");
  return (
    <PageShell className="max-w-xl">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Welcome to Zubli Reconnect</p>
        <h1 className="heading mt-2">Some friendships deserve a second hello.</h1>
        <p className="mt-3 text-ink-soft">Three quick steps and you&apos;re ready.</p>
      </div>
      <OnboardingForm defaultName={user.display_name} />
    </PageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Onboarding />
    </Suspense>
  );
}
