import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "admin" | "staff";
}

/**
 * Returns the current authenticated user from the Neon Auth session token,
 * or null if the request is unauthenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sql = neon(process.env.DATABASE_URL!);
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;
  if (!token) return null;

  const rows = await sql`
    SELECT
      u.id,
      u.email,
      u.name,
      u.image,
      COALESCE(u.metadata->>'role', 'staff') AS role
    FROM neon_auth.session s
    JOIN neon_auth.user u ON u.id = s."userId"
    WHERE s.token = ${token}
      AND s."expiresAt" > NOW()
    LIMIT 1
  `;

  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    email: r.email as string,
    name: r.name as string | null,
    image: r.image as string | null,
    role: (r.role as string) === "admin" ? "admin" : "staff",
  };
}
