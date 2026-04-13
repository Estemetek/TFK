import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Handle OAuth and recovery callbacks from Supabase
 * Supabase automatically exchanges recovery tokens detected in URL via detectSessionInUrl
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error cases
    if (error) {
      const message = errorDescription || error;
      return NextResponse.redirect(
        new URL(`/forgot-password?error=${encodeURIComponent(message)}`, request.url)
      );
    }

    // Handle recovery flow
    // Note: Supabase client detects recovery tokens in URL and auto-exchanges them
    // We just need to check if type=recovery and user has a session
    if (type === 'recovery') {
      // Check if user was authenticated via recovery token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User has a recovery session, send them to reset-password
        // where they can set their new password
        return NextResponse.redirect(new URL('/reset-password', request.url));
      }
    }

    // Fallback: if no recovery session or unexpected type, go to login
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
