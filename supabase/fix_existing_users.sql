-- Fix: Disable RLS temporarily and create profiles for existing users
-- Run this in Supabase SQL Editor

-- 1. Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Create profiles for ALL existing auth users (if not exists)
INSERT INTO user_profiles (user_id, email, full_name, role, status, approved_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
  CASE 
    WHEN email IN ('trungodin@gmail.com', 'trung100982@gmail.com') THEN 'admin'
    ELSE 'manager'  -- Give existing users manager role by default
  END,
  'active',
  NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.users.id
);

-- 3. Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verify
SELECT email, role, status FROM user_profiles ORDER BY created_at;
