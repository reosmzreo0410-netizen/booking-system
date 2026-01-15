"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { SignOutButton } from "./auth-button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-primary-600">
            予約システム
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/"
              className="text-gray-600 transition hover:text-gray-900"
            >
              カレンダー
            </Link>
            {session?.user?.role === "ADMIN" && (
              <>
                <Link
                  href="/reservations"
                  className="text-gray-600 transition hover:text-gray-900"
                >
                  予約一覧
                </Link>
                <Link
                  href="/admin"
                  className="text-gray-600 transition hover:text-gray-900"
                >
                  管理
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {session.user.name}
                </span>
                {session.user.role === "ADMIN" && (
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                    管理者
                  </span>
                )}
              </div>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-gray-600 transition hover:text-gray-900"
            >
              管理者ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
