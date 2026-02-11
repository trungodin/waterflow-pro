// Quick script to check if user_profiles table exists
import { supabase } from '../lib/supabase'

async function checkTables() {
  try {
    console.log('Checking user_profiles table...')
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error:', error.message)
      console.log('\n🔧 Solution: Run migration in Supabase SQL Editor')
      console.log('File: supabase/migration_user_profiles.sql')
    } else {
      console.log('✅ Table exists!')
      console.log('Records found:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('Sample:', data[0])
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

checkTables()
