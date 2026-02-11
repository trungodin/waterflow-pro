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
  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`[useAuth] Fetching profile for user: ${userId} (Attempt ${retryCount + 1})`)
      
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
        // Retry logic for connection issues
        if (retryCount < 2) {
          console.log(`[useAuth] Retrying fetch... (${retryCount + 1}/2)`)
          await new Promise(r => setTimeout(r, 1000)) // Wait 1s
          return fetchUserProfile(userId, retryCount + 1)
        }
        return null
      }

      if (!data) {
        console.warn('[useAuth] User profile not found for:', userId)
        return null
      }

      console.log('[useAuth] Profile fetched successfully:', data)
      return data as UserProfile
    } catch (error) {
      console.error('[useAuth] Exception in fetchUserProfile:', error)
      if (retryCount < 2) {
          console.log(`[useAuth] Retrying fetch after exception... (${retryCount + 1}/2)`)
          await new Promise(r => setTimeout(r, 1000))
          return fetchUserProfile(userId, retryCount + 1)
      }
      return null
    }
  }

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      console.log('[useAuth] Initial session check:', session?.user?.id)
      
      if (session?.user) {
        setUser(session.user)
        // Only fetch if we don't have a profile yet or it's a different user
        const profile = await fetchUserProfile(session.user.id)
        if (mounted && profile) setUserProfile(profile)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('[useAuth] Auth event:', event, 'User:', session?.user?.id)

      // Ignore token refreshes to prevent redundant fetching
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        return;
      }
      
      // Update logic
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Optimistic check: if we already have the correct profile, verify if we really need to fetch
        // But for safety, we usually trigger a fetch. To avoid flicker, we set loading true only if we don't have a profile.
        if (!userProfile) setLoading(true)

        const profile = await fetchUserProfile(session.user.id)
        
        if (mounted) {
          if (profile) {
             setUserProfile(profile)
          } else {
             // If fetch failed but we have a session, DO NOT wipe existing profile if it belongs to same user
             // This prevents flickering on intermittent errors
             console.warn('[useAuth] Fetch failed, keeping existing state if valid')
          }
        }
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array to run once

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
