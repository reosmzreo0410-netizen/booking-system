import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { updateCalendarEvent } from "@/services/google-calendar";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
        include: {
          user: {
            select: {
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

  if (reservation.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Reservation is not available" },
      { status: 400 }
    );
  }

  // Check if already a participant
  const isAlreadyParticipant = reservation.participants.some(
    (p) => p.user.email === session.user.email
  );

  if (isAlreadyParticipant) {
    return NextResponse.json(
      { error: "Already a participant" },
      { status: 400 }
    );
  }

  // Add as participant
  await prisma.reservationParticipant.create({
    data: {
      reservationId: id,
      userId: session.user.id,
    },
  });

  // Update Google Calendar event with new attendee
  if (reservation.googleEventId) {
    try {
      const allParticipantEmails = [
        ...reservation.participants.map((p) => p.user.email),
        session.user.email,
      ].filter(Boolean) as string[];

      await updateCalendarEvent(
        reservation.block.adminId,
        reservation.googleEventId,
        {
          attendeeEmails: allParticipantEmails,
        }
      );
    } catch (error) {
      console.error("Failed to update calendar event:", error);
    }
  }

  return NextResponse.json({ success: true });
}
