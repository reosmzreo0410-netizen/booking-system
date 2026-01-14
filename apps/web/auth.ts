import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { prisma } from "@repo/database";
import { authConfig } from "./auth.config";

const nextAuth = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      // Upsert user in database
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          image: user.image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        },
        create: {
          email: user.email,
          name: user.name,
          image: user.image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          tokenExpiry: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
  },
});

export const handlers: typeof nextAuth.handlers = nextAuth.handlers;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
export const auth: () => Promise<Session | null> = nextAuth.auth;
