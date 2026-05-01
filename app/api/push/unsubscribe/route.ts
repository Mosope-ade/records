import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();


  // Save subscription linked to user
  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id }
  });

  return NextResponse.json({ success: true });
}
