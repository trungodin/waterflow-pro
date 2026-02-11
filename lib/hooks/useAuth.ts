// Authentication Hooks
// File: lib/hooks/useAuth.ts

'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabaseUntyped as supabase } from '../supabase'
import { UserProfile } from '../rbac/roles'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from user_profiles table
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId)
      
      // Create a timeout promise (5 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      )

      // Perform the fetch query with simplified selection
      const fetchPromise = supabase
        .from('user_profiles')
        .select('user_id, role, status, email, full_name') // Select strict fields only
        .eq('user_id', userId)
        .maybeSingle()

      // Race against timeout
      const result: any = await Promise.race([fetchPromise, timeoutPromise])
      const { data, error } = result

      if (error) {
        console.error('[useAuth] Error fetching user profile:', error)
        return null
      }

      if (!data) {
        console.warn('[useAuth] User profile not found (empty result) for:', userId)
        return null
      }

      console.log('[useAuth] Profile fetched successfully:', data)
      return data as UserProfile
    } catch (error) {
      console.error('[useAuth] Exception in fetchUserProfile:', error)
      return null
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[useAuth] Initial session:', session?.user?.id)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setUserProfile(profile)
        console.log('[useAuth] Initial profile set:', profile)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth state changed:', event, 'User:', session?.user?.id)
      // Set loading true during transition to prevent flash
      setLoading(true)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setUserProfile(profile)
        console.log('[useAuth] Profile updated after auth change:', profile)
      } else {
        setUserProfile(null)
        console.log('[useAuth] User logged out, profile cleared')
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, userProfile, loading }
}

// Sign up
export async function signUp(email: string, password: string, fullName?: string, metadata?: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...metadata, // Include additional metadata (requested_role, phone, department)
      },
    },
  })

  if (error) throw error
  return data
}

// Sign in
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Sign in with Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}

// Reset password
export async function resetPassword(email: string) {
  const { data, error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
  return data
}

// Update password
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
  return data
}
