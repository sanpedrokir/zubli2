import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Logo from "./Logo";
import AppNav from "./AppNav";
import NotificationBell from "./NotificationBell";

function SignedOutActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/sign-in" className="btn-ghost">
        Sign in
      </Link>
      <Link href="/sign-up" className="btn-primary">
        Join free
      </Link>
    </div>
  );
}

// Reads the session at request time, so it streams in behind <Suspense>.
async function HeaderSession() {
  const { userId } = await auth();
  if (!userId) return <SignedOutActions />;
  return (
    <>
      <AppNav />
      <div className="flex items-center gap-2">
        <NotificationBell userId={userId} />
        <UserButton />
      </div>
    </>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-sand/60 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <Suspense fallback={<div className="h-9" aria-hidden="true" />}>
          <HeaderSession />
        </Suspense>
      </div>
    </header>
  );
}
