import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/debt/[id] — single entry with payment history
export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.debtEntry.findUnique({
    where: { id },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

// PATCH /api/debt/[id] — record a payment (staff + admin)
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { amount, note } = body as { amount: number; note?: string };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Fetch entry to check balance
  const entry = await prisma.debtEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newAmountPaid = Number(entry.amountPaid) + amount;
  const newBalance = Number(entry.totalDebt) - newAmountPaid;

  const [payment, updated] = await prisma.$transaction([
    prisma.payment.create({
      data: { debtId: id, amount, paidBy: user.id, note },
    }),
    prisma.debtEntry.update({
      where: { id },
      data: { amountPaid: newAmountPaid, balance: newBalance < 0 ? 0 : newBalance },
    }),
  ]);

  return NextResponse.json({ payment, entry: updated });
}

// DELETE /api/debt/[id] — admin only
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.debtEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
