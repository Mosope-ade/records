import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

const VALID_ROLES = ["admin", "price_manager", "staff"] as const;

// PATCH /api/admin/users/[id] — enable/disable access or change role (Admin only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id: userId } = await params;
  const { action, role } = await req.json();

  if (userId === currentUser.id && action !== "set_role") {
    return NextResponse.json({ error: "Cannot disable or enable your own account" }, { status: 400 });
  }

  try {
    if (action === "disable") {
      await prisma.$executeRaw`
        UPDATE neon_auth.user
        SET banned = true, "banReason" = 'Disabled by admin'
        WHERE id = ${userId}::uuid
      `;
      return NextResponse.json({ success: true, message: "User access disabled" });
    } else if (action === "enable") {
      await prisma.$executeRaw`
        UPDATE neon_auth.user
        SET banned = false, "banReason" = NULL, "banExpires" = NULL
        WHERE id = ${userId}::uuid
      `;
      return NextResponse.json({ success: true, message: "User access enabled" });
    } else if (action === "set_role") {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      if (userId === currentUser.id && role !== "admin") {
        return NextResponse.json({ error: "Cannot downgrade your own admin account" }, { status: 400 });
      }
      await prisma.$executeRaw`
        UPDATE neon_auth.user
        SET role = ${role}
        WHERE id = ${userId}::uuid
      `;
      return NextResponse.json({ success: true, message: `Role updated to ${role}` });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error updating user:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}
