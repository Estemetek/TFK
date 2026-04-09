// src/app/api/admin/reset-password/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key required for password updates
);

export async function POST(req: Request) {
  try {
    const { userId, newPassword } = await req.json();

    // Validate inputs
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Missing userId or newPassword' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Update user password in Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to reset password' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Password reset successfully',
      success: true,
    });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json(
      { error: 'Server error during password reset' },
      { status: 500 }
    );
  }
}
