import { auth } from "@/auth";
import { prisma } from "@repo/database";
import { createCalendarEvent, updateCalendarEvent } from "@/services/google-calendar";
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
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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

  // Check if reservation type allows joining (only GROUP/フィードバック会)
  if (reservation.type !== "GROUP") {
    return NextResponse.json(
      { error: "この予約は1on1のため参加できません" },
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

  // Update Google Calendar event with new attendee (admin's calendar)
  if (reservation.googleEventId) {
    try {
      const allParticipantEmails = [
        ...reservation.participants.map((p) => p.user.email),
        session.user.email,
      ].filter(Boolean) as string[];

      await updateCalendarEvent(
        reservation.block.admin.id,
        reservation.googleEventId,
        {
          attendeeEmails: allParticipantEmails,
        }
      );
    } catch (error) {
      console.error("Failed to update admin calendar event:", error);
    }
  }

  // Create Google Calendar event for joining member
  try {
    const memberEventTitle = `【フィードバック会】${reservation.block.admin.name || "管理者"}`;
    const memberEventDescription = reservation.agenda ? `議題: ${reservation.agenda}` : undefined;

    await createCalendarEvent(session.user.id, {
      summary: memberEventTitle,
      description: memberEventDescription,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      attendeeEmails: reservation.block.admin.email ? [reservation.block.admin.email] : undefined,
    });
  } catch (error) {
    console.error("Failed to create member calendar event:", error);
  }

  return NextResponse.json({ success: true });
}
