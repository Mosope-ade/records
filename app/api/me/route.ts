import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

/** GET /api/me — returns current user info */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: (user as any).name ?? null,
    image: (user as any).image ?? null,
    role: user.role,
  });
}
