import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-button";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            予約システム
          </h1>
          <p className="text-gray-600">
            Googleカレンダーと連携した予約管理
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">
              システムの特徴
            </h2>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Googleカレンダーとの自動同期</li>
              <li>• 1対1予約とグループ予約に対応</li>
              <li>• リアルタイムの空き状況確認</li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <SignInButton />
          </div>

          <p className="text-center text-xs text-gray-500">
            ログインすることで、Googleカレンダーへのアクセスを許可します
          </p>
        </div>
      </div>
    </div>
  );
}
