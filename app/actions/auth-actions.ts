'use server'

import { createClient } from '@supabase/supabase-js'

// Chỉ khởi tạo trên Server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Xóa tài khoản Authen của người dùng (vĩnh viễn)
 * Yêu cầu quyền admin server-side
 */
export async function deleteAuthUserAction(userId: string) {
  try {
    console.log('[Server Action] Deleting Auth User:', userId)
    
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
