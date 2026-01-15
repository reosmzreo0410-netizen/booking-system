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
  guestName: z.string().min(1, "名前を入力してください"),
  guestEmail: z.string().email("有効なメールアドレスを入力してください").optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  // Admin only endpoint for viewing reservations
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    where: {
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
  // Public endpoint - no authentication required for guests
  const body = await request.json();
  const parsed = createReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { blockId, startTime, endTime, type, title, agenda, guestName, guestEmail } = parsed.data;

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

  // Create reservation with guest info
  const defaultTitle = type === "GROUP"
    ? `${guestName}のフィードバック会`
    : `${guestName}との1on1`;

  const reservation = await prisma.reservation.create({
    data: {
      blockId,
      guestName,
      guestEmail,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      title: title || defaultTitle,
      agenda,
      participants: {
        create: {
          guestName,
          guestEmail,
        },
      },
    },
    include: {
      participants: true,
    },
  });

  // Create Google Calendar event for admin only
  try {
    const eventTitle = type === "GROUP"
      ? `【フィードバック会】${guestName}`
      : `【1on1】${guestName}`;
    const eventDescription = agenda ? `議題: ${agenda}\n予約者: ${guestName}${guestEmail ? ` (${guestEmail})` : ""}` : `予約者: ${guestName}${guestEmail ? ` (${guestEmail})` : ""}`;

    const eventId = await createCalendarEvent(block.admin.id, {
      summary: eventTitle,
      description: eventDescription,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmails: guestEmail ? [guestEmail] : undefined,
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

  return NextResponse.json(reservation, { status: 201 });
}
