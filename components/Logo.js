import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }) {
  // Two overlapping speech-bubble "hellos" — one older (honey), one new (clay).
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="15" cy="17" r="11" fill="#d4a23f" opacity="0.85" />
      <circle cx="25" cy="22" r="11" fill="#b85c38" opacity="0.9" />
      <path d="M20 31 l-3 6 l7 -4 z" fill="#b85c38" opacity="0.9" />
      <path d="M21 19.5c1.6-1.8 4.6-1.4 5.4.8.8 2.1-1.2 4.2-5.4 6.7-4.2-2.5-6.2-4.6-5.4-6.7.8-2.2 3.8-2.6 5.4-.8z" fill="#fbf6ee" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Zubli Reconnect home">
      <LogoMark />
      <span className="font-serif text-lg font-semibold leading-none tracking-tight text-ink">
        Zubli <span className="text-clay">Reconnect</span>
      </span>
    </Link>
  );
}
