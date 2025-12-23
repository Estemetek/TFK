// src/app/api/auth/login/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 401 });

    return NextResponse.json({ user: data.user, session: data.session });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}