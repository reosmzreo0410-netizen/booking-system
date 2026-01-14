"use client";

import { useEffect, useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { ReservationModal } from "./reservation-modal";

type ReservationType = "ONE_ON_ONE" | "GROUP";

interface Admin {
  id: string;
  name: string | null;
  email: string;
}

interface Slot {
  blockId: string;
  admin: Admin;
  startTime: string;
  endTime: string;
  reservations: {
    id: string;
    type: ReservationType;
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
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Extract unique admins from slots
  const admins = useMemo(() => {
    const adminMap = new Map<string, Admin>();
    slots.forEach((slot) => {
      if (!adminMap.has(slot.admin.id)) {
        adminMap.set(slot.admin.id, slot.admin);
      }
    });
    return Array.from(adminMap.values());
  }, [slots]);

  // Filter slots by selected admin
  const filteredSlots = useMemo(() => {
    if (!selectedAdminId) return slots;
    return slots.filter((slot) => slot.admin.id === selectedAdminId);
  }, [slots, selectedAdminId]);

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
    const calendarEvents: CalendarEvent[] = filteredSlots.map((slot) => {
      const hasReservations = slot.reservations.length > 0;
      const hasOneOnOne = slot.reservations.some((r) => r.type === "ONE_ON_ONE");
      const hasGroup = slot.reservations.some((r) => r.type === "GROUP");
      const totalParticipants = slot.reservations.reduce(
        (sum, r) => sum + r.participants.length,
        0
      );

      let backgroundColor = "#22c55e"; // Available (green)
      let title = "空き";

      if (hasReservations) {
        if (hasOneOnOne && hasGroup) {
          backgroundColor = "#8b5cf6"; // Both types (purple)
          title = `1on1 & FB会 (${totalParticipants}人)`;
        } else if (hasOneOnOne) {
          backgroundColor = "#3b82f6"; // 1on1 (blue)
          title = `1on1 (${totalParticipants}人)`;
        } else {
          backgroundColor = "#f59e0b"; // フィードバック会 (amber)
          title = `FB会 (${totalParticipants}人)`;
        }
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
  }, [filteredSlots]);

  const handleEventClick = (info: EventClickArg) => {
    const slot = info.event.extendedProps.slot as Slot;
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleDateSelect = (info: DateSelectArg) => {
    // Find slot that matches the selected time
    const matchingSlot = filteredSlots.find(
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
      {/* Admin Selector */}
      <div className="mb-4">
        <label htmlFor="admin-select" className="block text-sm font-medium text-gray-700 mb-2">
          予約する管理者を選択
        </label>
        <select
          id="admin-select"
          value={selectedAdminId || ""}
          onChange={(e) => setSelectedAdminId(e.target.value || null)}
          className="block w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">すべての管理者</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name || admin.email}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500" />
          <span>空き</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-500" />
          <span>1on1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-amber-500" />
          <span>フィードバック会</span>
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
        slotMaxTime="24:00:00"
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
