import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

// PATCH /api/inventory/[id] — update status (e.g. mark as Restocked)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: "LOW_STOCK" | "OUT_OF_STOCK" | "RESTOCKED" };

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(item);
}

// DELETE /api/inventory/[id] — remove item (Admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.inventoryItem.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
