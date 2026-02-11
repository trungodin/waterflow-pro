-- ============================================
-- QUICK FIX: Disable RLS and verify setup
-- Run this to fix "Error fetching user profile"
-- ============================================

-- Step 1: Disable RLS temporarily for testing
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify tables exist
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count
FROM user_profiles
UNION ALL
SELECT 
  'user_activity_logs',
  COUNT(*)
FROM user_activity_logs;

-- Step 3: Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  'Trigger exists' as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'
UNION ALL
SELECT 
  'on_auth_user_created',
  NULL,
  'Trigger NOT found - need to create'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
);

-- Step 4: Show current users
SELECT 
  email,
  role,
  status,
  created_at
FROM user_profiles
ORDER BY created_at DESC;
