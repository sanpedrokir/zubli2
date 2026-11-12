import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sand/60 pb-24 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-serif italic">Some friendships deserve a second hello.</p>
        <nav className="flex gap-4">
          <Link href="/safety" className="hover:text-ink">
            Privacy &amp; safety
          </Link>
          <span aria-hidden="true">·</span>
          <span>Suggestions are possibilities, never confirmed identities.</span>
        </nav>
      </div>
    </footer>
  );
}
