'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { sendPasswordResetEmail } from '../lib/auth';
import { MdEmail, MdArrowBack, MdCheckCircle, MdWarning } from 'react-icons/md';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 0 && !loading && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [email, loading]);

  // Check if user is already logged in and has permission to reset password
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in, check their role
          const { data: profile } = await supabase
            .from('UsersAccount')
            .select('Role(roleName)')
            .eq('userID', session.user.id)
            .single();

          const role = (profile?.Role as any)?.roleName;

          // Only Superadmin and Manager can use forgot password
          if (role === 'Manager' || role === 'Superadmin') {
            setIsAuthorized(true);
            setCheckingSession(false);
          } else {
            // Staff cannot use forgot password
            setIsAuthorized(false);
            setCheckingSession(false);
          }
        } else {
          // Not logged in, allow access to forgot password
          setIsAuthorized(true);
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setIsAuthorized(true);
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setSubmitted(true);
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email. Please try again.');
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
          <div className="mt-6 h-11 w-full rounded-xl bg-black/5" />
          <p className="mt-4 text-sm font-semibold text-[#6D6D6D]">Loading…</p>
        </div>
      </div>
    );
  }

  // If not authorized (Staff), show access denied
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F3F3F3] font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
            <div className="mb-5 rounded-2xl bg-[#F7F7F7] p-4 text-center ring-1 ring-black/5">
              <p className="text-lg font-extrabold text-[#1E1E1E]">Access Denied</p>
              <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">
                Staff accounts cannot reset their own password. Please contact your manager for assistance.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full rounded-2xl bg-[#B80F24] px-4 py-3 text-center text-[13px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95 inline-block"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3] font-sans">
      {/* Subtle background accents */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#B80F24]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
              <img src="/TFK.png" alt="TFK Logo" className="h-14 w-14" />
            </div>
            <p className="text-sm font-extrabold text-[#1E1E1E]">Taiwan Fried Kitchen</p>
            <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">Reset your password</p>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
            {!submitted ? (
              <>
                {/* Header */}
                <div className="mb-5 rounded-2xl bg-[#F7F7F7] p-4 text-center ring-1 ring-black/5">
                  <p className="text-lg font-extrabold text-[#1E1E1E]">Forgot Password?</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-[#6D6D6D]">Email Address</label>
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

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-2xl border border-[#B80F24]/25 bg-[#B80F24]/10 px-4 py-3 text-[12px] font-semibold text-[#B80F24] flex items-start gap-2">
                      <MdWarning className="h-5 w-5 shrink-0 mt-0.5 min-w-5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
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
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>

                {/* Back to Login Link */}
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#B80F24] hover:underline"
                  >
                    <MdArrowBack className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#10B981]/10">
                    <MdCheckCircle className="h-8 w-8 text-[#10B981]" />
                  </div>
                  <p className="text-lg font-extrabold text-[#1E1E1E]">Check Your Email</p>
                  <p className="mt-2 text-[12px] font-semibold text-[#6D6D6D]">
                    We've sent a password reset link to <span className="font-bold text-[#1E1E1E]">{email || 'your email'}</span>
                  </p>
                  <p className="mt-4 text-[11px] font-semibold text-[#6D6D6D]">
                    The link will expire in 1 hour. If you don't see the email, check your spam folder.
                  </p>

                  {/* Action Buttons */}
                  <div className="mt-8 w-full space-y-2">
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setEmail('');
                        setError('');
                      }}
                      className="w-full rounded-2xl bg-[#B80F24] px-4 py-3 text-[13px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95"
                    >
                      Send Another Link
                    </button>
                    <Link
                      href="/login"
                      className="block rounded-2xl bg-[#F7F7F7] px-4 py-3 text-center text-[13px] font-extrabold text-[#1E1E1E] shadow-sm ring-1 ring-black/5 transition hover:bg-black/3"
                    >
                      Back to Login
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] font-semibold text-[#6D6D6D]">
            © {new Date().getFullYear()} Taiwan Fried Kitchen. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
