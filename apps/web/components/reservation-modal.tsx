"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type ReservationType = "ONE_ON_ONE" | "GROUP";

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
    type: ReservationType;
    title: string | null;
    participants: { id: string; name: string | null; email: string }[];
  }[];
}

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: Slot;
  onComplete: () => void;
}

export function ReservationModal({
  isOpen,
  onClose,
  slot,
  onComplete,
}: ReservationModalProps) {
  const { data: session } = useSession();
  const [agenda, setAgenda] = useState("");
  const [reservationType, setReservationType] = useState<ReservationType>("ONE_ON_ONE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 自分が参加していないフィードバック会を探す（1on1は参加不可）
  const joinableReservations = slot.reservations.filter(
    (r) => r.type === "GROUP" && !r.participants.some((p) => p.id === session?.user?.id)
  );

  // 自分が既に参加している予約
  const myReservation = slot.reservations.find((r) =>
    r.participants.some((p) => p.id === session?.user?.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: slot.blockId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: reservationType,
          agenda: agenda || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create reservation");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (reservationId: string) => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/reservations/${reservationId}/join`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join reservation");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">予約</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          <p className="font-medium text-gray-900">
            {formatTime(slot.startTime)} ~ {formatTime(slot.endTime)}
          </p>
          <p className="text-sm text-gray-600">
            担当: {slot.admin.name || slot.admin.email}
          </p>
        </div>

        {/* 既存の予約がある場合 */}
        {slot.reservations.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium text-gray-700">
              この時間の予約
            </h3>
            <div className="space-y-2">
              {slot.reservations.map((r) => {
                const isParticipant = r.participants.some((p) => p.id === session?.user?.id);
                const canJoin = r.type === "GROUP" && !isParticipant;

                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {r.title || "予約"}
                          </p>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              r.type === "GROUP"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.type === "GROUP" ? "フィードバック会" : "1on1"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {r.participants.length}人参加中
                        </p>
                      </div>
                      {isParticipant ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                          参加中
                        </span>
                      ) : canJoin ? (
                        <button
                          onClick={() => handleJoin(r.id)}
                          disabled={isSubmitting}
                          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition hover:bg-blue-600 disabled:opacity-50"
                        >
                          参加する
                        </button>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                          参加不可
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.participants.map((p) => (
                        <span
                          key={p.id}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {p.name || p.email}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 自分が既に参加している場合は新規作成を表示しない */}
        {myReservation ? (
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-green-700">この時間枠に既に参加しています</p>
          </div>
        ) : (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-gray-500">
                  または新規予約を作成
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2 block font-medium text-gray-700">
                  予約タイプ
                </label>
                <div className="flex gap-3">
                  <label
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition ${
                      reservationType === "ONE_ON_ONE"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="ONE_ON_ONE"
                      checked={reservationType === "ONE_ON_ONE"}
                      onChange={() => setReservationType("ONE_ON_ONE")}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-medium text-gray-900">1on1</div>
                      <div className="text-xs text-gray-500">自分のみ</div>
                    </div>
                  </label>
                  <label
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition ${
                      reservationType === "GROUP"
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="GROUP"
                      checked={reservationType === "GROUP"}
                      onChange={() => setReservationType("GROUP")}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-medium text-gray-900">フィードバック会</div>
                      <div className="text-xs text-gray-500">他メンバーも参加可</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="agenda"
                  className="mb-2 block font-medium text-gray-700"
                >
                  議題・目的（任意）
                </label>
                <textarea
                  id="agenda"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="相談したい内容を入力してください"
                  className="w-full rounded-lg border border-gray-300 p-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? "予約中..." : "新規予約を作成"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
