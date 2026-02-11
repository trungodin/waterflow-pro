-- TEMPORARY FIX: Disable RLS completely for testing
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_activity_logs');
