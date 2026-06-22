import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/admin-login",
  },
  session: { strategy: "jwt" as const },
  providers: [],
} satisfies NextAuthConfig;
