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

    // CHECK IF ACCOUNT IS ACTIVE
    const { data: userAccount, error: accountError } = await supabase
      .from('UsersAccount')
      .select('isActive')
      .eq('email', email.trim())
      .single();

    if (accountError || !userAccount) {
      // Sign out if account not found
      await supabase.auth.signOut();
      throw new Error('User account not found');
    }

    if (!userAccount.isActive) {
      // Sign out if account is deactivated
      await supabase.auth.signOut();
      throw new Error('This account has been deactivated. Contact your administrator.');
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

/**
 * Send password reset email to user
 * @param email User's email address
 * @returns Promise with success status
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const trimmedEmail = email.trim();

    // 1. Check if user exists and get their isActive status and roleID
    const { data: userAccount, error: accountError } = await supabase
      .from('UsersAccount')
      .select('userID, isActive, roleID')
      .eq('email', trimmedEmail)
      .single();

    if (accountError || !userAccount) {
      throw new Error('No account found with this email address. Please check the email or contact your administrator.');
    }

    // 2. Check if account is active
    if (!userAccount.isActive) {
      throw new Error('This account has been disabled by an administrator. Please contact your manager to regain access.');
    }

    // 3. Check if user role is Manager (roleID 1) or Superadmin (roleID 3)
    // Staff is roleID 2 and cannot reset password
    if (userAccount.roleID !== 1 && userAccount.roleID !== 3) {
      throw new Error('Staff accounts cannot reset their own password. Please contact your manager for assistance.');
    }

    // 4. If user exists, active, and authorized, send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/reset-password`,
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to send password reset email');
    }

    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    throw error;
  }
}

/**
 * Update password with recovery token (after user clicks reset link)
 * @param newPassword New password
 * @returns Promise with success status
 */
export async function updatePasswordWithToken(newPassword: string) {
  try {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update password');
    }

    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    throw error;
  }
}
