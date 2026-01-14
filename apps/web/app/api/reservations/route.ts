import { auth } from "@/auth";
import { prisma } from "@repo/database";
import {
  createCalendarEvent,
} from "@/services/google-calendar";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createReservationSchema = z.object({
  blockId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.enum(["ONE_ON_ONE", "GROUP"]).default("ONE_ON_ONE"),
  title: z.string().optional(),
  agenda: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // "my" | "all"

  const whereClause =
    filter === "all" && session.user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { creatorId: session.user.id },
            { participants: { some: { userId: session.user.id } } },
          ],
        };

  const reservations = await prisma.reservation.findMany({
    where: {
      ...whereClause,
      status: "CONFIRMED",
    },
    include: {
      block: {
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(reservations);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { blockId, startTime, endTime, type, title, agenda } = parsed.data;

  // Get block and admin info
  const block = await prisma.availableBlock.findUnique({
    where: { id: blockId },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });

  // Create reservation
  const defaultTitle = type === "GROUP"
    ? `${user?.name || "メンバー"}のフィードバック会`
    : `${user?.name || "メンバー"}との1on1`;

  const reservation = await prisma.reservation.create({
    data: {
      blockId,
      creatorId: session.user.id,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      title: title || defaultTitle,
      agenda,
      participants: {
        create: {
          userId: session.user.id,
        },
      },
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
  });

  // Create Google Calendar event for admin
  try {
    const eventTitle = type === "GROUP"
      ? `【フィードバック会】${user?.name || "メンバー"}`
      : `【1on1】${user?.name || "メンバー"}`;
    const eventDescription = agenda ? `議題: ${agenda}` : undefined;

    const eventId = await createCalendarEvent(block.admin.id, {
      summary: eventTitle,
      description: eventDescription,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmails: user?.email ? [user.email] : undefined,
    });

    if (eventId) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { googleEventId: eventId },
      });
    }
  } catch (error) {
    console.error("Failed to create admin calendar event:", error);
  }

  // Create Google Calendar event for member
  try {
    const memberEventTitle = type === "GROUP"
      ? `【フィードバック会】${block.admin.name || "管理者"}`
      : `【1on1】${block.admin.name || "管理者"}`;
    const memberEventDescription = agenda ? `議題: ${agenda}` : undefined;

    await createCalendarEvent(session.user.id, {
      summary: memberEventTitle,
      description: memberEventDescription,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmails: block.admin.email ? [block.admin.email] : undefined,
    });
  } catch (error) {
    console.error("Failed to create member calendar event:", error);
  }

  return NextResponse.json(reservation, { status: 201 });
}
