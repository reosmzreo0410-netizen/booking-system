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
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    <div className="rounded-lg bg-white p-2 sm:p-4 shadow">
      {/* Admin Selector */}
      <div className="mb-4">
        <label htmlFor="admin-select" className="block text-sm font-medium text-gray-700 mb-2">
          予約する管理者を選択
        </label>
        <select
          id="admin-select"
          value={selectedAdminId || ""}
          onChange={(e) => setSelectedAdminId(e.target.value || null)}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-base"
        >
          <option value="">すべての管理者</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name || admin.email}
            </option>
          ))}
        </select>
      </div>

      {/* Legend - Responsive grid */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs sm:text-sm sm:flex sm:flex-wrap sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-500 flex-shrink-0" />
          <span>空き</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-blue-500 flex-shrink-0" />
          <span>1on1</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-amber-500 flex-shrink-0" />
          <span>FB会</span>
        </div>
      </div>

      {/* Calendar with responsive styling */}
      <div className="calendar-container">
        <style jsx global>{`
          .calendar-container .fc {
            font-size: 12px;
          }
          @media (min-width: 640px) {
            .calendar-container .fc {
              font-size: 14px;
            }
          }
          .calendar-container .fc-toolbar {
            flex-wrap: wrap;
            gap: 8px;
          }
          .calendar-container .fc-toolbar-title {
            font-size: 1rem !important;
          }
          @media (min-width: 640px) {
            .calendar-container .fc-toolbar-title {
              font-size: 1.25rem !important;
            }
          }
          .calendar-container .fc-button {
            padding: 4px 8px !important;
            font-size: 12px !important;
          }
          @media (min-width: 640px) {
            .calendar-container .fc-button {
              padding: 6px 12px !important;
              font-size: 14px !important;
            }
          }
          .calendar-container .fc-event {
            cursor: pointer;
            font-size: 10px;
            padding: 2px 4px;
          }
          @media (min-width: 640px) {
            .calendar-container .fc-event {
              font-size: 12px;
            }
          }
          .calendar-container .fc-timegrid-slot {
            height: 2.5em !important;
          }
          @media (min-width: 640px) {
            .calendar-container .fc-timegrid-slot {
              height: 3em !important;
            }
          }
          .calendar-container .fc-col-header-cell {
            padding: 4px 0 !important;
          }
          .calendar-container .fc-daygrid-day-number {
            padding: 4px !important;
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          headerToolbar={isMobile ? {
            left: "prev,next",
            center: "title",
            right: "timeGridDay,timeGridWeek",
          } : {
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
          contentHeight="auto"
          aspectRatio={isMobile ? 0.8 : 1.5}
          buttonText={{
            today: "今日",
            month: "月",
            week: "週",
            day: "日",
          }}
          titleFormat={{ year: "numeric", month: "short", day: isMobile ? "numeric" : undefined }}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          slotLabelFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: false,
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: false,
          }}
          nowIndicator={true}
          expandRows={true}
        />
      </div>

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
