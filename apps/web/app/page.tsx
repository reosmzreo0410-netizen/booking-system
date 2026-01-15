import { Header } from "@/components/header";
import { CalendarView } from "@/components/calendar-view";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">予約カレンダー</h1>
          <p className="text-gray-600">
            空いている時間をクリックして予約を作成できます
          </p>
        </div>
        <CalendarView />
      </main>
    </div>
  );
}
