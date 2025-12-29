//login page
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError(error.message);
    return;
  }

  router.push('/dashboard');
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F3F3] font-sans">
      <div className="mb-6">
        <Image src="/TFK.png" alt="Logo" width={150} height={80} priority />
      </div>

      <form onSubmit={handleLogin} className="bg-[#A8A8A8] p-10 rounded-[40px] shadow-lg w-full max-w-md flex flex-col items-center">
        <h1 className="text-4xl font-semibold text-white mb-2">Login</h1>
        <p className="text-white text-sm mb-8 opacity-90">Please enter your email to continue</p>

        {error && <p className="text-red-800 bg-red-200 p-2 rounded mb-4 w-full text-center text-sm">{error}</p>}

        <div className="w-full mb-6">
          <label className="block text-white text-sm font-medium mb-2 ml-1">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#61000D] outline-none text-gray-700 bg-white"
            required
          />
        </div>

        <div className="w-full mb-6 relative">
          <label className="block text-white text-sm font-medium mb-2 ml-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#61000D] outline-none text-gray-700 bg-white"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-4 text-gray-400">{showPassword ? '🙈' : '👁️'}</button>
        </div>

        <div className="flex justify-between w-full mb-8 px-1">
          <a href="/register" className="text-[#61000D] hover:underline text-sm font-medium">Don't have an account?</a>
          <a href="#" className="text-[#61000D] hover:underline text-sm font-medium">Forgot Password?</a>
        </div>

        <button type="submit" className="w-32 bg-[#800000] text-white py-3 rounded-lg font-semibold hover:bg-[#61000D]">Login</button>
      </form>
    </div>
  );
}