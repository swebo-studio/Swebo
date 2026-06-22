import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin-login";
    return Response.redirect(url);
  }

  if (pathname === "/admin-login" && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/admin-login"],
};
