import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { authConfig } from "../auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

        const otp = await prisma.adminOtp.findUnique({ where: { phone } });
        if (!otp || otp.code !== code || otp.expiresAt < new Date()) return null;

        await prisma.adminOtp.delete({ where: { phone } });
        return { id: phone, name: phone };
      },
    }),
  ],
});
