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
  const isDevBypass = process.env.NODE_ENV === "development" &&
    (process.env.NEON_AUTH_BASE_URL?.includes("placeholder") || process.env.NEON_AUTH_BASE_URL?.includes("localhost:3000"));

  if (isDevBypass) {
    return {
      id: 'mock-admin-id',
      email: 'admin@shopsync.com',
      name: 'Mock Admin User',
      emailVerified: true,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'admin',
    };
  }

  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) return null;

    let role = (session.user as any).role || (session.user as any).metadata?.role || "staff";
    if (role === "user") role = "staff";
    if (!["admin", "price_manager", "staff"].includes(role)) role = "staff";

    return {
      ...session.user,
      role,
    };
  } catch (error) {
    console.error("Failed to fetch session from Neon Auth:", error);
    return null;
  }
}
