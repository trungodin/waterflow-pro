'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabaseUntyped as supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/rbac/roles'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const PROFILE_CACHE_KEY = 'waterflow_user_profile_v1'

  // ... fetchUserProfile ...

  const signOut = async () => {
    // 1. Optimistic Logout: Clear local state IMMEDIATELY
    setUser(null)
    setUserProfile(null)
    setLoading(false)
    if (typeof window !== 'undefined') localStorage.removeItem(PROFILE_CACHE_KEY)

    // 2. Call Supabase API in background (Fire-and-forget)
    // We don't await this because we want immediate UI transition
    supabase.auth.signOut().catch(err => console.error('Logout API error:', err))
  }


  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      // 1. Try Cache First
      if (retryCount === 0 && typeof window !== 'undefined') {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.user_id === userId) {
                // Update specific state if needed, but here we return data
                // We'll set state in the useEffect/caller
            }
          } catch (e) {
            localStorage.removeItem(PROFILE_CACHE_KEY)
          }
        }
      }

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
        if (retryCount < 2) {
          await new Promise(r => setTimeout(r, 1000))
          return fetchUserProfile(userId, retryCount + 1)
        }
        return null
      }

      if (!data) return null
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data))
      }
      
      return data as UserProfile
    } catch (error) {
      if (retryCount < 2) {
          await new Promise(r => setTimeout(r, 1000))
          return fetchUserProfile(userId, retryCount + 1)
      }
      return null
    }
  }

  useEffect(() => {
    let mounted = true;

    // Load User and Profile Check
    const initializeAuth = async () => {
        // Try loading profile from cache IMMEDIATELY if we have a session in localstorage (implied by supabase-js)
        if (typeof window !== 'undefined') {
             const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY)
             if (cachedProfile) {
                 try {
                     const parsed = JSON.parse(cachedProfile)
                     // Optimistically set profile to show UI faster
                     setUserProfile(parsed)
                     setLoading(false) 
                 } catch {}
             }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
            setUser(session.user)
            const profile = await fetchUserProfile(session.user.id)
            if (mounted && profile) setUserProfile(profile)
        } else {
             if (typeof window !== 'undefined') localStorage.removeItem(PROFILE_CACHE_KEY)
             setUserProfile(null)
             setUser(null)
        }
        setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'TOKEN_REFRESHED') return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        if (typeof window !== 'undefined') localStorage.removeItem(PROFILE_CACHE_KEY)
        return
      }
      
      setUser(session?.user ?? null)
      if (session?.user) {
         // If we don't have a profile yet (or it's stale), fetch it
         const profile = await fetchUserProfile(session.user.id)
         if (mounted && profile) setUserProfile(profile)
      } else {
         setUserProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
