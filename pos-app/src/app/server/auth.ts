import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabaseClient';

export async function login(username: string, password: string) {
  const { data, error } = await supabase
    .from('UserAccount')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, data.passwordHashed);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  return {
    userID: data.userID,
    roleID: data.roleID,
    firstName: data.firstName,
  };
}
