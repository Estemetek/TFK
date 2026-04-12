import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Handle OAuth and recovery callbacks from Supabase
 * Exchanges the recovery code for a session and redirects to password reset page
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
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

    // Handle recovery token
    if (code && type === 'recovery') {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL(`/forgot-password?error=${encodeURIComponent('Invalid or expired recovery link')}`, request.url)
        );
      }

      // Successfully exchanged code for session, redirect to password reset
      return NextResponse.redirect(new URL('/reset-password', request.url));
    }

    // Fallback: if no code or unexpected type, go back to login
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
