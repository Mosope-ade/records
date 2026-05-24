import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendPushNotification } from "@/lib/push";

// PATCH /api/inventory/[id] — update status (e.g. mark as Restocked)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, quantity } = body as {
    status: "LOW_STOCK" | "OUT_OF_STOCK" | "RESTOCKED";
    quantity?: number;
  };

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const updatedData: Record<string, any> = { status };
  if (quantity !== undefined) {
    updatedData.quantity = Number(quantity);
  } else if (status === "RESTOCKED") {
    updatedData.quantity = 0; // Reset shortage quantity on restock
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: updatedData,
  });

  // Notify other users about status updates
  const statusLabel =
    status === "OUT_OF_STOCK" ? "Out of Stock" : status === "LOW_STOCK" ? "Low Stock" : "Restocked";
  await sendPushNotification(
    {
      title: `📦 Stock Updated: ${item.itemName}`,
      body: `Status changed to ${statusLabel}${status !== "RESTOCKED" ? ` (${item.quantity} left)` : ""}.`,
      url: "/inventory",
    },
    user.id
  );

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
