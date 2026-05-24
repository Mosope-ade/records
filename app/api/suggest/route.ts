import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

// GET /api/suggest — autocomplete lookup for customer names or products
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "products" or "customers"
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  try {
    if (type === "products") {
      const products = await prisma.product.findMany({
        where: {
          name: { contains: q, mode: "insensitive" },
        },
        take: 10,
        select: {
          id: true,
          name: true,
          priceUnit: true,
          unitName: true,
          priceBulk: true,
          bulkName: true,
        },
      });
      return NextResponse.json(products);
    } else if (type === "customers") {
      const entries = await prisma.debtEntry.findMany({
        where: {
          customerName: { contains: q, mode: "insensitive" },
        },
        take: 10,
        select: {
          customerName: true,
        },
        distinct: ["customerName"],
      });
      return NextResponse.json(entries.map(e => e.customerName));
    } else {
      return NextResponse.json({ error: "Invalid suggest type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
