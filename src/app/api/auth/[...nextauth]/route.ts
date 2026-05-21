import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || '',
      clientSecret: process.env.GOOGLE_SECRET || '',
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  secret: process.env.JWT_SECRET || 'fallback-jwt-secret-key',
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async signIn({ user }: { user: any }) {
      const allowedEmail = process.env.ALLOWED_EMAIL;
      
      // If ALLOWED_EMAIL is set, enforce it
      if (allowedEmail) {
        if (user.email === allowedEmail) {
          return true; // Login allowed
        }
        console.warn(`[AUTH] Rejected login attempt from unauthorized email: ${user.email}`);
        return false; // Access Denied
      }

      // If ALLOWED_EMAIL is not configured, deny everything by default as a fail-safe
      console.warn('[AUTH] ALLOWED_EMAIL environment variable is not set. Rejecting all logins for security.');
      return false;
    },
    async jwt({ token, user }: { token: any, user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Custom login page
    error: '/login', // Redirect back to login on error (e.g. access denied)
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
