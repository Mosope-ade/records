import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

/**
 * Helper to get the current user in server components/actions/routes.
 * Returns the user object or null if not authenticated.
 */
export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  // Add role from metadata if present, default to staff
  return {
    ...session.user,
    role: (session.user as any).metadata?.role || "staff",
  };
}
