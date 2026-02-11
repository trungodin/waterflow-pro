-- Ensure all authenticated users have profiles
-- This migration creates profiles for any users that don't have one yet

-- Insert missing profiles for authenticated users
INSERT INTO user_profiles (user_id, email, role, status, approved_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,  -- Default to admin for existing users
  'active' as status,
  NOW() as approved_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Log the operation
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  RAISE NOTICE 'Total user profiles: %', profile_count;
END $$;
