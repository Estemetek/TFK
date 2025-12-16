// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '../../../lib/supabaseClient'; // adjust path if needed

export async function POST(req: NextRequest) {
  try {
    const { username, password, firstName, lastName, roleID } = await req.json();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('UserAccount')
      .select('userID')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Hash the password
    const passwordHashed = await bcrypt.hash(password, 10);

    // Insert user into database
    const { data, error } = await supabase
        .from('UserAccount')
        .insert({
            username,
            passwordHashed,
            firstName,
            lastName,
            roleID,
            isActive: true
        })
        .select()
        .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      userID: data.userID,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      roleID: data.roleID,
    });

  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
