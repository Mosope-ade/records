import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StockStatus } from "@/app/generated/prisma/enums";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/inventory/[id] — update status (mark restocked, etc.)
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = (await req.json()) as { status: StockStatus };

  const validStatuses = Object.values(StockStatus);
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(item);
}

// DELETE /api/inventory/[id] — admin only
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
