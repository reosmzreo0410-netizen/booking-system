import { prisma } from "@repo/database";
import { updateCalendarEvent } from "@/services/google-calendar";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const joinSchema = z.object({
  guestName: z.string().min(1, "名前を入力してください"),
  guestEmail: z.string().email("有効なメールアドレスを入力してください").optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = joinSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { guestName, guestEmail } = parsed.data;

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
      participants: true,
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

  // Add as guest participant
  await prisma.reservationParticipant.create({
    data: {
      reservationId: id,
      guestName,
      guestEmail,
    },
  });

  // Update Google Calendar event with new attendee (admin's calendar)
  if (reservation.googleEventId && guestEmail) {
    try {
      const allParticipantEmails = [
        ...reservation.participants.map((p) => p.guestEmail || p.user?.email).filter(Boolean),
        guestEmail,
      ] as string[];

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

  return NextResponse.json({ success: true });
}
