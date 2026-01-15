"use client";

import { useEffect, useState } from "react";

interface Participant {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Reservation {
  id: string;
  type: "ONE_ON_ONE" | "GROUP";
  title: string | null;
  agenda: string | null;
  startTime: string;
  endTime: string;
  status: string;
  guestName: string | null;
  guestEmail: string | null;
  block: {
    admin: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  participants: Participant[];
}

export function ReservationList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const response = await fetch("/api/reservations");
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("この予約をキャンセルしますか？")) return;

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchReservations();
      }
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getParticipantName = (p: Participant) => {
    return p.guestName || p.user?.name || p.guestEmail || p.user?.email || "参加者";
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <p className="text-gray-500">予約がありません</p>
      </div>
    );
  }

  const upcomingReservations = reservations.filter(
    (r) => new Date(r.startTime) >= new Date()
  );
  const pastReservations = reservations.filter(
    (r) => new Date(r.startTime) < new Date()
  );

  return (
    <div className="space-y-6">
      {upcomingReservations.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            今後の予約
          </h2>
          <div className="space-y-4">
            {upcomingReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-lg bg-white p-4 shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          reservation.type === "GROUP"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {reservation.type === "GROUP" ? "グループ" : "1対1"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {reservation.participants.length || (reservation.guestName ? 1 : 0)}人参加
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900">
                      {reservation.title || "予約"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {formatDateTime(reservation.startTime)} ~{" "}
                      {new Date(reservation.endTime).toLocaleTimeString(
                        "ja-JP",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      担当:{" "}
                      {reservation.block.admin.name ||
                        reservation.block.admin.email}
                    </p>

                    {reservation.agenda && (
                      <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600">
                        {reservation.agenda}
                      </p>
                    )}

                    <div className="mt-3">
                      <p className="text-xs text-gray-500">参加者:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reservation.participants.map((p, idx) => (
                          <span
                            key={p.user?.id || p.id || idx}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {getParticipantName(p)}
                          </span>
                        ))}
                        {reservation.participants.length === 0 && reservation.guestName && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {reservation.guestName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancel(reservation.id)}
                    className="w-full sm:w-auto rounded-lg border border-red-200 px-3 py-2 sm:py-1.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastReservations.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-400">
            過去の予約
          </h2>
          <div className="space-y-4 opacity-60">
            {pastReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-lg bg-white p-4 shadow"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      reservation.type === "GROUP"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {reservation.type === "GROUP" ? "グループ" : "1対1"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(reservation.startTime)}
                  </span>
                </div>
                <h3 className="mt-2 font-medium text-gray-700">
                  {reservation.title || "予約"}
                </h3>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
