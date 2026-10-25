import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

/** A code gets this many tries; then the admin has to ask for a new one. */
const MAX_OTP_ATTEMPTS = 5;

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/admin-login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = (credentials?.phone as string)?.replace(/\D/g, "").replace(/^972/, "0");
        const code = credentials?.code as string;
        if (!phone || !code) return null;

        const allowed = await prisma.adminPhone.findUnique({ where: { phone } });
        if (!allowed && phone !== process.env.ADMIN_PHONE?.replace(/\D/g, "").replace(/^972/, "0")) {
          return null;
        }

        // Spend a try before comparing, atomically — otherwise many guesses
        // sent at once would all be checked before any of them counted.
        const { count } = await prisma.adminOtp.updateMany({
          where: { phone, attempts: { lt: MAX_OTP_ATTEMPTS }, expiresAt: { gt: new Date() } },
          data: { attempts: { increment: 1 } },
        });
        if (count === 0) return null;
        const otp = await prisma.adminOtp.findUnique({ where: { phone } });
        if (!otp || otp.code !== code) return null;

        await prisma.adminOtp.delete({ where: { phone } });
        return { id: phone, name: phone };
      },
    }),
  ],
});
