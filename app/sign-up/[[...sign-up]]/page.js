import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Join" };

export default function SignUpPage() {
  return (
    <main className="flex flex-col items-center px-4 py-12">
      <p className="mb-6 max-w-md text-center font-serif text-lg italic text-ink-soft">
        Some friendships deserve a second hello.
      </p>
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-3xl bg-white/70" />}>
        <SignUp />
      </Suspense>
    </main>
  );
}
