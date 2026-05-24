import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendPushNotification } from "@/lib/push";

// GET /api/products — list all products
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error listing products:", error);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

// POST /api/products — create a new product (admin or price_manager only)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "price_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: requires admin or price_manager role" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, priceUnit, unitName, priceBulk, bulkName } = body as {
      name: string;
      priceUnit: number;
      unitName?: string;
      priceBulk: number;
      bulkName?: string;
    };

    if (!name || priceUnit === undefined || priceBulk === undefined) {
      return NextResponse.json(
        { error: "Product name, unit price, and bulk price are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        priceUnit,
        unitName: unitName?.trim() || "pcs",
        priceBulk,
        bulkName: bulkName?.trim() || "carton",
        createdBy: user.id,
      },
    });

    // Notify other workers about the price list addition
    await sendPushNotification(
      {
        title: "🏷️ New Price Added",
        body: `${name}: ₦${Number(priceUnit).toLocaleString()}/${unitName || "pcs"} (Bulk: ₦${Number(priceBulk).toLocaleString()}/${bulkName || "carton"})`,
        url: "/products",
      },
      user.id // Exclude the current user
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A product with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
