import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { ReservationList } from "./reservation-list";

export default async function ReservationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">予約一覧</h1>
          <p className="text-sm sm:text-base text-gray-600">あなたの予約を確認・キャンセルできます</p>
        </div>
        <ReservationList />
      </main>
    </div>
  );
}
