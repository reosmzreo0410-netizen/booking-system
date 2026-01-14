import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { userId, role } = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return NextResponse.json(user);
}
