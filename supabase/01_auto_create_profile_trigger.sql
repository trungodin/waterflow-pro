-- ============================================
-- RBAC System - Simplified Approach
-- Auto-create user profile on signup
-- ============================================

-- Step 1: Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  user_status TEXT;
BEGIN
  -- Check if user is admin by email
  IF NEW.email IN ('trungodin@gmail.com', 'trung100982@gmail.com') THEN
    user_role := 'admin';
    user_status := 'active';
  ELSE
    user_role := 'pending';
    user_status := 'pending';
  END IF;

  -- Auto-create profile
  INSERT INTO public.user_profiles (
    user_id, 
    email, 
    full_name, 
    role, 
    status,
    requested_role,
    approved_at,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    user_status,
    COALESCE(NEW.raw_user_meta_data->>'requested_role', 'reader'),
    CASE WHEN user_role = 'admin' THEN NOW() ELSE NULL END,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Backfill existing users (create profiles for users without one)
INSERT INTO public.user_profiles (user_id, email, full_name, role, status, approved_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  CASE 
    WHEN u.email IN ('trungodin@gmail.com', 'trung100982@gmail.com') THEN 'admin'
    ELSE 'manager'  -- Give existing users manager role by default
  END,
  'active',
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (email) DO NOTHING;

-- Verify
SELECT 
  'Trigger created successfully' as status,
  COUNT(*) as total_users
FROM user_profiles;
