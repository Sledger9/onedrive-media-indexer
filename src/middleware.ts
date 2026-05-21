import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-jwt-secret-key',
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/((?!api/auth/login|login|_next/static|_next/image|favicon.ico).*)',
  ],
};
