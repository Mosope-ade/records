import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendAdminPush } from "@/lib/push";

// GET /api/debt — list all debt entries (with optional name search & date filter)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const date = searchParams.get("date"); // ISO date string, e.g. 2025-07-01

  const where: Record<string, unknown> = {};

  if (name) {
    where.customerName = { contains: name, mode: "insensitive" };
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const entries = await prisma.debtEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });

  return NextResponse.json(entries);
}

// POST /api/debt — create a new debt entry
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerName, totalDebt, notes } = body as {
    customerName: string;
    totalDebt: number;
    notes?: string;
  };

  if (!customerName || !totalDebt) {
    return NextResponse.json({ error: "customerName and totalDebt are required" }, { status: 400 });
  }

  const entry = await prisma.debtEntry.create({
    data: {
      customerName,
      totalDebt,
      amountPaid: 0,
      balance: totalDebt,
      notes,
      createdBy: user.id,
    },
  });

  // Notify admins
  await sendAdminPush({
    title: "💳 New Debt Entry",
    body: `${customerName} owes ₦${Number(totalDebt).toLocaleString()}`,
    url: "/ledger",
  });

  return NextResponse.json(entry, { status: 201 });
}
