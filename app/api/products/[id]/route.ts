import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendPushNotification } from "@/lib/push";

// PATCH /api/products/[id] — update product details and prices (admin or price_manager only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "price_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: requires admin or price_manager role" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, priceUnit, unitName, priceBulk, bulkName } = body as {
      name?: string;
      priceUnit?: number;
      unitName?: string;
      priceBulk?: number;
      bulkName?: string;
    };

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        priceUnit: priceUnit !== undefined ? priceUnit : undefined,
        unitName: unitName !== undefined ? unitName.trim() : undefined,
        priceBulk: priceBulk !== undefined ? priceBulk : undefined,
        bulkName: bulkName !== undefined ? bulkName.trim() : undefined,
      },
    });

    // Notify other workers about the price update
    const displayUnit = updated.unitName || "pcs";
    const displayBulk = updated.bulkName || "carton";
    await sendPushNotification(
      {
        title: "⚡ Price List Updated",
        body: `${updated.name}: ₦${Number(updated.priceUnit).toLocaleString()}/${displayUnit} (Bulk: ₦${Number(updated.priceBulk).toLocaleString()}/${displayBulk})`,
        url: "/products",
      },
      user.id
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products/[id] — remove product from price list (Admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const deleted = await prisma.product.delete({ where: { id } });
    
    // Notify other workers
    await sendPushNotification(
      {
        title: "🗑️ Product Deleted",
        body: `${deleted.name} was removed from the price list.`,
        url: "/products",
      },
      user.id
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
