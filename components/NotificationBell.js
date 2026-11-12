import Link from "next/link";
import { unreadNotificationCount } from "@/lib/data/requests";

export default async function NotificationBell({ userId }) {
  let count = 0;
  try {
    count = await unreadNotificationCount(userId);
  } catch {
    count = 0; // database not configured yet — don't break the header
  }
  return (
    <Link
      href="/requests"
      className="relative rounded-full p-2 text-ink-soft transition hover:bg-parchment hover:text-ink"
      aria-label={count ? `${count} unread notifications` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
