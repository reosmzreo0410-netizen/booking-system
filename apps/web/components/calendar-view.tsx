"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { ReservationModal } from "./reservation-modal";

interface Slot {
  blockId: string;
  admin: {
    id: string;
    name: string | null;
    email: string;
  };
  startTime: string;
  endTime: string;
  reservations: {
    id: string;
    title: string | null;
    participants: { id: string; name: string | null; email: string }[];
  }[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    slot: Slot;
  };
}

export function CalendarView() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSlots = async () => {
    try {
      const response = await fetch("/api/blocks");
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    const calendarEvents: CalendarEvent[] = slots.map((slot) => {
      const hasReservations = slot.reservations.length > 0;
      const totalParticipants = slot.reservations.reduce(
        (sum, r) => sum + r.participants.length,
        0
      );

      let backgroundColor = "#22c55e"; // Available (green)
      let title = "空き";

      if (hasReservations) {
        backgroundColor = "#3b82f6"; // Reserved (blue)
        title = `予約あり (${totalParticipants}人)`;
      }

      return {
        id: `${slot.blockId}-${slot.startTime}`,
        title,
        start: slot.startTime,
        end: slot.endTime,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: { slot },
      };
    });

    setEvents(calendarEvents);
  }, [slots]);

  const handleEventClick = (info: EventClickArg) => {
    const slot = info.event.extendedProps.slot as Slot;
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleDateSelect = (info: DateSelectArg) => {
    // Find slot that matches the selected time
    const matchingSlot = slots.find(
      (slot) =>
        new Date(slot.startTime).getTime() === info.start.getTime() &&
        new Date(slot.endTime).getTime() === info.end.getTime()
    );

    if (matchingSlot) {
      setSelectedSlot(matchingSlot);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  const handleReservationComplete = () => {
    handleModalClose();
    fetchSlots();
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500" />
          <span>空き</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-500" />
          <span>予約あり</span>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        locale="ja"
        slotMinTime="08:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:30:00"
        allDaySlot={false}
        events={events}
        eventClick={handleEventClick}
        selectable={true}
        select={handleDateSelect}
        height="auto"
        buttonText={{
          today: "今日",
          month: "月",
          week: "週",
          day: "日",
        }}
      />

      {selectedSlot && (
        <ReservationModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          slot={selectedSlot}
          onComplete={handleReservationComplete}
        />
      )}
    </div>
  );
}
