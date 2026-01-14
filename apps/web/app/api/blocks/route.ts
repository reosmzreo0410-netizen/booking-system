import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all available blocks from admins
  const blocks = await prisma.availableBlock.findMany({
    where: {
      startTime: { gte: new Date() },
    },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      reservations: {
        where: {
          status: "CONFIRMED",
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Transform blocks into 30-minute slots
  const slots = blocks.flatMap((block) => {
    const slots = [];
    const startTime = new Date(block.startTime);
    const endTime = new Date(block.endTime);

    while (startTime < endTime) {
      const slotEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
      if (slotEnd > endTime) break;

      // Find reservations that overlap with this slot
      const slotReservations = block.reservations.filter((r) => {
        const rStart = new Date(r.startTime);
        const rEnd = new Date(r.endTime);
        return rStart < slotEnd && rEnd > startTime;
      });

      slots.push({
        blockId: block.id,
        admin: block.admin,
        startTime: startTime.toISOString(),
        endTime: slotEnd.toISOString(),
        reservations: slotReservations.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          participants: r.participants.map((p) => p.user),
        })),
      });

      startTime.setTime(startTime.getTime() + 30 * 60 * 1000);
    }

    return slots;
  });

  return NextResponse.json(slots);
}
