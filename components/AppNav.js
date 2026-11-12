"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/memories", label: "My searches" },
  { href: "/profile", label: "My history" },
  { href: "/requests", label: "Introductions" },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-sand bg-cream/95 px-2 py-2 backdrop-blur md:static md:z-auto md:justify-center md:gap-1 md:border-0 md:bg-transparent md:p-0"
    >
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/") || (l.href === "/requests" && pathname.startsWith("/connections"));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              active ? "bg-clay-soft text-clay-dark" : "text-ink-soft hover:bg-parchment hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
