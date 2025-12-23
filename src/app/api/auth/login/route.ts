// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '../../../lib/supabaseClient'; // adjust path relative to route.ts

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Fetch user from Supabase
    const { data, error } = await supabase
      .from('UserAccount')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Compare the hashed password
    const valid = await bcrypt.compare(password, data.passwordHashed);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return user info (excluding password)
    return NextResponse.json({
      userID: data.userID,
      roleID: data.roleID,
      firstName: data.firstName,
      lastName: data.lastName,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
