import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StockStatus } from "@/app/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/server";
import { sendPushNotification } from "@/lib/push";

// GET /api/inventory — list shortage items
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  // Filter out restocked items unless showAll is true
  const where = showAll ? {} : { NOT: { status: StockStatus.RESTOCKED } };

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Fetch reporter names
  const reporterIds = [...new Set(items.map(i => i.reportedBy))];
  if (reporterIds.length === 0) return NextResponse.json([]);

  const reporters = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM neon_auth.user WHERE id = ANY(${reporterIds})`;
  const reporterMap = Object.fromEntries(reporters.map(r => [r.id, r.name]));

  const data = items.map(i => ({
    ...i,
    reporterName: reporterMap[i.reportedBy] || "Unknown",
  }));

  return NextResponse.json(data);
}

// POST /api/inventory — report a shortage
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { itemName, status, quantity } = body as {
    itemName: string;
    status: "LOW_STOCK" | "OUT_OF_STOCK";
    quantity?: number;
  };

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const stockQuantity = quantity !== undefined ? Number(quantity) : 0;

  const item = await prisma.inventoryItem.create({
    data: {
      itemName: itemName.trim(),
      status: status || "LOW_STOCK",
      quantity: stockQuantity,
      reportedBy: user.id,
    },
  });

  // Notify other workers about the stock alert
  const statusLabel = status === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock";
  await sendPushNotification(
    {
      title: status === "OUT_OF_STOCK" ? "🚨 Out of Stock Alert" : "⚠️ Low Stock Alert",
      body: `${itemName} reported as ${statusLabel} (${stockQuantity} left).`,
      url: "/inventory",
    },
    user.id
  );

  return NextResponse.json(item, { status: 201 });
}

