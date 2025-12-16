'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // import router

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter(); // initialize router

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      console.log('Logged in user:', data);

      // redirect to dashboard upon successful login
      router.push('/dashboard');
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F3F3] font-sans">
      {/* Logo */}
      <div className="mb-6">
        <Image 
          src="/TFK.png" 
          alt="Tainan Fried Chicken" 
          width={150}
          height={80} 
          className="h-auto w-auto"
          priority
        />
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-[#A8A8A8] p-10 rounded-[40px] shadow-lg w-full max-w-[500px] flex flex-col items-center"
      >
        <h1 className="text-4xl font-semibold text-white mb-2">Login</h1>
        <p className="text-white text-sm mb-8 opacity-90">
          Please enter your credentials below to continue
        </p>

        {error && (
          <p className="text-red-800 bg-red-200 p-2 rounded mb-4 w-full text-center text-sm">
            {error}
          </p>
        )}

        {/* Username */}
        <div className="w-full mb-6">
          <label className="block text-white text-sm font-medium mb-2 ml-1">
            Username
          </label>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-maroon-700 outline-none text-gray-700 bg-white"
            required
          />
        </div>

        {/* Password */}
        <div className="w-full mb-6 relative">
          <label className="block text-white text-sm font-medium mb-2 ml-1">
            Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-maroon-700 outline-none text-gray-700 bg-white"
            required
          />
          {/* Toggle Eye Icon */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 bottom-4 text-gray-400"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Remember / Forgot */}
        <div className="flex justify-between items-center w-full mb-8 px-1">
          <label className="flex items-center text-[#61000D] cursor-pointer font-medium text-sm">
            <input type="checkbox" className="mr-2 h-4 w-4 accent-[#800000]" />
            Remember me
          </label>
          <a href="#" className="text-[#61000D] hover:underline text-sm font-medium">
            Forgot Password?
          </a>
        </div>

        {/* Registration link */}
        <div className="flex justify-between items-center w-full mb-8 px-1">
          <a href="/register" className="text-[#61000D] hover:underline text-sm font-medium">
            Don't have an account yet?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-32 bg-[#800000] text-white py-3 rounded-lg font-semibold hover:bg-[#61000D] transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
}
