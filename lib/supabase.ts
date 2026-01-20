// Supabase Client
// File: lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please add them to .env.local')
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/*
📖 USAGE:

// In any component or page:
import { supabase } from '@/lib/supabase'

// Fetch data
const { data, error } = await supabase
  .from('customers')
  .select('*')

// Insert data
const { data, error } = await supabase
  .from('customers')
  .insert({ name: 'John Doe', email: 'john@example.com' })

// Update data
const { data, error } = await supabase
  .from('customers')
  .update({ name: 'Jane Doe' })
  .eq('id', customerId)

// Delete data
const { data, error } = await supabase
  .from('customers')
  .delete()
  .eq('id', customerId)

// Authentication
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

const { error } = await supabase.auth.signOut()
*/
