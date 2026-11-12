import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "./db";

export class AuthError extends Error {
  constructor(message = "You need to be signed in to do that.") {
    super(message);
    this.name = "AuthError";
  }
}

async function ensureUserRow(userId) {
  const existing = await sql`SELECT id, display_name, onboarded_at, is_suspended FROM users WHERE id = ${userId}`;
  if (existing.length) return existing[0];

  // First visit: seed the display name from Clerk (first name only; no email is stored).
  let displayName = "";
  try {
    const clerkUser = await currentUser();
    displayName = (clerkUser?.firstName || clerkUser?.username || "").slice(0, 60);
  } catch {
    // Non-fatal: the user can set a name during onboarding.
  }
  const rows = await sql`
    INSERT INTO users (id, display_name) VALUES (${userId}, ${displayName})
    ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
    RETURNING id, display_name, onboarded_at, is_suspended`;
  return rows[0];
}

/**
 * Data Access Layer entry point for pages. Redirects to sign-in when there is
 * no session, and returns the app's user row. Deduplicated per request.
 */
export const requireUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return ensureUserRow(userId);
});

/** Same as requireUser, but also sends people who skipped onboarding there first. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.onboarded_at) redirect("/onboarding");
  return user;
}

/** For Server Actions: throws instead of redirecting so the action can return an error. */
export async function getActionUser() {
  const { userId } = await auth();
  if (!userId) throw new AuthError();
  const user = await ensureUserRow(userId);
  return user;
}
