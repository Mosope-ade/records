import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendAdminPush } from "@/lib/push";
import { StockStatus } from "@/app/generated/prisma/enums";

// GET /api/inventory — active (non-restocked) items
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  const items = await prisma.inventoryItem.findMany({
    where: showAll ? {} : { status: { not: StockStatus.RESTOCKED } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST /api/inventory — report a shortage
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemName, status } = body as { itemName: string; status: StockStatus };

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const validStatuses: StockStatus[] = [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK];
  const itemStatus: StockStatus = validStatuses.includes(status) ? status : StockStatus.LOW_STOCK;

  const item = await prisma.inventoryItem.create({
    data: { itemName, status: itemStatus, reportedBy: user.id },
  });

  if (itemStatus === StockStatus.OUT_OF_STOCK) {
    await sendAdminPush({
      title: "⚠️ Stock Alert",
      body: `${itemName} is now OUT OF STOCK`,
      url: "/inventory",
    });
  }

  return NextResponse.json(item, { status: 201 });
}
