import { NextResponse } from "next/server";
import { getCurrentUser, auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

const VALID_ROLES = ["admin", "price_manager", "staff"] as const;
type UserRole = (typeof VALID_ROLES)[number];

// GET /api/admin/users — list all users (Admin only)
export async function GET(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, email, name, role, banned FROM neon_auth.user ORDER BY name ASC`;

    const data = users.map(u => {
      let role: UserRole;
      if (u.role === "admin") role = "admin";
      else if (u.role === "price_manager") role = "price_manager";
      else role = "staff";
      return { id: u.id, email: u.email, name: u.name, role, banned: !!u.banned };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

// POST /api/admin/users — create a new user (Admin only)
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { email, password, name, role } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    const newUserRole: UserRole = VALID_ROLES.includes(role) ? role : "staff";

    const { error: signupError } = await auth.signUp.email({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
    });

    if (signupError) {
      throw new Error(signupError.message || "Failed to create user account");
    }

    // Update the role assigned by signup default
    await prisma.$executeRaw`
      UPDATE neon_auth.user
      SET role = ${newUserRole}
      WHERE email = ${email.trim().toLowerCase()}
    `;

    return NextResponse.json({ success: true, message: "User account created successfully" }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating user:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}
