'use client';

import React, { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { Film } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'AccessDenied':
        return 'Access denied. You are not on the allowlist.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#020205] overflow-hidden">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl plex-glow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl plex-glow pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10 mx-4 border-white/5 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-950/50 mb-4 ring-1 ring-white/20">
            <Film className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            OneDrive <span className="text-purple-400">Media</span>
          </h1>
          <p className="text-sm text-slate-400 text-center font-medium">
            Sign in to access your personal movie library
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 animate-shake">
            <p className="text-sm text-red-200 font-medium">{getErrorMessage(error)}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full py-3.5 px-4 bg-white text-black rounded-xl font-bold hover:bg-slate-100 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="w-full py-3.5 px-4 bg-[#24292e] text-white rounded-xl font-bold hover:bg-[#2f363d] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 ring-1 ring-white/10"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020205]" />}>
      <LoginContent />
    </Suspense>
  );
}
