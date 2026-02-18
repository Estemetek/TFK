'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { login } from '../lib/auth';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowForward } from 'react-icons/md';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = password.trim();
    return e.length > 0 && p.length > 0 && !loading;
  }, [email, password, loading]);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace('/dashboard');
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);

    try {
      // If you want "Remember me" to truly persist, configure this in your auth helper:
      // supabase.auth.setSession / persistSession in supabase client setup.
      // Here we keep your existing flow.
      await login(email, password);

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F3F3F3] p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-black/5" />
          <div className="mt-5 h-6 w-40 rounded bg-black/5" />
          <div className="mt-3 h-10 w-full rounded-xl bg-black/5" />
          <div className="mt-3 h-10 w-full rounded-xl bg-black/5" />
          <div className="mt-6 h-11 w-full rounded-xl bg-black/5" />
          <p className="mt-4 text-sm font-semibold text-[#6D6D6D]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3] font-sans">
      {/* subtle background accents */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#B80F24]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* brand */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              <img src="/TFK.png" alt="TFK Logo" className="h-14 w-14" />
            </div>
            <p className="text-sm font-extrabold text-[#1E1E1E]">Taiwan Fried Kitchen</p>
            <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">Sign in to continue</p>
          </div>

          {/* card */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
            {/* header strip */}
          <div className="mb-5 rounded-2xl bg-[#F7F7F7] p-4 text-center ring-1 ring-black/5">
            <p className="text-lg font-extrabold text-[#1E1E1E]">Login</p>
            <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">
              Please enter your credentials below to continue.
            </p>
          </div>


            <form onSubmit={handleLogin} className="space-y-4">
              {/* email */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-[#6D6D6D]">Email</label>
                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F7F7] px-3 py-2.5 ring-1 ring-black/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B80F24]/20">
                  <MdEmail className="h-5 w-5 text-[#6D6D6D]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="w-full bg-transparent text-[13px] font-semibold text-[#1E1E1E] outline-none placeholder:text-[#B8B8B8] disabled:opacity-70"
                  />
                </div>
              </div>

              {/* password */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-[#6D6D6D]">Password</label>
                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F7F7] px-3 py-2.5 ring-1 ring-black/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B80F24]/20">
                  <MdLock className="h-5 w-5 text-[#6D6D6D]" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                    className="w-full bg-transparent text-[13px] font-semibold text-[#1E1E1E] outline-none placeholder:text-[#B8B8B8] disabled:opacity-70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#6D6D6D] ring-1 ring-black/5 transition hover:bg-white"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPw ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* options */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 accent-[#B80F24]"
                  />
                  <span className="text-[12px] font-semibold text-[#1E1E1E]">Remember me</span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[12px] font-extrabold text-[#B80F24] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* error */}
              {error && (
                <div className="rounded-2xl border border-[#B80F24]/25 bg-[#B80F24]/10 px-4 py-3 text-[12px] font-semibold text-[#B80F24]">
                  {error}
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'group w-full rounded-2xl px-4 py-3 text-[13px] font-extrabold shadow-sm ring-1 transition',
                  !canSubmit
                    ? 'bg-[#E7E7E7] text-[#9B9B9B] ring-black/5'
                    : 'bg-[#B80F24] text-white ring-[#B80F24]/30 hover:brightness-95'
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {loading ? 'Signing In…' : 'Login'}
                  <MdArrowForward className={cn('h-5 w-5 transition', !canSubmit ? '' : 'group-hover:translate-x-0.5')} />
                </span>
              </button>

              {/* small helper */}
              <p className="text-center text-[11px] font-semibold text-[#6D6D6D]">
                Use your assigned account based on your role (Admin or Staff).
              </p>
            </form>
          </div>

          {/* footer */}
          <p className="mt-6 text-center text-[11px] font-semibold text-[#6D6D6D]">
           © {new Date().getFullYear()} Taiwan Fried Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}