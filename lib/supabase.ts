// Supabase Client (Browser)
// File: lib/supabase.ts

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('⚠️ Supabase credentials not found.')
}

// Create typed Supabase client for Browser
// This automatically handles cookies for auth
export const supabase = createBrowserClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// Untyped client for operations with incomplete type definitions
export const supabaseUntyped = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
