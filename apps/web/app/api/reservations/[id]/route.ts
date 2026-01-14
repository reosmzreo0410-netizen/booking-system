import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { deleteCalendarEvent } from "@/services/google-calendar";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
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
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  return NextResponse.json(reservation);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      block: {
        select: {
          adminId: true,
        },
      },
      participants: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  // Check if user can cancel this reservation
  const isCreator = reservation.creatorId === session.user.id;
  const isAdmin = reservation.block.adminId === session.user.id;
  const isParticipant = reservation.participants.some(
    (p) => p.userId === session.user.id
  );

  if (!isCreator && !isAdmin && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cancel the reservation
  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  // Delete Google Calendar event
  if (reservation.googleEventId) {
    try {
      await deleteCalendarEvent(
        reservation.block.adminId,
        reservation.googleEventId
      );
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
    }
  }

  return NextResponse.json({ success: true });
}
