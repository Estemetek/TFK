'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleID, setRoleID] = useState(2); // default to staff/operator
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, firstName, lastName, roleID }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess('User registered successfully!');
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F3F3] font-sans p-4">
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
        onSubmit={handleRegister}
        className="bg-[#A8A8A8] p-8 md:p-10 rounded-[40px] shadow-lg w-full max-w-[550px] flex flex-col items-center"
      >
        <h1 className="text-4xl font-semibold text-white mb-2">Register</h1>
        <p className="text-white text-sm mb-8 opacity-90 text-center">Create a new account to get started</p>

        {error && <p className="text-red-800 bg-red-200 p-2 rounded mb-4 w-full text-center text-sm">{error}</p>}
        {success && <p className="text-green-800 bg-green-200 p-2 rounded mb-4 w-full text-center text-sm">{success}</p>}

        {/* Row for First and Last Name */}
        <div className="flex flex-col md:flex-row gap-4 w-full mb-4">
          <div className="w-full">
            <label className="block text-white text-sm font-medium mb-2 ml-1">First Name</label>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-4 rounded-xl border-none outline-none text-gray-700 bg-white"
              required
            />
          </div>
          <div className="w-full">
            <label className="block text-white text-sm font-medium mb-2 ml-1">Last Name</label>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-4 rounded-xl border-none outline-none text-gray-700 bg-white"
              required
            />
          </div>
        </div>

        {/* Username */}
        <div className="w-full mb-4">
          <label className="block text-white text-sm font-medium mb-2 ml-1">Username</label>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 rounded-xl border-none outline-none text-gray-700 bg-white"
            required
          />
        </div>

        {/* Password */}
        <div className="w-full mb-6 relative">
          <label className="block text-white text-sm font-medium mb-2 ml-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-xl border-none outline-none text-gray-700 bg-white"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 bottom-4 text-gray-400"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Back to Login Link */}
        <div className="w-full mb-8 px-1 text-center">
          <Link href="/" className="text-[#61000D] hover:underline text-sm font-medium">
            Already have an account? Login here
          </Link>
        </div>

        <button
          type="submit"
          className="w-40 bg-[#800000] text-white py-3 rounded-lg font-semibold hover:bg-[#61000D] transition-colors"
        >
          Register
        </button>
      </form>
    </div>
  );
}