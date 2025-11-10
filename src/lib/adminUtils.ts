import { supabase } from '@/lib/supabase'
import { User } from '@/types'

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'user'
}

/**
 * Fetch all active admin users from the database
 * @returns Array of admin users with their email addresses
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching admin users:', error)
      return []
    }

    return admins || []
  } catch (error) {
    console.error('Unexpected error fetching admin users:', error)
    return []
  }
}

/**
 * Extract email addresses from admin users
 * @param admins Array of admin users
 * @returns Array of email addresses
 */
export function getAdminEmails(admins: AdminUser[]): string[] {
  return admins
    .filter(admin => admin.email && admin.email.trim() !== '')
    .map(admin => admin.email)
}

/**
 * Get user information by user ID
 * @param userId User ID to fetch
 * @returns User object or null if not found
 */
export async function getUserById(userId: string): Promise<AdminUser | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Unexpected error fetching user:', error)
    return null
  }
}