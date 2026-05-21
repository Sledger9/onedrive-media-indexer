import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db, ensureDbInitialized } from '@/lib/db';

const providers: any[] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      console.log('[AUTH] Authorize called for username:', credentials?.username);
      
      if (!credentials?.username || !credentials?.password) {
        console.log('[AUTH] Missing credentials');
        throw new Error('Please enter your username and password.');
      }

      try {
        console.log('[AUTH] Awaiting ensureDbInitialized');
        await ensureDbInitialized();
        console.log('[AUTH] DB Initialized. Querying user...');

        const result = await db.execute({
          sql: 'SELECT * FROM users WHERE username = ?',
          args: [credentials.username],
        });

        const user = result.rows[0];
        console.log('[AUTH] User query result:', user ? 'FOUND' : 'NOT FOUND');

        if (!user) {
          console.log('[AUTH] User not found in database');
          throw new Error('Invalid username or password.');
        }

        // Brute-force protection check
        if (user.locked_until && new Date(user.locked_until as string) > new Date()) {
          console.log('[AUTH] Account is locked until:', user.locked_until);
          throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
        }

        console.log('[AUTH] Comparing passwords...');
        const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash as string);
        console.log('[AUTH] Password match:', passwordMatch);

        if (!passwordMatch) {
          const failedAttempts = Number(user.failed_attempts || 0) + 1;
          console.log('[AUTH] Incrementing failed attempts to:', failedAttempts);
          
          if (failedAttempts >= 5) {
            // Lock out for 15 minutes
            const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            await db.execute({
              sql: 'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE username = ?',
              args: [failedAttempts, lockoutTime, credentials.username],
            });
            throw new Error('Too many failed attempts. Account locked for 15 minutes.');
          } else {
            await db.execute({
              sql: 'UPDATE users SET failed_attempts = ? WHERE username = ?',
              args: [failedAttempts, credentials.username],
            });
            throw new Error('Invalid username or password.');
          }
        }

        // Success: Reset failed attempts
        console.log('[AUTH] Login successful, resetting failed attempts');
        await db.execute({
          sql: 'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE username = ?',
          args: [credentials.username],
        });

        console.log('[AUTH] Returning user object');
        return { id: user.username as string, name: user.username as string, email: user.username as string };
      } catch (err: any) {
        console.error('[AUTH] Authorize Error:', err.message);
        throw err;
      }
    }
  })
];

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
  }));
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(GithubProvider({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }));
}

export const authOptions = {
  providers,
  secret: process.env.JWT_SECRET || 'fallback-jwt-secret-key',
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async signIn({ user, account }: { user: any, account: any }) {
      if (account?.provider === 'credentials') {
        return true; // Credentials provider handles its own validation
      }

      const allowedEmail = process.env.ALLOWED_EMAIL;
      
      // If ALLOWED_EMAIL is set, enforce it for Google/GitHub
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
