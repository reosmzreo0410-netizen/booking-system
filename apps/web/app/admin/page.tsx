import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <p className="text-gray-600">
            予約可能枠の同期と予約状況の管理ができます
          </p>
        </div>
        <AdminDashboard />
      </main>
    </div>
  );
}
