import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="flex justify-center px-4 py-12">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-3xl bg-white/70" />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
