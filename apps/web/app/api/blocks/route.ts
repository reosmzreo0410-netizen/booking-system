import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { getBusyTimes } from "@/services/google-calendar";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all available blocks from admins
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const blocks = await prisma.availableBlock.findMany({
    where: {
      startTime: { gte: now },
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

  // Get unique admin IDs
  const adminIds = [...new Set(blocks.map((b) => b.admin.id))];

  // Fetch busy times for each admin
  const adminBusyTimes: Record<string, { start: Date; end: Date }[]> = {};
  for (const adminId of adminIds) {
    try {
      adminBusyTimes[adminId] = await getBusyTimes(adminId, now, thirtyDaysLater);
    } catch (error) {
      console.error(`Failed to get busy times for admin ${adminId}:`, error);
      adminBusyTimes[adminId] = [];
    }
  }

  // Helper function to check if a slot conflicts with busy times
  const isSlotBusy = (
    adminId: string,
    slotStart: Date,
    slotEnd: Date
  ): boolean => {
    const busyTimes = adminBusyTimes[adminId] || [];
    return busyTimes.some((busy) => {
      // Check if there's any overlap
      return slotStart < busy.end && slotEnd > busy.start;
    });
  };

  // Transform blocks into 30-minute slots, filtering out busy slots
  const slots = blocks.flatMap((block) => {
    const slots = [];
    const startTime = new Date(block.startTime);
    const endTime = new Date(block.endTime);

    while (startTime < endTime) {
      const slotEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
      if (slotEnd > endTime) break;

      // Skip this slot if it conflicts with admin's other events
      if (isSlotBusy(block.admin.id, startTime, slotEnd)) {
        startTime.setTime(startTime.getTime() + 30 * 60 * 1000);
        continue;
      }

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
