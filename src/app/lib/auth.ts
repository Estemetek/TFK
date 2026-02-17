import { supabase } from './supabaseClient';

/**
 * Unified login function that handles authentication
 * @param email User's email address
 * @param password User's password
 * @returns Promise with user data on success
 */
export async function login(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(error.message || 'Invalid email or password');
    }

    if (!data.session) {
      throw new Error('Failed to establish session');
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Unified logout function that properly clears all session data
 * and redirects to the login page
 */
export async function logout() {
  try {
    // Sign out from Supabase - this clears auth state
    await supabase.auth.signOut();
    
    // Clear all local storage (including any cached user data)
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Force hard redirect to clear all React state and ensure clean login
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }
}
