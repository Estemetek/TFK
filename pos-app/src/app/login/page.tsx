'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { login } from '../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Already logged in, redirect to dashboard
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
    setError('');
    setLoading(true);

    try {
      // Use centralized login utility for authentication
      await login(email, password);
      
      console.log('Login successful, redirecting to dashboard...');
      
      // Successful login - hard redirect to clear all state
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F3F3]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F3F3] font-sans p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/TFK.png" alt="TFK Logo" className="h-16 mx-auto mb-4" />
        </div>

        <div className="bg-[#9B9B9B] rounded-3xl shadow-lg p-12">
          <h2 className="text-3xl font-semibold text-white mb-3 text-center">Login</h2>
          <p className="text-white text-sm mb-8 text-center opacity-90">Please enter your credentials below to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-200"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 accent-red-700"
                />
                <span className="text-sm font-medium text-white">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-red-700 hover:text-red-800">
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition mt-6"
            >
              {loading ? 'Signing In...' : 'Login'}
            </button>
          </form>

          {/* removed register page */}
          {/* <p className="text-center text-sm text-white mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold hover:underline">
              Register here
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  );
}
