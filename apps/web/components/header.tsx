"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SignOutButton } from "./auth-button";

export function Header() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="text-lg md:text-xl font-bold text-primary-600">
            予約システム
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
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

        {/* Desktop User Info */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          aria-label="メニュー"
        >
          {isMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-3 space-y-3">
            <Link
              href="/"
              className="text-gray-600 py-2 transition hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              カレンダー
            </Link>
            {session?.user?.role === "ADMIN" && (
              <>
                <Link
                  href="/reservations"
                  className="text-gray-600 py-2 transition hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  予約一覧
                </Link>
                <Link
                  href="/admin"
                  className="text-gray-600 py-2 transition hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  管理
                </Link>
              </>
            )}

            <div className="border-t border-gray-200 pt-3">
              {session?.user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {session.user.image && (
                      <img
                        src={session.user.image}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <div>
                      <span className="text-sm text-gray-700 block">
                        {session.user.name}
                      </span>
                      {session.user.role === "ADMIN" && (
                        <span className="rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                          管理者
                        </span>
                      )}
                    </div>
                  </div>
                  <SignOutButton />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block text-center py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  管理者ログイン
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
