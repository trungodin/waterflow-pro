'use server'

import { createClient } from '@supabase/supabase-js'

// No global initialization to prevent crash on missing env var

/**
 * Xóa tài khoản Authen của người dùng (vĩnh viễn)
 * Yêu cầu quyền admin server-side
 */
export async function deleteAuthUserAction(userId: string) {
  try {
    console.log('[Server Action] Deleting Auth User:', userId)

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
       console.error('[Server Action] Missing SUPABASE_SERVICE_ROLE_KEY env var')
       return { success: false, error: 'Server configuration error: Missing Admin Key' }
    }
    
    // Initialize admin client only when needed
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Validate inputs
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    // Call Supabase Admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('[Server Action] Delete failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[Server Action] Unexpected error:', error)
    return { success: false, error: 'Internal server error during deletion' }
  }
}
