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

  // Cache key for user profile
  const PROFILE_CACHE_KEY = 'waterflow_user_profile_v1'

  // Fetch user profile from user_profiles table
  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      // 1. Try to load from Cache first (Instant UI)
      if (retryCount === 0 && typeof window !== 'undefined') {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.user_id === userId) {
              console.log('[useAuth] Loaded profile from CACHE (Instant UI)')
              // Update state immediately with cached data
              setUserProfile(parsed)
              setLoading(false) // Stop loading spinner immediately
            }
          } catch (e) {
            console.warn('[useAuth] Invalid cache, clearing')
            localStorage.removeItem(PROFILE_CACHE_KEY)
          }
        }
      }

      console.log(`[useAuth] Fetching profile from SERVER for user: ${userId} (Attempt ${retryCount + 1})`)
      
      // 2. Fetch from Server (Background Update)
      // Increase timeout to 15s for slower production networks
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      )

      const fetchPromise = supabase
        .from('user_profiles')
        .select('user_id, role, status, email, full_name')
        .eq('user_id', userId)
        .maybeSingle()

      const result: any = await Promise.race([fetchPromise, timeoutPromise])
      const { data, error } = result

      if (error) {
        console.error('[useAuth] Error fetching user profile:', error)
        if (retryCount < 2) {
          await new Promise(r => setTimeout(r, 1000))
          return fetchUserProfile(userId, retryCount + 1)
        }
        return null
      }

      if (!data) {
        console.warn('[useAuth] User profile not found on server')
        return null
      }

      console.log('[useAuth] Server profile fetched successfully')
      
      // 3. Save to Cache for next time
      if (typeof window !== 'undefined') {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data))
      }
      
      return data as UserProfile
    } catch (error) {
      console.error('[useAuth] Exception in fetchUserProfile:', error)
      if (retryCount < 2) {
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
      
      if (session?.user) {
        setUser(session.user)
        const profile = await fetchUserProfile(session.user.id)
        if (mounted && profile) setUserProfile(profile)
      } else {
         // Clear cache on logout
         if (typeof window !== 'undefined') localStorage.removeItem(PROFILE_CACHE_KEY)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'TOKEN_REFRESHED') return;

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        if (typeof window !== 'undefined') localStorage.removeItem(PROFILE_CACHE_KEY)
        return;
      }
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Optimistic loading logic handled inside fetchUserProfile (via cache)
        const profile = await fetchUserProfile(session.user.id)
        
        if (mounted) {
          if (profile) {
             setUserProfile(profile)
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
