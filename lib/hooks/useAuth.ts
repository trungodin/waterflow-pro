'use client'

import { useAuthContext } from '@/lib/context/AuthContext'
import { supabaseUntyped as supabase } from '../supabase'

// Re-export hook that consumes the Context
export function useAuth() {
  return useAuthContext()
}

// Keep helper functions as standalone exports
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
