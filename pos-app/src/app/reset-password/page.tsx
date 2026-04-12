'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { updatePasswordWithToken } from '../lib/auth';
import { MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle, MdWarning, MdArrowForward } from 'react-icons/md';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Password validation
  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const passwordsMatch = useMemo(() => password === confirmPassword && password.length > 0, [password, confirmPassword]);

  const canSubmit = useMemo(() => {
    return passwordValid && passwordsMatch && !loading;
  }, [passwordValid, passwordsMatch, loading]);

  // Check if user has a valid session with recovery token
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Check if user has the right auth context (recovery token)
        if (!session) {
          // No session, redirect to forgot password
          router.replace('/forgot-password');
          return;
        }

        setCheckingSession(false);
      } catch (err) {
        console.error('Session check error:', err);
        router.replace('/forgot-password');
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
      await updatePasswordWithToken(password);
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again.');
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
            <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">Set a new password</p>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] ring-1 ring-black/5">
            {!success ? (
              <>
                {/* Header */}
                <div className="mb-5 rounded-2xl bg-[#F7F7F7] p-4 text-center ring-1 ring-black/5">
                  <p className="text-lg font-extrabold text-[#1E1E1E]">Reset Password</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#6D6D6D]">
                    Create a new password for your account. Make sure it's strong and unique.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-[#6D6D6D]">New Password</label>
                    <div className="flex items-center gap-2 rounded-2xl bg-[#F7F7F7] px-3 py-2.5 ring-1 ring-black/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B80F24]/20">
                      <MdLock className="h-5 w-5 text-[#6D6D6D]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-[13px] font-semibold text-[#1E1E1E] outline-none placeholder:text-[#B8B8B8] disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#6D6D6D] ring-1 ring-black/5 transition hover:bg-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={loading}
                      >
                        {showPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                      </button>
                    </div>
                    {password && !passwordValid && (
                      <p className="text-[11px] font-semibold text-[#B80F24]">Password must be at least 6 characters</p>
                    )}
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-[#6D6D6D]">Confirm Password</label>
                    <div className="flex items-center gap-2 rounded-2xl bg-[#F7F7F7] px-3 py-2.5 ring-1 ring-black/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B80F24]/20">
                      <MdLock className="h-5 w-5 text-[#6D6D6D]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-[13px] font-semibold text-[#1E1E1E] outline-none placeholder:text-[#B8B8B8] disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#6D6D6D] ring-1 ring-black/5 transition hover:bg-white"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        disabled={loading}
                      >
                        {showConfirmPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-[11px] font-semibold text-[#B80F24]">Passwords do not match</p>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-2xl border border-[#B80F24]/25 bg-[#B80F24]/10 px-4 py-3 text-[12px] font-semibold text-[#B80F24] flex items-start gap-2">
                      <MdWarning className="h-5 w-5 shrink-0 mt-0.5" />
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
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading ? 'Updating…' : 'Update Password'}
                      <MdArrowForward className={cn('h-5 w-5 transition', !canSubmit ? '' : 'group-hover:translate-x-0.5')} />
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#10B981]/10">
                    <MdCheckCircle className="h-8 w-8 text-[#10B981]" />
                  </div>
                  <p className="text-lg font-extrabold text-[#1E1E1E]">Password Reset Successful</p>
                  <p className="mt-2 text-[12px] font-semibold text-[#6D6D6D]">
                    Your password has been updated successfully. You'll be redirected to the login page shortly.
                  </p>

                  {/* Manual redirect button */}
                  <Link
                    href="/login"
                    className="mt-8 rounded-2xl bg-[#B80F24] px-4 py-3 text-center text-[13px] font-extrabold text-white shadow-sm ring-1 ring-[#B80F24]/30 transition hover:brightness-95 inline-block"
                  >
                    Go to Login
                  </Link>
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
