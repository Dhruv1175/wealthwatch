// src/app/api/goals/[id]/route.ts
// DELETE /api/goals/[id]  — delete a goal
// PATCH  /api/goals/[id]  — update goal fields

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.financialGoal.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const goal = await prisma.financialGoal.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: {
      ...(body.name        ? { name: body.name.trim() }          : {}),
      ...(body.targetAmount? { targetAmount: parseFloat(body.targetAmount) } : {}),
      ...(body.targetDate  ? { targetDate: new Date(body.targetDate) }  : {}),
      ...(body.notes !== undefined ? { notes: body.notes }       : {}),
    },
  });
  return NextResponse.json(goal);
}