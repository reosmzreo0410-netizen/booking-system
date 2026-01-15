"use client";

import { useState } from "react";

type ReservationType = "ONE_ON_ONE" | "GROUP";

interface Participant {
  id: string;
  name: string | null;
  email: string;
  guestName?: string | null;
  guestEmail?: string | null;
}

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
    participants: Participant[];
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
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [agenda, setAgenda] = useState("");
  const [reservationType, setReservationType] = useState<ReservationType>("ONE_ON_ONE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showJoinForm, setShowJoinForm] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");

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

  // フィードバック会のみ参加可能
  const joinableReservations = slot.reservations.filter(
    (r) => r.type === "GROUP"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      setError("名前を入力してください");
      return;
    }

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
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim() || undefined,
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
    if (!joinName.trim()) {
      setError("名前を入力してください");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/reservations/${reservationId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: joinName.trim(),
          guestEmail: joinEmail.trim() || undefined,
        }),
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

  const getParticipantName = (p: Participant) => {
    return p.guestName || p.name || p.guestEmail || p.email || "参加者";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-lg bg-white p-4 sm:p-6 shadow-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
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

        {/* 既存のフィードバック会がある場合は参加オプションを表示 */}
        {joinableReservations.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium text-gray-700">
              参加可能なフィードバック会
            </h3>
            <div className="space-y-2">
              {joinableReservations.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {r.title || "フィードバック会"}
                        </p>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          フィードバック会
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {r.participants.length}人参加中
                      </p>
                    </div>
                    {showJoinForm === r.id ? (
                      <button
                        onClick={() => setShowJoinForm(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        キャンセル
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowJoinForm(r.id);
                          setJoinName("");
                          setJoinEmail("");
                        }}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition hover:bg-blue-600"
                      >
                        参加する
                      </button>
                    )}
                  </div>

                  {/* 参加フォーム */}
                  {showJoinForm === r.id && (
                    <div className="mt-3 border-t pt-3">
                      <div className="mb-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          お名前 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          placeholder="山田 太郎"
                          className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          メールアドレス（任意）
                        </label>
                        <input
                          type="email"
                          value={joinEmail}
                          onChange={(e) => setJoinEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <button
                        onClick={() => handleJoin(r.id)}
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm text-white transition hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isSubmitting ? "参加中..." : "参加を確定する"}
                      </button>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.participants.map((p, idx) => (
                      <span
                        key={p.id || idx}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {getParticipantName(p)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 新規予約フォーム */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-sm text-gray-500">
              {slot.reservations.length > 0 ? "または新規予約を作成" : "予約情報を入力"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block font-medium text-gray-700">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block font-medium text-gray-700">
              メールアドレス（任意）
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              入力するとGoogleカレンダーの招待が届きます
            </p>
          </div>

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
              {isSubmitting ? "予約中..." : "予約する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
