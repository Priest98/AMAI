/**
 * ⚠️ WIRE THIS UP TO YOUR REAL AUTH SYSTEM ⚠️
 *
 * Every OAuth route in this system calls getCurrentUserId() to know which
 * of YOUR users a connected account belongs to. This file is a stand-in —
 * replace the body with whatever you're actually using:
 *
 *  - NextAuth / Auth.js:
 *      import { auth } from "@/auth";
 *      const session = await auth();
 *      return session?.user?.id ?? null;
 *
 *  - Clerk:
 *      import { auth } from "@clerk/nextjs/server";
 *      const { userId } = await auth();
 *      return userId;
 *
 *  - Supabase Auth:
 *      import { createServerClient } from "@supabase/ssr";
 *      const supabase = createServerClient(...);
 *      const { data: { user } } = await supabase.auth.getUser();
 *      return user?.id ?? null;
 *
 *  - Custom session cookie / JWT:
 *      decode the cookie, verify it, return the user id.
 */
export async function getCurrentUserId(): Promise<string | null> {
  throw new Error(
    "[oauth/current-user] getCurrentUserId() is not implemented. " +
      "Wire this up to your auth system before using the OAuth routes."
  );
}
