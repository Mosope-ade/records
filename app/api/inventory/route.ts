import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendAdminPush } from "@/lib/push";

// GET /api/inventory — list shortage items
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Fetch reporter names
  const reporterIds = [...new Set(items.map(i => i.reportedBy))];
  const reporters = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name FROM neon_auth.user WHERE id IN (${reporterIds.map(id => `'${id}'`).join(',')})`
  );
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
  const { itemName, status } = body as { itemName: string; status: "LOW_STOCK" | "OUT_OF_STOCK" };

  if (!itemName) {
    return NextResponse.json({ error: "itemName is required" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      itemName,
      status: status || "LOW_STOCK",
      reportedBy: user.id,
    },
  });

  if (status === "OUT_OF_STOCK") {
    await sendAdminPush({
      title: "🚨 Out of Stock!",
      body: `${itemName} is completely finished.`,
      url: "/inventory",
    });
  }

  return NextResponse.json(item, { status: 201 });
}
