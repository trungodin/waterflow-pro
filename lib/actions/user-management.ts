'use server'

import { createClient } from '@/lib/supabase-server'
import { UserRole, UserStatus, UserProfile } from '@/lib/rbac/roles'
import { ADMIN_EMAILS } from '@/lib/rbac/roles'
import { deleteAuthUserAction } from '@/app/actions/auth-actions'

// Get user profile by user_id
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

// Create user profile (called during signup)
export async function createUserProfile(data: {
  user_id: string
  email: string
  full_name?: string
  requested_role: UserRole
  phone?: string
  department?: string
}) {
  try {
    const supabase = await createClient()
    // Check if user is admin by email
    const isAdmin = ADMIN_EMAILS.includes(data.email.toLowerCase())
    
    const profileData: {
      user_id: string
      email: string
      full_name?: string
      role: string
      status: string
      requested_role: UserRole
      phone?: string
      department?: string
      approved_at: string | null
    } = {
      user_id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: isAdmin ? 'admin' : 'pending',
      status: isAdmin ? 'active' : 'pending',
      requested_role: data.requested_role,
      phone: data.phone,
      department: data.department,
      approved_at: isAdmin ? new Date().toISOString() : null
    }

    // @ts-ignore - Supabase type generation issue
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      throw new Error('Failed to create user profile')
    }

    return { success: true, profile }
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return { success: false, error: 'Failed to create user profile' }
  }
}

// Get all users (admin only)
export async function getAllUsers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return { success: false, error: 'Failed to fetch users' }
    }

    return { success: true, users: data as UserProfile[] }
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return { success: false, error: 'Failed to fetch users' }
  }
}

// Get pending users (admin only)
export async function getPendingUsers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending users:', error)
      return { success: false, error: 'Failed to fetch pending users' }
    }

    return { success: true, users: data as UserProfile[] }
  } catch (error) {
    console.error('Error in getPendingUsers:', error)
    return { success: false, error: 'Failed to fetch pending users' }
  }
}

// Approve user (admin only)
export async function approveUser(userId: string, role: UserRole, adminId: string) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        status: 'active',
        role: role,
        approved_by: adminId,
        approved_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error approving user:', error)
      return { success: false, error: 'Failed to approve user' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error in approveUser:', error)
    return { success: false, error: 'Failed to approve user' }
  }
}

// Reject user (admin only)
export async function rejectUser(userId: string, notes?: string) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        status: 'rejected',
        notes: notes
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error rejecting user:', error)
      return { success: false, error: 'Failed to reject user' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error in rejectUser:', error)
    return { success: false, error: 'Failed to reject user' }
  }
}

// Update user role (admin only)
export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      return { success: false, error: 'Failed to update user role' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error in updateUserRole:', error)
    return { success: false, error: 'Failed to update user role' }
  }
}

// Suspend user (admin only)
export async function suspendUser(userId: string, notes?: string) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        status: 'suspended',
        notes: notes
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error suspending user:', error)
      return { success: false, error: 'Failed to suspend user' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error in suspendUser:', error)
    return { success: false, error: 'Failed to suspend user' }
  }
}

// Reactivate user (admin only)
export async function reactivateUser(userId: string) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ status: 'active' })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error reactivating user:', error)
      return { success: false, error: 'Failed to reactivate user' }
    }

    return { success: true, user: data }
  } catch (error) {
    console.error('Error in reactivateUser:', error)
    return { success: false, error: 'Failed to reactivate user' }
  }
}

// Delete user (admin only - soft delete by setting status)
export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient()
    console.log('[deleteUser] Starting delete for userId:', userId)

    // 1. Delete App Data (Profile)
    // @ts-ignore
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting user profile:', error)
      return { success: false, error: 'Failed to delete user data' }
    }

    // 2. Delete Auth Account (via Server Action)
    const authRes = await deleteAuthUserAction(userId)
    
    if (!authRes.success) {
       console.warn('[deleteUser] Profile deleted but Auth User failed:', authRes.error)
       // Still return success because profile (main app view) is gone
       return { success: true, warning: 'User data deleted but login account removal failed (check server keys)' }
    }

    console.log('[deleteUser] Completely deleted user (Profile + Auth)')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteUser:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}

// Log user activity
export async function logActivity(data: {
  user_id: string
  action: string
  resource?: string
  metadata?: any
  ip_address?: string
}) {
  try {
    const supabase = await createClient()
    // @ts-ignore - Supabase type generation issue
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: data.user_id,
        action: data.action,
        resource: data.resource,
        metadata: data.metadata,
        ip_address: data.ip_address
      })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}
