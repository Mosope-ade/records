import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

// PATCH /api/debt/[id] — record a payment
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { amount, note } = body as { amount: number; note?: string };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Positive payment amount is required" }, { status: 400 });
  }

  // Use a transaction to ensure atomic update
  const result = await prisma.$transaction(async (tx) => {
    const debt = await tx.debtEntry.findUnique({ where: { id } });
    if (!debt) throw new Error("Debt entry not found");

    const newAmountPaid = Number(debt.amountPaid) + amount;
    const newBalance = Number(debt.totalDebt) - newAmountPaid;

    if (newBalance < 0) throw new Error("Payment exceeds remaining balance");

    // 1. Create payment record
    await tx.payment.create({
      data: {
        debtId: id,
        amount,
        note,
        paidBy: user.id,
      },
    });

    // 2. Update debt entry
    return await tx.debtEntry.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
      },
    });
  });

  return NextResponse.json(result);
}

// DELETE /api/debt/[id] — delete an entry (Admin only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Role-based access control
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.debtEntry.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
