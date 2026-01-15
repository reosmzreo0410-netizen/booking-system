"use client";

import { useState, useEffect } from "react";

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
  startTime: string;
  endTime: string;
  guestName: string | null;
  participants: Participant[];
}

export function AdminDashboard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    removed: number;
  } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const response = await fetch("/api/reservations?filter=all");
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

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/sync", { method: "POST" });
      if (response.ok) {
        const result = await response.json();
        setSyncResult(result);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getParticipantName = (p: Participant) => {
    return p.guestName || p.user?.name || p.guestEmail || p.user?.email || "参加者";
  };

  const getParticipantNames = (reservation: Reservation) => {
    if (reservation.participants.length === 0 && reservation.guestName) {
      return reservation.guestName;
    }
    return reservation.participants.map(getParticipantName).join(", ") || "-";
  };

  const upcomingReservations = reservations
    .filter((r) => new Date(r.startTime) >= new Date())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Sync Section */}
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow">
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-800">
          Googleカレンダー同期
        </h2>
        <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
          Googleカレンダーで「[予約可]」を含むイベントを予約可能枠として取り込みます。
        </p>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4 mb-3 sm:mb-4">
          <h3 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">設定方法</h3>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-1">
            <li>Googleカレンダーを開く</li>
            <li>予約可能な時間帯にイベントを作成</li>
            <li>タイトルに「[予約可]」を含める</li>
            <li>このページで「同期を実行」をクリック</li>
          </ol>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full sm:w-auto rounded-lg bg-primary-600 px-4 py-2.5 sm:py-2 text-sm sm:text-base text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {isSyncing ? "同期中..." : "同期を実行"}
        </button>

        {syncResult && (
          <div className="mt-3 sm:mt-4 rounded-lg bg-green-50 p-3 text-xs sm:text-sm text-green-700">
            同期完了: {syncResult.synced}件の予約枠を取得、
            {syncResult.removed}件を削除しました
          </div>
        )}
      </div>

      {/* Reservations Overview */}
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow">
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-800">
          今後の予約一覧
        </h2>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : upcomingReservations.length === 0 ? (
          <p className="text-gray-500">予約がありません</p>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {upcomingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateTime(reservation.startTime)}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        reservation.type === "GROUP"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {reservation.type === "GROUP" ? "グループ" : "1対1"}
                    </span>
                  </div>
                  {reservation.title && (
                    <p className="text-sm text-gray-700 mb-1">
                      {reservation.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    参加者: {getParticipantNames(reservation)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="pb-2 pr-4">日時</th>
                    <th className="pb-2 pr-4">タイプ</th>
                    <th className="pb-2 pr-4">タイトル</th>
                    <th className="pb-2">参加者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcomingReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(reservation.startTime)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            reservation.type === "GROUP"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {reservation.type === "GROUP" ? "グループ" : "1対1"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{reservation.title || "-"}</td>
                      <td className="py-3">
                        {getParticipantNames(reservation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
