import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/server";
import { sendPushNotification } from "@/lib/push";

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

    const paymentDecimal = new Prisma.Decimal(amount);
    const newAmountPaid = debt.amountPaid.plus(paymentDecimal);
    const newBalance = debt.totalDebt.minus(newAmountPaid);

    if (newBalance.lt(0)) throw new Error("Payment exceeds remaining balance");

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

  // Notify other workers about the payment update
  await sendPushNotification(
    {
      title: "💵 Payment Recorded",
      body: `${result.customerName} paid ₦${Number(amount).toLocaleString()} (Balance: ₦${Number(result.balance).toLocaleString()}).`,
      url: "/ledger",
    },
    user.id
  );

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
